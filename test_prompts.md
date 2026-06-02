# 🧪 ChatGPT Grounding Layer: Manual QA Test Prompts

Use these prompts to verify the Grounding Layer's intent classification, risk triage, assumption extraction, and context grounding.

---

## 🟢 1. Simple / Direct Response (Target: Normal Bypass Flow)

*Test if the system identifies basic queries that do not require complex planning or assumptions, instantly bypassing the grounding workspace modal.*

*   `"What is the capital of France?"`
*   `"Explain the concept of photosynthesis in two sentences."`
*   `"What time is it in Tokyo right now?"`
*   `"Give me a quick recipe for scrambled eggs."`
*   `"Translate 'hello, how are you' into Spanish."`
*   `"Summarize the main themes of Hamlet in one paragraph."`

---

## 🔵 2. Complex Research & Strategy (Target: Grounding Workspace Modal)

*Test if the system correctly classifies high-risk planning, decision-making, or strategic drafts, stopping direct generation and presenting the Interactive Grounding Workspace overlay.*

*   `"Develop a market entry strategy for launching a boutique organic skincare brand in Tokyo."`
    *   *Assumptions expected:* Consumer demand, capital resources, regulatory compliance.
    *   *Gaps expected:* Initial budget, target demographics, distribution channels.
*   `"Draft a quarterly budget allocation plan for our engineering team to reduce cloud infrastructure costs."`
    *   *Assumptions expected:* Cloud platform type, existing budget size, engineering resource requirements.
    *   *Gaps expected:* Current cloud monthly spend, specific target saving percentage.
*   `"Should we expand our tech recruitment pipeline to remote engineers in Eastern Europe?"`
    *   *Assumptions expected:* Cost efficiency advantages, technical skill levels, time zone alignment.
    *   *Gaps expected:* Targeted programming languages, company legal entities in Europe.
*   `"Generate a high-impact email to my manager outlining the annual team performance report."`
    *   *Assumptions expected:* Positive review performance, manager alignment.
    *   *Gaps expected:* Manager's name, key achievements of the year, specific metrics accomplished.
