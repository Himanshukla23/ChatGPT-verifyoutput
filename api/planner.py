from typing import List, Dict, Any, Tuple
from api.mcp import clients
from api.utils import logger
from api.context_manager import build_grounded_instruction

async def generate_normal_response(prompt: str) -> str:
    """Generates standard ungrounded response using Gemini -> Groq -> Mock failover."""
    
    # 1. Try Groq (Ultra-fast 120B model)
    if clients.has_groq():
        for groq_model in ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b']:
            try:
                logger.info(f"[Planner] Generating normal response via Groq ({groq_model})...")
                response = clients.groq_client.chat.completions.create(
                    model=groq_model,
                    messages=[{"role": "user", "content": prompt}]
                )
                text = response.choices[0].message.content
                if text:
                    return text
            except Exception as e:
                logger.warning(f"[Planner] Groq ({groq_model}) normal generation failed: {e}")

    # 2. Try Gemini
    if clients.has_gemini():
        for gem_model in ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-1.5-flash']:
            try:
                logger.info(f"[Planner] Attempting normal response generation via Gemini API ({gem_model})...")
                model = clients.gemini_client.GenerativeModel(gem_model)
                response = model.generate_content(prompt)
                if response.text:
                    return response.text
            except Exception as e:
                logger.warning(f"[Planner] Gemini ({gem_model}) normal generation failed: {e}")

    # 3. Local Mock Fallback
    logger.warning("[Planner] Running local mock response generator fallback.")
    lower = prompt.lower().strip()
    if any(k in lower for k in ["email", "manager", "annual report", "performance"]):
        return (
            "**Subject:** Annual Team Performance & Milestones Report\n\n"
            "Hi [Manager's Name],\n\n"
            "I hope you're having a great week. As we conclude this performance cycle, I have put together an annual report detailing our team's core accomplishments, operational progress, and strategic priorities.\n\n"
            "**Key Highlights:**\n"
            "• Successfully met key quarterly delivery milestones on schedule.\n"
            "• Streamlined cross-team alignment, driving noticeable efficiency gains.\n"
            "• Maintained 99.9% availability across critical systems and services.\n\n"
            "Please find the full documentation attached. I would welcome the chance to review these outcomes and discuss upcoming goals in our next check-in.\n\n"
            "Best regards,\n"
            "[Your Name]\n"
            "[Your Title]"
        )
    if any(k in lower for k in ["tokyo", "skincare", "japan", "organic"]):
        return (
            "### Tokyo Market Entry Strategy: Boutique Organic Skincare\n\n"
            "**1. Regulatory Approval**: Prepare ingredient dossiers and obtain PMDA certification for Japanese cosmetic compliance.\n"
            "**2. Channel Strategy**: Launch flagship pop-ups in Tokyo's premium shopping districts (Ginza, Aoyama) complemented by localized e-commerce.\n"
            "**3. Brand Narrative**: Highlight organic certifications, clean formulations, and sustainable packaging tailored to Japanese consumer preferences."
        )
    if any(k in lower for k in ["cloud", "infrastructure", "budget", "reduce cost"]):
        return (
            "### Engineering Cloud Cost Optimization Plan\n\n"
            "**1. Compute Optimization**: Right-size idle instances, terminate orphan staging nodes, and commit steady-state workloads to 1-year Savings Plans.\n"
            "**2. Storage Management**: Establish automated lifecycle rules moving historical logs and inactive buckets to archival storage.\n"
            "**3. Target Outcome**: Projected 20-30% reduction in monthly cloud infrastructure spend within 60 days."
        )
    if any(k in lower for k in ["recruitment", "eastern europe", "remote", "hire"]):
        return (
            "### Remote Engineering Recruitment Strategy: Eastern Europe\n\n"
            "**1. Target Talent Markets**: Focus recruitment in Poland, Romania, and the Czech Republic for senior full-stack and systems engineering.\n"
            "**2. Working Hours**: Core overlap of 4-5 hours ensures seamless sprint standups and pair programming with existing teams.\n"
            "**3. Compliance**: Utilize an established Employer of Record (EOR) platform to ensure full local labor and tax compliance."
        )
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
    
    return f"Here is a direct response to your query regarding '{prompt}':\n\nBased on your prompt, here is a foundational overview addressing your request. For personalized recommendations incorporating specific constraints, enable grounding verification."

async def generate_grounded_response(
    prompt: str,
    validated_assumptions: List[str],
    context_answers: List[Dict[str, str]]
) -> str:
    """Generates grounded response using Gemini -> Groq -> Mock failover with context injection."""
    
    instruction = build_grounded_instruction(validated_assumptions, context_answers)
    
    # 1. Try Groq (Ultra-fast 120B model)
    if clients.has_groq():
        for groq_model in ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b']:
            try:
                logger.info(f"[Planner] Generating grounded response via Groq ({groq_model})...")
                response = clients.groq_client.chat.completions.create(
                    model=groq_model,
                    messages=[
                        {"role": "system", "content": instruction},
                        {"role": "user", "content": prompt}
                    ]
                )
                text = response.choices[0].message.content
                if text:
                    return text
            except Exception as e:
                logger.warning(f"[Planner] Groq ({groq_model}) grounded generation failed: {e}")

    # 2. Try Gemini
    if clients.has_gemini():
        for gem_model in ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-1.5-flash']:
            try:
                logger.info(f"[Planner] Attempting grounded response generation via Gemini API ({gem_model})...")
                model = clients.gemini_client.GenerativeModel(gem_model)
                full_prompt = f"{instruction}\n\nUser Prompt: \"{prompt}\""
                response = model.generate_content(full_prompt)
                if response.text:
                    return response.text
            except Exception as e:
                logger.warning(f"[Planner] Gemini ({gem_model}) grounded generation failed: {e}")

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
