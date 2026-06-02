from typing import List, Dict, Any, Tuple
from api.mcp import clients
from api.utils import logger
from api.context_manager import build_grounded_instruction

async def generate_normal_response(prompt: str) -> str:
    """Generates standard ungrounded response using Gemini -> Groq -> Mock failover."""
    
    # 1. Try Gemini
    if clients.has_gemini():
        try:
            logger.info("[Planner] Attempting normal response generation via Gemini API...")
            model = clients.gemini_client.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content(prompt)
            if response.text:
                return response.text
        except Exception as e:
            logger.warning(f"[Planner] Gemini normal generation failed: {e}")

    # 2. Try Groq
    if clients.has_groq():
        try:
            logger.info("[Planner] Falling back to Groq for normal response generation...")
            response = clients.groq_client.chat.completions.create(
                model='llama-3.3-70b-versatile',
                messages=[{"role": "user", "content": prompt}]
            )
            text = response.choices[0].message.content
            if text:
                return text
        except Exception as e:
            logger.warning(f"[Planner] Groq normal generation failed: {e}")

    # 3. Local Mock
    logger.warning("[Planner] Running local mock response generator fallback.")
    return f"[Mock Response] This is a simulated response to your query: \"{prompt}\". Configure live API keys for authentic output."

async def generate_grounded_response(
    prompt: str,
    validated_assumptions: List[str],
    context_answers: List[Dict[str, str]]
) -> str:
    """Generates grounded response using Gemini -> Groq -> Mock failover with context injection."""
    
    instruction = build_grounded_instruction(validated_assumptions, context_answers)
    
    # 1. Try Gemini
    if clients.has_gemini():
        try:
            logger.info("[Planner] Attempting grounded response generation via Gemini API...")
            model = clients.gemini_client.GenerativeModel('gemini-1.5-flash')
            full_prompt = f"{instruction}\n\nUser Prompt: \"{prompt}\""
            response = model.generate_content(full_prompt)
            if response.text:
                return response.text
        except Exception as e:
            logger.warning(f"[Planner] Gemini grounded generation failed: {e}")

    # 2. Try Groq
    if clients.has_groq():
        try:
            logger.info("[Planner] Falling back to Groq for grounded response generation...")
            response = clients.groq_client.chat.completions.create(
                model='llama-3.3-70b-versatile',
                messages=[
                    {"role": "system", "content": instruction},
                    {"role": "user", "content": prompt}
                ]
            )
            text = response.choices[0].message.content
            if text:
                return text
        except Exception as e:
            logger.warning(f"[Planner] Groq grounded generation failed: {e}")

    # 3. Local Mock Grounded Response
    logger.warning("[Planner] Running local mock grounded response generator fallback.")
    assumptions_str = "\n".join(f"- {a}" for a in validated_assumptions)
    context_str = "\n".join(f"- {c.get('question')}: {c.get('answer')}" for c in context_answers)
    return (
        f"[Mock Grounded Response for: \"{prompt}\"]\n\n"
        f"Based on your validated assumptions:\n{assumptions_str}\n\n"
        f"And context answers:\n{context_str}\n\n"
        f"This is a mock response demonstrating context grounding alignment. Configure live API keys to get authentic outputs."
    )

async def execute_plan(
    prompt: str,
    assumptions: List[str] = None,
    context_answers: List[Dict[str, str]] = None
) -> Tuple[str, bool]:
    """Orchestrates standard or grounded response depending on provided inputs."""
    assumptions = assumptions or []
    context_answers = context_answers or []
    
    has_grounding = len(assumptions) > 0 or len(context_answers) > 0
    
    if not has_grounding:
        res = await generate_normal_response(prompt)
        return res, False
        
    res = await generate_grounded_response(prompt, assumptions, context_answers)
    return res, True
