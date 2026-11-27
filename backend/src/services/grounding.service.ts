import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';

export interface GroundingAnalysisResult {
  taskType: string;
  risk: 'high' | 'low';
  assumptions: string[];
  missingContext: string[];
}

export class GroundingService {
  private genAI: GoogleGenerativeAI | null = null;
  private groq: Groq | null = null;
  private systemPrompt = `
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
`;

  constructor() {
    const geminiKey = process.env.GEMINI_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    if (geminiKey && geminiKey !== 'your_gemini_api_key_here') {
      this.genAI = new GoogleGenerativeAI(geminiKey);
    }
    if (groqKey && groqKey !== 'your_groq_api_key_here') {
      this.groq = new Groq({ apiKey: groqKey });
    }
  }

  public async analyzePrompt(prompt: string): Promise<GroundingAnalysisResult> {
    if (!prompt || typeof prompt !== 'string') {
      const error = new Error('Invalid prompt: Prompt must be a non-empty string') as any;
      error.statusCode = 400;
      throw error;
    }

    // Try Gemini first
    if (this.genAI) {
      try {
        console.log('[GroundingService] Attempting prompt analysis via Gemini API...');
        return await this.analyzeWithGemini(prompt);
      } catch (geminiError: any) {
        console.warn(`[GroundingService] Gemini API failed or token limit reached: ${geminiError.message || geminiError}`);
      }
    } else {
      console.log('[GroundingService] Gemini API Key is not configured or uses placeholder.');
    }

    // Fallback to Groq
    if (this.groq) {
      try {
        console.log('[GroundingService] Falling back to Groq API...');
        return await this.analyzeWithGroq(prompt);
      } catch (groqError: any) {
        console.warn(`[GroundingService] Groq API fallback failed: ${groqError.message || groqError}`);
      }
    } else {
      console.log('[GroundingService] Groq API Key is not configured or uses placeholder.');
    }

    // Secondary fallback: Local mock categorizer if both cloud providers fail
    console.warn('[GroundingService] Both Gemini and Groq providers failed or are not configured. Invoking local mock fallback...');
    return this.analyzeWithMockLocal(prompt);
  }

