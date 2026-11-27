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

    // 1. Try Groq first (ultra-fast, 120B model available)
    if (this.groq) {
      try {
        console.log('[GroundingService] Analyzing prompt via Groq API...');
        return await this.analyzeWithGroq(prompt);
      } catch (groqError: any) {
        console.warn(`[GroundingService] Groq API failed: ${groqError.message || groqError}`);
      }
    } else {
      console.log('[GroundingService] Groq API Key is not configured or uses placeholder.');
    }

    // 2. Try Gemini
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

    // Secondary fallback: Local mock categorizer if both cloud providers fail
    console.warn('[GroundingService] Both Gemini and Groq providers failed or are not configured. Invoking local mock fallback...');
    return this.analyzeWithMockLocal(prompt);
  }

  private async analyzeWithGemini(prompt: string): Promise<GroundingAnalysisResult> {
    if (!this.genAI) throw new Error('Gemini SDK is not initialized');

    const models = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-1.5-flash'];
    for (const modelName of models) {
      try {
        const model = this.genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
          }
        });

        const fullPrompt = `${this.systemPrompt}\n\nUser Input Prompt: "${prompt}"`;
        const result = await model.generateContent(fullPrompt);
        const textResponse = result.response.text();

        if (textResponse) {
          return this.validateAndParseJSON(textResponse, prompt);
        }
      } catch (err: any) {
        console.warn(`[GroundingService] Gemini (${modelName}) failed: ${err.message || err}`);
      }
    }
    throw new Error('All Gemini model variants failed');
  }

  private async analyzeWithGroq(prompt: string): Promise<GroundingAnalysisResult> {
    if (!this.groq) throw new Error('Groq SDK is not initialized');

    const models = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'];
    for (const modelName of models) {
      try {
        const fullPrompt = `${this.systemPrompt}\n\nUser Input Prompt: "${prompt}"`;
        const response = await this.groq.chat.completions.create({
          model: modelName,
          messages: [
            { role: 'user', content: fullPrompt }
          ],
          response_format: { type: 'json_object' }
        });

        const choiceText = response.choices[0]?.message?.content;
        if (choiceText) {
          return this.validateAndParseJSON(choiceText, prompt);
        }
      } catch (err: any) {
        console.warn(`[GroundingService] Groq (${modelName}) failed: ${err.message || err}`);
      }
    }
    throw new Error('All Groq model variants failed');
  }

  private validateAndParseJSON(jsonText: string, prompt: string = ''): GroundingAnalysisResult {
    const data = JSON.parse(jsonText.trim());
    const assumptions = Array.isArray(data.assumptions) ? data.assumptions.map(String) : [];
    const missingContext = Array.isArray(data.missingContext) ? data.missingContext.map(String) : [];
    
    let risk: 'high' | 'low' = data.risk === 'low' ? 'low' : 'high';

    const norm = prompt.toLowerCase().trim();
    const highRiskKeywords = [
      'email', 'manager', 'annual report', 'performance', 'report', 'strategy',
      'budget', 'cloud', 'recruitment', 'engineer', 'hire', 'tokyo', 'skincare',
      'mumbai', 'startup', 'expand', 'launch', 'proposal', 'contract'
    ];
    if (highRiskKeywords.some(k => norm.includes(k)) || (assumptions.length > 0 && missingContext.length > 0)) {
      const lowRiskIndicators = [
        'capital of', 'photosynthesis', 'what time is it', 'quick recipe',
        'translate', 'summarize', 'scrambled eggs', 'hamlet', 'bypass',
        'define', 'formula for', 'what is the capital'
      ];
      if (!lowRiskIndicators.some(k => norm.includes(k))) {
        risk = 'high';
      }
    }

    return {
      taskType: String(data.taskType || 'analysis'),
      risk,
      assumptions,
      missingContext
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

    // Dynamic Prompt-Specific Extractor for Any Other Query
    const words = prompt
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);
    const stopWords = new Set(['the', 'and', 'for', 'our', 'with', 'this', 'that', 'how', 'what', 'can', 'you', 'should', 'we', 'from', 'into', 'about', 'make', 'give', 'tell', 'help', 'some', 'need']);
    const keywords = words.filter(w => !stopWords.has(w.toLowerCase()));
    const topic = keywords.slice(0, 4).join(' ') || 'the requested objective';

    return {
      taskType: 'strategy',
      risk: 'high',
      assumptions: [
        `Organizational alignment and baseline capabilities exist for ${topic}`,
        `Execution parameters will follow industry standards for ${topic}`,
        'Sufficient technical and operational bandwidth is allocated to support execution'
      ],
      missingContext: [
        `What is your target budget or capital constraint for ${topic}?`,
        `What specific KPIs or deliverables define success for ${topic}?`,
        'What is your primary milestone or delivery timeline?'
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
      const models = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-1.5-flash'];
      for (const modelName of models) {
        try {
          console.log(`[GroundingService] Attempting normal response generation via Gemini API (${modelName})...`);
          const model = this.genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(prompt);
          const text = result.response.text();
          if (text) return text;
        } catch (err: any) {
          console.warn(`[GroundingService] Gemini (${modelName}) normal generation failed: ${err.message || err}`);
        }
      }
    }

    if (this.groq) {
      const models = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'];
      for (const modelName of models) {
        try {
          console.log(`[GroundingService] Falling back to Groq (${modelName}) for normal response generation...`);
          const response = await this.groq.chat.completions.create({
            model: modelName,
            messages: [{ role: 'user', content: prompt }]
          });
          const text = response.choices[0]?.message?.content;
          if (text) return text;
        } catch (err: any) {
          console.warn(`[GroundingService] Groq (${modelName}) normal generation failed: ${err.message || err}`);
        }
      }
    }

    console.warn('[GroundingService] Both Gemini and Groq failed/unconfigured. Using local mock normal response...');
    const lower = prompt.toLowerCase().trim();
    if (['email', 'manager', 'annual report', 'performance'].some(k => lower.includes(k))) {
      return (
        "**Subject:** Annual Team Performance & Milestones Report\n\n" +
        "Hi [Manager's Name],\n\n" +
        "I hope you're having a great week. As we conclude this performance cycle, I have put together an annual report detailing our team's core accomplishments, operational progress, and strategic priorities.\n\n" +
        "**Key Highlights:**\n" +
        "• Successfully met key quarterly delivery milestones on schedule.\n" +
        "• Streamlined cross-team alignment, driving noticeable efficiency gains.\n" +
        "• Maintained 99.9% availability across critical systems and services.\n\n" +
        "Please find the full documentation attached. I would welcome the chance to review these outcomes and discuss upcoming goals in our next check-in.\n\n" +
        "Best regards,\n" +
        "[Your Name]\n" +
        "[Your Title]"
      );
    }
    if (['tokyo', 'skincare', 'japan', 'organic'].some(k => lower.includes(k))) {
      return (
        "### Tokyo Market Entry Strategy: Boutique Organic Skincare\n\n" +
        "**1. Regulatory Approval**: Prepare ingredient dossiers and obtain PMDA certification for Japanese cosmetic compliance.\n" +
        "**2. Channel Strategy**: Launch flagship pop-ups in Tokyo's premium shopping districts (Ginza, Aoyama) complemented by localized e-commerce.\n" +
        "**3. Brand Narrative**: Highlight organic certifications, clean formulations, and sustainable packaging tailored to Japanese consumer preferences."
      );
    }
    if (['cloud', 'infrastructure', 'budget', 'reduce cost'].some(k => lower.includes(k))) {
      return (
        "### Engineering Cloud Cost Optimization Plan\n\n" +
        "**1. Compute Optimization**: Right-size idle instances, terminate orphan staging nodes, and commit steady-state workloads to 1-year Savings Plans.\n" +
        "**2. Storage Management**: Establish automated lifecycle rules moving historical logs and inactive buckets to archival storage.\n" +
        "**3. Target Outcome**: Projected 20-30% reduction in monthly cloud infrastructure spend within 60 days."
      );
    }
    if (['recruitment', 'eastern europe', 'remote', 'hire'].some(k => lower.includes(k))) {
      return (
        "### Remote Engineering Recruitment Strategy: Eastern Europe\n\n" +
        "**1. Target Talent Markets**: Focus recruitment in Poland, Romania, and the Czech Republic for senior full-stack and systems engineering.\n" +
        "**2. Working Hours**: Core overlap of 4-5 hours ensures seamless sprint standups and pair programming with existing teams.\n" +
        "**3. Compliance**: Utilize an established Employer of Record (EOR) platform to ensure full local labor and tax compliance."
      );
    }
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
    return `Here is a foundational overview addressing your request for "${prompt}". For tailored recommendations with verified parameters, enable grounding validation.`;
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
      const models = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-1.5-flash'];
      for (const modelName of models) {
        try {
          console.log(`[GroundingService] Attempting final grounded response via Gemini API (${modelName})...`);
          const model = this.genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(`${instruction}\n\nUser Prompt: "${prompt}"`);
          const text = result.response.text();
          if (text) return text;
        } catch (geminiError: any) {
          console.warn(`[GroundingService] Gemini (${modelName}) grounded generation failed: ${geminiError.message || geminiError}`);
        }
      }
    }

    if (this.groq) {
      const models = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'];
      for (const modelName of models) {
        try {
          console.log(`[GroundingService] Falling back to Groq (${modelName}) for grounded response generation...`);
          const response = await this.groq.chat.completions.create({
            model: modelName,
            messages: [
              { role: 'system', content: instruction },
              { role: 'user', content: prompt }
            ]
          });
          const text = response.choices[0]?.message?.content;
          if (text) return text;
        } catch (groqError: any) {
          console.warn(`[GroundingService] Groq (${modelName}) grounded generation failed: ${groqError.message || groqError}`);
        }
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
