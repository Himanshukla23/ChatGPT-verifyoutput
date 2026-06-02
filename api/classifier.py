from typing import Dict, Any, List, TypedDict
from api.mcp import clients
from api.utils import logger, safe_parse_json

class GroundingAnalysisResult(TypedDict):
    taskType: str
    risk: str  # "high" | "low"
    assumptions: List[str]
    missingContext: List[str]

SYSTEM_PROMPT = """
You are an AI Grounding Layer classification engine.
Your job is to analyze the user's input prompt and determine:
1. The task category (taskType). Common values: "decision-making", "planning", "strategy", "research", "analysis", "content-generation", "greetings-and-summaries".
2. The risk rating (risk). 
   - Classify as "high" if the task is complex, strategic, decision-heavy, requires validation, OR if the prompt requests to draft, generate, or write professional/business communication, reports, emails, or templates that rely on implicit placeholders, personal details, or organizational context (e.g. writing performance emails to managers, quarterly team updates, annual summaries, project status briefs). These need grounding review to avoid generic placeholders (e.g. [Manager's Name], [Year]).
   - Classify as "low" ONLY if the query is a basic greeting ("hi", "how are you"), a quick summary of a provided text block, a simple language translation, or a direct factual question (e.g. "what is the capital of France").
3. Extracted assumptions (assumptions): A list of implicit or explicit premises, placeholders, or structural assumptions made in the prompt that need verification (e.g., assumptions about achievements to highlight, positive feedback expectation, specific year references). For low-risk queries, return an empty array [].
4. Missing context (missingContext): A list of specific personal, metrics, or factual context gaps or clarifying questions that would be needed to draft the document or answer the query with precise accuracy (e.g., "What is the manager's name?", "What are your key achievements for the year?", "What is the specific reporting period?"). For low-risk queries, return an empty array [].

Return the result ONLY as a valid JSON object matching this exact structure:
{
  "taskType": "string",
  "risk": "high" | "low",
  "assumptions": ["string"],
  "missingContext": ["string"]
}
"""

def validate_and_parse_result(data: Dict[str, Any]) -> GroundingAnalysisResult:
    """Validates the schema and provides clean fallbacks for typing consistency."""
    return {
        "taskType": str(data.get("taskType", "analysis")),
        "risk": "low" if data.get("risk") == "low" else "high",
        "assumptions": [str(x) for x in data.get("assumptions", [])] if isinstance(data.get("assumptions"), list) else [],
        "missingContext": [str(x) for x in data.get("missingContext", [])] if isinstance(data.get("missingContext"), list) else []
    }

def analyze_with_mock_local(prompt: str) -> GroundingAnalysisResult:
    """Offline backup keyword-based parser."""
    logger.info("[Classifier] Running local keyword-based classification fallback.")
    normalized = prompt.lower().strip()
    
    if any(k in normalized for k in ["startup", "mumbai", "expand", "strategy", "plan", "budget"]):
        return {
            "taskType": "decision-making",
            "risk": "high",
            "assumptions": ["Demand exists in the target market", "Required capital budget is available"],
            "missingContext": ["What is your initial expansion budget?", "What is your timeline for launching?"]
        }
        
    if len(normalized) < 15 or normalized.startswith("hi") or normalized.startswith("hello") or normalized.startswith("how are"):
        return {
            "taskType": "greetings-and-summaries",
            "risk": "low",
            "assumptions": [],
            "missingContext": []
        }
        
    return {
        "taskType": "analysis",
        "risk": "high",
        "assumptions": ["Standard baseline conditions apply", "Resource constraints are moderate"],
        "missingContext": ["What specific scale requirements do you have?"]
    }

async def analyze_prompt(prompt: str) -> GroundingAnalysisResult:
    """Analyzes a prompt using Gemini, failing over to Groq, then local fallback."""
    if not prompt or not isinstance(prompt, str):
        raise ValueError("Invalid prompt: Prompt must be a non-empty string")

    # 1. Try Gemini
    if clients.has_gemini():
        try:
            logger.info("[Classifier] Attempting prompt analysis via Gemini API...")
            model = clients.gemini_client.GenerativeModel(
                model_name='gemini-1.5-flash',
                generation_config={"response_mime_type": "application/json"}
            )
            full_prompt = f"{SYSTEM_PROMPT}\n\nUser Input Prompt: \"{prompt}\""
            response = model.generate_content(full_prompt)
            parsed = safe_parse_json(response.text)
            if parsed:
                return validate_and_parse_result(parsed)
        except Exception as e:
            logger.warning(f"[Classifier] Gemini prompt analysis failed: {e}")

    # 2. Fallback to Groq
    if clients.has_groq():
        try:
            logger.info("[Classifier] Falling back to Groq API...")
            full_prompt = f"{SYSTEM_PROMPT}\n\nUser Input Prompt: \"{prompt}\""
            response = clients.groq_client.chat.completions.create(
                model='llama-3.3-70b-versatile',
                messages=[{"role": "user", "content": full_prompt}],
                response_format={"type": "json_object"}
            )
            choice_text = response.choices[0].message.content
            if choice_text:
                parsed = safe_parse_json(choice_text)
                if parsed:
                    return validate_and_parse_result(parsed)
        except Exception as e:
            logger.warning(f"[Classifier] Groq fallback analysis failed: {e}")

    # 3. Local Fallback
    return analyze_with_mock_local(prompt)
