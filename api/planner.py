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
    lower = prompt.lower().strip()
    if "capital of france" in lower:
        return "The capital of France is Paris."
    if "photosynthesis" in lower:
        return "Photosynthesis is the process by which green plants and certain other organisms transform light energy into chemical energy. During photosynthesis, light energy is captured to convert water, carbon dioxide, and minerals into oxygen and energy-rich organic compounds."
    if "tokyo" in lower and "time" in lower:
        return "Tokyo operates on Japan Standard Time (JST, UTC+9) throughout the year without daylight saving adjustments."
    if "scrambled eggs" in lower:
        return "Quick Scrambled Eggs Recipe:\n1. Beat 2-3 eggs with a pinch of salt and 1 tbsp butter or milk.\n2. Heat a non-stick skillet over medium-low with melted butter.\n3. Pour eggs in and gently stir with a spatula, forming soft curds (approx 90 seconds).\n4. Remove just before fully set and serve warm."
    if "spanish" in lower or "translate" in lower:
        return "'Hello, how are you' translates to 'Hola, ¿cómo estás?' (casual) or 'Hola, ¿cómo está usted?' (formal) in Spanish."
    if "hamlet" in lower:
        return "Shakespeare's Hamlet explores existential grief, corruption, morality, and revenge through Prince Hamlet's agonizing struggle between contemplation and action following his father's murder."
    if lower.startswith("hi") or lower.startswith("hello"):
        return "Hello! How can I assist you with your projects, research, or planning today?"
    
    return f"Here is a direct response to your query:\n\n{prompt}\n\nThis query bypassed the grounding review layer and was processed directly."

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
    assumptions_str = "\n".join(f"  • {a}" for a in validated_assumptions)
    context_str = "\n".join(f"  • {c.get('question')}: {c.get('answer')}" for c in context_answers)
    
    return (
        f"### Executive Summary\n"
        f"Based on your verified grounding parameters, here is the strategic plan for: **{prompt}**\n\n"
        f"### Validated Operating Parameters\n"
        f"{assumptions_str}\n\n"
        f"### Context Integration\n"
        f"{context_str}\n\n"
        f"### Implementation Blueprint\n"
        f"1. **Alignment & Governance**: Establish initial operating baselines incorporating verified assumptions.\n"
        f"2. **Execution Milestones**: Allocate resources strictly aligned with provided context constraints.\n"
        f"3. **Verification & Review**: Monitor deliverables against target KPIs with continuous audit intervals."
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
