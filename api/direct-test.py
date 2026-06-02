import asyncio
from api.classifier import analyze_prompt
from api.planner import execute_plan
from api.utils import logger

async def run_diagnostics():
    print("========================================================")
    print("      PYTHON GROUNDING LAYER - MODULES TEST RUN")
    print("========================================================")
    
    prompt = "Write a comprehensive market expansion report to startup founders in Mumbai."
    print(f"\n1. [TEST] Testing Prompt Classification with: \"{prompt}\"")
    
    # Run analysis
    analysis = await analyze_prompt(prompt)
    print("\n[DATA] Extracted Grounding Data:")
    print(f"   - Task Type:  {analysis['taskType']}")
    print(f"   - Risk Level: {analysis['risk']}")
    print(f"   - Assumptions: {analysis['assumptions']}")
    print(f"   - Context Gaps: {analysis['missingContext']}")

    # Run generation
    print(f"\n2. [TEST] Testing Grounded Text Generation...")
    validated_assumptions = analysis['assumptions']
    context_answers = [
        {"question": q, "answer": f"Mock answer detail for: {q}"}
        for q in analysis['missingContext']
    ]
    
    response, is_grounded = await execute_plan(
        prompt=prompt,
        assumptions=validated_assumptions,
        context_answers=context_answers
    )
    
    print("\n[RESPONSE] Grounded Response Output:")
    print(response)
    print(f"\n[INFO] Grounded: {is_grounded}")
    print("========================================================")

if __name__ == "__main__":
    asyncio.run(run_diagnostics())
