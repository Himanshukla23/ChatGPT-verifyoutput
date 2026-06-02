from typing import List, Dict, Any

def build_grounded_instruction(
    validated_assumptions: List[str],
    context_answers: List[Dict[str, str]]
) -> str:
    """Compiles reviewed assumptions and context answers into a system instruction block."""
    
    if validated_assumptions:
        assumptions_block = "Validated assumptions to rely on:\n" + "\n".join(
            f"- {a}" for a in validated_assumptions
        )
    else:
        assumptions_block = "No specific assumptions validated."

    if context_answers:
        context_block = "Additional user-provided context:\n" + "\n".join(
            f"- Q: {c.get('question')}\n  A: {c.get('answer')}" for c in context_answers
        )
    else:
        context_block = "No additional context provided."

    instruction = f"""You are a helpful and precise AI assistant.
You are generating a final response to the user's prompt.
You MUST adhere strictly to the following validated assumptions and provided context.
Do not assume anything outside these validated items unless it is a standard logical deduction.

{assumptions_block}

{context_block}

Please formulate the final response clearly, professionally, and address the user's prompt directly using this grounded context."""

    return instruction
