# 🗂️ Slide Deck Assets: Prompts Reference Guide

This document aggregates all the prompts related to the **AI Grounding Layer (ChatGPT Prototype)** project. You can copy and paste these directly into your presentation slides.

---

## 💻 1. The Initiation Prompt (Used to Build the Project)
*This is the core specification prompt given to the AI Coding Assistant to build the entire system.*

> **Prompt:**
> 
> "Based on this @[Problem statement.md] , generate a complete system architecture, frontend architecture, backend database schema (if needed), component hierarchy, and screen flow for an MVP prototype."

---

## 🧠 2. The Internal Triage & Analysis Prompt
*This system prompt runs inside the backend service ([grounding.service.ts](file:///c:/Users/himan/ChatGPT%20prototype/backend/src/services/grounding.service.ts)) to parse user inputs into task classification, assumptions, and missing context.*

> **System Prompt:**
> 
> ```text
> You are an AI Grounding Layer classification engine.
> Your job is to analyze the user's input prompt and determine:
> 1. The task category (taskType). Common values: "decision-making", "planning", "strategy", "research", "analysis", "content-generation", "greetings-and-summaries".
> 2. The risk rating (risk). 
>    - Classify as "high" if the task is complex, strategic, decision-heavy, requires validation, OR if the prompt requests to draft, generate, or write professional/business communication, reports, emails, or templates that rely on implicit placeholders, personal details, or organizational context (e.g. writing performance emails to managers, quarterly team updates, annual summaries, project status briefs). These need grounding review to avoid generic placeholders (e.g. [Manager's Name], [Year]).
>    - Classify as "low" ONLY if the query is a basic greeting ("hi", "how are you"), a quick summary of a provided text block, a simple language translation, or a direct factual question (e.g. "what is the capital of France").
> 3. Extracted assumptions (assumptions): A list of implicit or explicit premises, placeholders, or structural assumptions made in the prompt that need verification (e.g., assumptions about achievements to highlight, positive feedback expectation, specific year references). For low-risk queries, return an empty array [].
> 4. Missing context (missingContext): A list of specific personal, metrics, or factual context gaps or clarifying questions that would be needed to draft the document or answer the query with precise accuracy (e.g., "What is the manager's name?", "What are your key achievements for the year?", "What is the specific reporting period?"). For low-risk queries, return an empty array [].
> 
> Return the result ONLY as a valid JSON object matching this exact structure:
> {
>   "taskType": "string",
>   "risk": "high" | "low",
>   "assumptions": ["string"],
>   "missingContext": ["string"]
> }
> ```

---

## ⚡ 3. The Grounded Generation Prompt
*This prompt is sent to the LLM during the final stage when the user submits their verified answers, forcing the LLM to anchor its response strictly to the confirmed parameters.*

> **Generation Prompt:**
> 
> ```text
> You are a helpful and precise AI assistant.
> You are generating a final response to the user's prompt.
> You MUST adhere strictly to the following validated assumptions and provided context.
> Do not assume anything outside these validated items unless it is a standard logical deduction.
> 
> [Validated assumptions to rely on]:
> - {List of User-Approved/Edited Assumptions}
> 
> [Additional user-provided context]:
> - Q: {Context Gap Question}
>   A: {User's Filled Answer}
> 
> Please formulate the final response clearly, professionally, and address the user's prompt directly using this grounded context.
> ```

---

## 🛠️ 4. Iteration & Improvement Prompts
*These are the exact prompts you entered during the development process to refine, polish, and optimize the prototype.*

### UI/UX Refinement
*   `"its looks good, but the output in not structure check image"`
*   `"improve the some ui and ux , but the same as it as and use this logo and smooth the interface"`
*   `"i wnat to say structure the this think in a proper way"`

### Logic & Classification Calibration
*   `"why here grounding feature not work , on this Q , here also taking assumption"`
*   `"what types of Q are come under grounding feature"`
*   `"and what are types of Q are using the grounding feature , like its come under risk"`

### System Flow & Documentation Improvements
*   `"can design the flow"`
*   `"can you check i dont see any flow chat in readme file"`
*   `"see this readme file well structure but mine not"`
*   `"same like image can you also add test prompt ; example - https://github.com/codeflex123/Claudeorchestration/blob/main/test_prompts.md"`
*   `"i am going to make a prototype video for my project like explaining how its work , evey step in 2 +mint"` $\rightarrow$ `"can you sort it"` (optimized down to 90 seconds script)

---

## 🧪 5. Live Demonstration Prompts (Test Scenarios)
*Use these prompts during your presentation or live demo to showcase how the system operates under different flows.*

### Flow A: Direct Bypass (Low Risk)
*These prompts bypass the grounding interface entirely and yield immediate responses.*
*   `"What is the capital of France?"`
*   `"Explain the concept of photosynthesis in two sentences."`
*   `"Translate 'hello, how are you' into Spanish."`

### Flow B: Intercept & Grounding Workspace (High Risk)
*These prompts trigger the split-pane overlay, allowing you to show the assumption cards and input questions.*

*   **Scenario 1: Business expansion decision**
    *   *Prompt:* `"Develop a market entry strategy for launching a boutique organic skincare brand in Tokyo."`
    *   *Expected Assumptions:* Consumer demand exists in Tokyo, brand has sufficient capital, regulatory compliance is feasible.
    *   *Expected Gaps:* Initial launch budget, target customer age range, distribution channels.
*   **Scenario 2: Professional report/email draft**
    *   *Prompt:* `"Generate a high-impact email to my manager outlining the annual team performance report."`
    *   *Expected Assumptions:* Positive performance results, manager alignment exists.
    *   *Expected Gaps:* Manager's name, key achievements of the year, reporting period.