  private async analyzeWithGemini(prompt: string): Promise<GroundingAnalysisResult> {
    if (!this.genAI) throw new Error('Gemini SDK is not initialized');

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      }
    });

    const fullPrompt = `${this.systemPrompt}\n\nUser Input Prompt: "${prompt}"`;
    const result = await model.generateContent(fullPrompt);
    const textResponse = result.response.text();

    if (!textResponse) {
      throw new Error('Empty response received from Gemini');
    }

    return this.validateAndParseJSON(textResponse);
  }

  private async analyzeWithGroq(prompt: string): Promise<GroundingAnalysisResult> {
    if (!this.groq) throw new Error('Groq SDK is not initialized');

    const fullPrompt = `${this.systemPrompt}\n\nUser Input Prompt: "${prompt}"`;
    const response = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'user', content: fullPrompt }
      ],
      response_format: { type: 'json_object' }
    });

    const choiceText = response.choices[0]?.message?.content;
    if (!choiceText) {
      throw new Error('Empty response received from Groq');
    }

    return this.validateAndParseJSON(choiceText);
  }

  private validateAndParseJSON(jsonText: string): GroundingAnalysisResult {
    const data = JSON.parse(jsonText.trim());
    
    // Ensure all required fields exist with correct fallback types
    return {
      taskType: String(data.taskType || 'analysis'),
      risk: data.risk === 'low' ? 'low' : 'high',
      assumptions: Array.isArray(data.assumptions) ? data.assumptions.map(String) : [],
      missingContext: Array.isArray(data.missingContext) ? data.missingContext.map(String) : []
    };
  }

  private analyzeWithMockLocal(prompt: string): GroundingAnalysisResult {
    const normalized = prompt.toLowerCase().trim();

    // 1. Low-risk direct bypass queries
    const lowRiskIndicators = [
      'capital of', 'photosynthesis', 'what time is it', 'quick recipe',
      'translate', 'summarize', 'scrambled eggs', 'hamlet', 'bypass',
      'define', 'formula for', 'what is the capital', 'two sentences',
      'in one paragraph', 'weather in'
    ];
    if (
      lowRiskIndicators.some(k => normalized.includes(k)) ||
      normalized.startsWith('hi') ||
      normalized.startsWith('hello') ||
      normalized.startsWith('hey') ||
      normalized.startsWith('how are you') ||
      normalized.startsWith('good morning') ||
      normalized.length < 12
    ) {
      return {
        taskType: 'greetings-and-summaries',
        risk: 'low',
        assumptions: [],
        missingContext: []
      };
    }

    // 2. Manager Email / Annual Performance Report
    if (['email', 'manager', 'annual report', 'performance', 'team performance', 'review'].some(k => normalized.includes(k))) {
      return {
        taskType: 'content-generation',
        risk: 'high',
        assumptions: [
          'Annual performance review period is complete',
          'Tone should be professional, celebratory, and constructive',
          'Key individual and team accomplishments should be emphasized'
        ],
        missingContext: [
          "What is your manager's name?",
          'What are your top 2-3 key accomplishments this year?',
          'Are there specific metrics or targets (e.g. revenue, delivery speed) to emphasize?'
        ]
      };
    }

    // 3. Tokyo Skincare Market Entry Strategy
    if (['tokyo', 'skincare', 'boutique', 'japan', 'organic'].some(k => normalized.includes(k))) {
      return {
        taskType: 'strategy',
        risk: 'high',
        assumptions: [
          'Viable consumer demand exists in Tokyo for premium organic skincare',
          'Japanese PMDA import and cosmetic regulatory compliance can be met',
          'Premium boutique pricing model is competitive against domestic brands'
        ],
        missingContext: [
          'What is your initial expansion and launch budget?',
          'What is your targeted go-to-market timeline?',
          'What are your primary distribution channels (e.g., Ginza department stores, e-commerce, specialty boutiques)?'
        ]
      };
    }

    // 4. Cloud Infrastructure Budget Reduction
    if (['cloud', 'infrastructure', 'budget allocation', 'engineering team', 'reduce cost', 'aws', 'gcp', 'azure'].some(k => normalized.includes(k))) {
      return {
        taskType: 'planning',
        risk: 'high',
        assumptions: [
          'Current cloud infrastructure has optimization potential (idle instances, overprovisioning)',
          'Core engineering velocity and system reliability must not be compromised',
          'Deployment spans multi-service tiers (compute, databases, storage)'
        ],
        missingContext: [
          'What is your current monthly cloud spend?',
          'What is your target reduction percentage or dollar amount?',
          'Which primary cloud provider(s) are you utilizing?'
        ]
      };
    }

    // 5. Remote Engineering Recruitment in Eastern Europe
    if (['recruitment', 'eastern europe', 'remote engineer', 'remote engineers', 'hiring pipeline'].some(k => normalized.includes(k))) {
      return {
        taskType: 'decision-making',
        risk: 'high',
        assumptions: [
          'Working time-zone overlap is sufficient for core collaboration hours',
          'Technical talent pool in Eastern Europe matches required engineering stack',
          'Compliant international contractor or EOR employment framework can be established'
        ],
        missingContext: [
          'What specific programming languages and seniority levels are needed?',
          'What is your target headcount and recruitment timeline?',
          'What is the budgeted compensation band per engineer?'
        ]
      };
    }

    // 6. Startup Expansion / Mumbai
    if (['startup', 'mumbai', 'expand', 'strategy', 'plan', 'budget'].some(k => normalized.includes(k))) {
      return {
        taskType: 'decision-making',
        risk: 'high',
        assumptions: [
          'Sufficient product-market fit and commercial demand exists in Mumbai',
          'Allocated capital is sufficient to sustain initial operational overhead',
          'Regulatory permits and local vendor partnerships are accessible'
        ],
        missingContext: [
          'What is your allocated expansion budget?',
          'What is your target launch timeline?',
          'What customer segment (B2B vs B2C) are you prioritizing?'
        ]
      };
    }

    return {
      taskType: 'analysis',
      risk: 'high',
      assumptions: [
        'Baseline operating parameters and resources remain stable',
        'Recommendations should prioritize high-leverage outcomes'
      ],
      missingContext: [
        'What specific budget or resource limits apply?',
        'What is your primary milestone or deadline?'
      ]
    };
  }

  public async generateResponse(
    prompt: string,
    assumptions?: string[],
    contextAnswers?: { question: string; answer: string }[]
  ): Promise<{ response: string; isGrounded: boolean }> {
    if (!prompt || typeof prompt !== 'string') {
      const error = new Error('Invalid prompt: Prompt must be a non-empty string') as any;
      error.statusCode = 400;
      throw error;
    }

    const hasGrounding = (assumptions && assumptions.length > 0) || (contextAnswers && contextAnswers.length > 0);

    if (!hasGrounding) {
      const responseText = await this.generateNormalResponse(prompt);
      return { response: responseText, isGrounded: false };
    }

    const responseText = await this.generateGroundedResponse(prompt, assumptions || [], contextAnswers || []);
    return { response: responseText, isGrounded: true };
  }

  private async generateNormalResponse(prompt: string): Promise<string> {
    if (this.genAI) {
      try {
        console.log('[GroundingService] Attempting normal response generation via Gemini API...');
        const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        if (text) return text;
      } catch (err: any) {
        console.warn(`[GroundingService] Gemini normal generation failed: ${err.message || err}`);
      }
    }

    if (this.groq) {
      try {
        console.log('[GroundingService] Falling back to Groq for normal response generation...');
        const response = await this.groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }]
        });
        const text = response.choices[0]?.message?.content;
        if (text) return text;
      } catch (err: any) {
        console.warn(`[GroundingService] Groq normal generation failed: ${err.message || err}`);
      }
    }

    console.warn('[GroundingService] Both Gemini and Groq failed/unconfigured. Using local mock normal response...');
    const lower = prompt.toLowerCase().trim();
    if (lower.includes('capital of france')) {
      return 'The capital of France is Paris.';
    }
    if (lower.includes('photosynthesis')) {
      return 'Photosynthesis is the process by which green plants and certain other organisms transform light energy into chemical energy. During photosynthesis, light energy is captured to convert water, carbon dioxide, and minerals into oxygen and energy-rich organic compounds.';
    }
    if (lower.includes('tokyo') && lower.includes('time')) {
      return 'Tokyo operates on Japan Standard Time (JST, UTC+9) throughout the year without daylight saving adjustments.';
    }
    if (lower.includes('scrambled eggs')) {
      return 'Quick Scrambled Eggs Recipe:\n1. Beat 2-3 eggs with a pinch of salt and 1 tbsp butter or milk.\n2. Heat a non-stick skillet over medium-low with melted butter.\n3. Pour eggs in and gently stir with a spatula, forming soft curds (approx 90 seconds).\n4. Remove just before fully set and serve warm.';
    }
    if (lower.includes('spanish') || lower.includes('translate')) {
      return "'Hello, how are you' translates to 'Hola, ¿cómo estás?' (casual) or 'Hola, ¿cómo está usted?' (formal) in Spanish.";
    }
    if (lower.includes('hamlet')) {
      return "Shakespeare's Hamlet explores existential grief, corruption, morality, and revenge through Prince Hamlet's agonizing struggle between contemplation and action following his father's murder.";
    }
    if (lower.startsWith('hi') || lower.startsWith('hello')) {
      return 'Hello! How can I assist you with your projects, research, or planning today?';
    }
    return `Here is a direct response to your query:\n\n${prompt}\n\nThis query bypassed the grounding review layer and was processed directly.`;
  }

  private async generateGroundedResponse(
    prompt: string,
    validatedAssumptions: string[],
    contextAnswers: { question: string; answer: string }[]
  ): Promise<string> {
    const assumptionsBlock = validatedAssumptions.length > 0
      ? `Validated assumptions to rely on:\n${validatedAssumptions.map(a => `- ${a}`).join('\n')}`
      : 'No specific assumptions validated.';

    const contextBlock = contextAnswers.length > 0
      ? `Additional user-provided context:\n${contextAnswers.map(c => `- Q: ${c.question}\n  A: ${c.answer}`).join('\n')}`
      : 'No additional context provided.';

    const instruction = `You are a helpful and precise AI assistant.
You are generating a final response to the user's prompt.
You MUST adhere strictly to the following validated assumptions and provided context.
Do not assume anything outside these validated items unless it is a standard logical deduction.

${assumptionsBlock}

${contextBlock}

Please formulate the final response clearly, professionally, and address the user's prompt directly using this grounded context.`;

    if (this.genAI) {
      try {
        console.log('[GroundingService] Attempting final grounded response generation via Gemini API...');
        const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(`${instruction}\n\nUser Prompt: "${prompt}"`);
        const text = result.response.text();
        if (text) return text;
      } catch (geminiError: any) {
        console.warn(`[GroundingService] Gemini grounded generation failed: ${geminiError.message || geminiError}`);
      }
    }

    if (this.groq) {
      try {
        console.log('[GroundingService] Falling back to Groq for grounded response generation...');
        const response = await this.groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: instruction },
            { role: 'user', content: prompt }
          ]
        });
        const text = response.choices[0]?.message?.content;
        if (text) return text;
      } catch (groqError: any) {
        console.warn(`[GroundingService] Groq grounded generation failed: ${groqError.message || groqError}`);
      }
    }

    console.warn('[GroundingService] Both Gemini and Groq failed/unconfigured. Using local mock grounded response...');
    const assumptionsStr = validatedAssumptions.map(a => `  • ${a}`).join('\n');
    const contextStr = contextAnswers.map(c => `  • ${c.question}: ${c.answer}`).join('\n');

    return (
      `### Executive Summary\n` +
      `Based on your verified grounding parameters, here is the strategic plan for: **${prompt}**\n\n` +
      `### Validated Operating Parameters\n` +
      `${assumptionsStr}\n\n` +
      `### Context Integration\n` +
      `${contextStr}\n\n` +
      `### Implementation Blueprint\n` +
      `1. **Alignment & Governance**: Establish initial operating baselines incorporating verified assumptions.\n` +
      `2. **Execution Milestones**: Allocate resources strictly aligned with provided context constraints.\n` +
      `3. **Verification & Review**: Monitor deliverables against target KPIs with continuous audit intervals.`
    );
  }
}
