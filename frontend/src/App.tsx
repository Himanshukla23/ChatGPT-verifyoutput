import { useState, useEffect, useRef } from 'react';
import type { ChatSession, Message, GroundingReviewState, GroundingInsights } from './types';
import { Sidebar } from './components/Sidebar';
import { GroundingWorkspace } from './components/GroundingWorkspace';
import { InsightsDrawer } from './components/InsightsDrawer';

const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // On live deployments, use same-origin relative paths to avoid mixed content & CORS issues
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return '';
    }
  }
  return 'http://localhost:3001';
};

const callApi = async (path: string, options: RequestInit): Promise<Response> => {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  try {
    const res = await fetch(`${base}${cleanPath}`, options);
    if (res.ok) return res;
    // If 404, try /api prefix if not already present
    if (res.status === 404 && !cleanPath.startsWith('/api')) {
      const apiPrefixed = await fetch(`${base}/api${cleanPath}`, options);
      if (apiPrefixed.ok) return apiPrefixed;
    }
    return res;
  } catch (err) {
    // If fetch failed (e.g. Mixed Content, ERR_CONNECTION_REFUSED, or offline)
    if (base.includes('localhost:3001')) {
      try {
        const fallbackRes = await fetch(`${cleanPath}`, options);
        if (fallbackRes.ok) return fallbackRes;
      } catch {
        // continue to throw
      }
    }
    throw err;
  }
};

interface ClientAnalysisResult {
  taskType: string;
  risk: 'low' | 'high';
  assumptions: string[];
  missingContext: string[];
}

// Client-side fallback classification engine
const clientSideAnalyze = (prompt: string): ClientAnalysisResult => {
  const normalized = prompt.toLowerCase().trim();

  // 1. Low-risk direct bypass queries
  const lowRiskIndicators = [
    'capital of', 'photosynthesis', 'what time is it', 'quick recipe',
    'translate', 'summarize', 'scrambled eggs', 'hamlet', 'bypass',
    'define', 'formula for', 'what is the capital', 'two sentences',
    'in one paragraph', 'weather in'
  ];
  if (
    lowRiskIndicators.some((k) => normalized.includes(k)) ||
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
      missingContext: [],
    };
  }

  // 2. Manager Email / Annual Performance Report
  if (['email', 'manager', 'annual report', 'performance', 'team performance', 'review'].some((k) => normalized.includes(k))) {
    return {
      taskType: 'content-generation',
      risk: 'high',
      assumptions: [
        'Annual performance review period is complete',
        'Tone should be professional, celebratory, and constructive',
        'Key individual and team accomplishments should be emphasized',
      ],
      missingContext: [
        "What is your manager's name?",
        'What are your top 2-3 key accomplishments this year?',
        'Are there specific metrics or targets (e.g. revenue, delivery speed) to emphasize?',
      ],
    };
  }

  // 3. Tokyo Skincare Market Entry Strategy
  if (['tokyo', 'skincare', 'boutique', 'japan', 'organic'].some((k) => normalized.includes(k))) {
    return {
      taskType: 'strategy',
      risk: 'high',
      assumptions: [
        'Viable consumer demand exists in Tokyo for premium organic skincare',
        'Japanese PMDA import and cosmetic regulatory compliance can be met',
        'Premium boutique pricing model is competitive against domestic brands',
      ],
      missingContext: [
        'What is your initial expansion and launch budget?',
        'What is your targeted go-to-market timeline?',
        'What are your primary distribution channels (e.g., Ginza department stores, e-commerce, specialty boutiques)?',
      ],
    };
  }

  // 4. Cloud Infrastructure Budget Reduction
  if (['cloud', 'infrastructure', 'budget allocation', 'engineering team', 'reduce cost', 'aws', 'gcp', 'azure'].some((k) => normalized.includes(k))) {
    return {
      taskType: 'planning',
      risk: 'high',
      assumptions: [
        'Current cloud infrastructure has optimization potential (idle instances, overprovisioning)',
        'Core engineering velocity and system reliability must not be compromised',
        'Deployment spans multi-service tiers (compute, databases, storage)',
      ],
      missingContext: [
        'What is your current monthly cloud spend?',
        'What is your target reduction percentage or dollar amount?',
        'Which primary cloud provider(s) are you utilizing?',
      ],
    };
  }

  // 5. Remote Engineering Recruitment in Eastern Europe
  if (['recruitment', 'eastern europe', 'remote engineer', 'remote engineers', 'hiring pipeline'].some((k) => normalized.includes(k))) {
    return {
      taskType: 'decision-making',
      risk: 'high',
      assumptions: [
        'Working time-zone overlap is sufficient for core collaboration hours',
        'Technical talent pool in Eastern Europe matches required engineering stack',
        'Compliant international contractor or EOR employment framework can be established',
      ],
      missingContext: [
        'What specific programming languages and seniority levels are needed?',
        'What is your target headcount and recruitment timeline?',
        'What is the budgeted compensation band per engineer?',
      ],
    };
  }

  // 6. Startup Expansion / Mumbai
  if (['startup', 'mumbai', 'expand', 'strategy', 'plan', 'budget'].some((k) => normalized.includes(k))) {
    return {
      taskType: 'decision-making',
      risk: 'high',
      assumptions: [
        'Sufficient product-market fit and commercial demand exists in Mumbai',
        'Allocated capital is sufficient to sustain initial operational overhead',
        'Regulatory permits and local vendor partnerships are accessible',
      ],
      missingContext: [
        'What is your allocated expansion budget?',
        'What is your target launch timeline?',
        'What customer segment (B2B vs B2C) are you prioritizing?',
      ],
    };
  }

  // 7. Dynamic Prompt-Specific Extractor for Any Other Query
  const words = prompt
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2);
  const stopWords = new Set(['the', 'and', 'for', 'our', 'with', 'this', 'that', 'how', 'what', 'can', 'you', 'should', 'we', 'from', 'into', 'about', 'make', 'give', 'tell', 'help', 'some', 'need']);
  const keywords = words.filter((w) => !stopWords.has(w.toLowerCase()));
  const topic = keywords.slice(0, 4).join(' ') || 'the requested objective';

  return {
    taskType: 'strategy',
    risk: 'high',
    assumptions: [
      `Organizational alignment and baseline capabilities exist for ${topic}`,
      `Execution parameters will follow industry standards for ${topic}`,
      'Sufficient technical and operational bandwidth is allocated to support execution',
    ],
    missingContext: [
      `What is your target budget or capital constraint for ${topic}?`,
      `What specific KPIs or deliverables define success for ${topic}?`,
      'What is your primary milestone or delivery timeline?',
    ],
  };
};

const clientSideGenerateNormal = (prompt: string): string => {
  const lower = prompt.toLowerCase().trim();
  if (['email', 'manager', 'annual report', 'performance'].some((k) => lower.includes(k))) {
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
  if (['tokyo', 'skincare', 'japan', 'organic'].some((k) => lower.includes(k))) {
    return (
      "### Tokyo Market Entry Strategy: Boutique Organic Skincare\n\n" +
      "**1. Regulatory Approval**: Prepare ingredient dossiers and obtain PMDA certification for Japanese cosmetic compliance.\n" +
      "**2. Channel Strategy**: Launch flagship pop-ups in Tokyo's premium shopping districts (Ginza, Aoyama) complemented by localized e-commerce.\n" +
      "**3. Brand Narrative**: Highlight organic certifications, clean formulations, and sustainable packaging tailored to Japanese consumer preferences."
    );
  }
  if (['cloud', 'infrastructure', 'budget', 'reduce cost'].some((k) => lower.includes(k))) {
    return (
      "### Engineering Cloud Cost Optimization Plan\n\n" +
      "**1. Compute Optimization**: Right-size idle instances, terminate orphan staging nodes, and commit steady-state workloads to 1-year Savings Plans.\n" +
      "**2. Storage Management**: Establish automated lifecycle rules moving historical logs and inactive buckets to archival storage.\n" +
      "**3. Target Outcome**: Projected 20-30% reduction in monthly cloud infrastructure spend within 60 days."
    );
  }
  if (['recruitment', 'eastern europe', 'remote', 'hire'].some((k) => lower.includes(k))) {
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
};

const clientSideGenerateGrounded = (
  prompt: string,
  validatedAssumptions: string[],
  contextAnswers: { question: string; answer: string }[]
): string => {
  const assumptionsStr = validatedAssumptions.length > 0
    ? validatedAssumptions.map((a) => `  • ${a}`).join('\n')
    : '  • Standard verified parameters applied';
  const contextStr = contextAnswers.length > 0
    ? contextAnswers.map((c) => `  • ${c.question}: ${c.answer}`).join('\n')
    : '  • No additional context constraints provided';

  return (
    `### Executive Summary\n` +
    `Based on your verified grounding parameters, here is the structured solution for: **${prompt}**\n\n` +
    `### Validated Operating Assumptions\n` +
    `${assumptionsStr}\n\n` +
    `### Context Integration & Parameters\n` +
    `${contextStr}\n\n` +
    `### Implementation Roadmap\n` +
    `1. **Alignment & Baselines**: Calibrate immediate milestones around verified assumptions.\n` +
    `2. **Resource Allocation**: Execute within verified context constraints and budget limits.\n` +
    `3. **Verification & Audit**: Track outputs against defined success criteria with periodic review intervals.`
  );
};

function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [simulationMode, setSimulationMode] = useState<boolean>(true);
  const [artificialLatency, setArtificialLatency] = useState<number>(600);
  const [inputPrompt, setInputPrompt] = useState<string>('');

  // State Machine variables
  const [appState, setAppState] = useState<'IDLE' | 'CLASSIFYING' | 'GROUNDING_REVIEW' | 'GENERATING' | 'COMPLETED'>('IDLE');
  const [loadingStepText, setLoadingStepText] = useState<string>('');
  const [reviewState, setReviewState] = useState<GroundingReviewState | null>(null);
  const [activeInsights, setActiveInsights] = useState<GroundingInsights | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize with a default session if empty
  useEffect(() => {
    if (sessions.length === 0) {
      handleCreateNewChat();
    }
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, activeSessionId, appState]);

  const activeSession = sessions.find((s) => s.sessionId === activeSessionId) || sessions[0];

  const handleCreateNewChat = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newSession: ChatSession = {
      sessionId: newId,
      title: 'New grounding session',
      messages: [],
      currentState: 'IDLE',
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
    setAppState('IDLE');
    setReviewState(null);
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    const selected = sessions.find((s) => s.sessionId === id);
    if (selected) {
      setAppState(selected.messages.length > 0 ? 'COMPLETED' : 'IDLE');
    }
    setReviewState(null);
  };

  // Quick Prompt templates
  const handleQuickPrompt = (prompt: string) => {
    setInputPrompt(prompt);
  };

  // Helper wait function for simulated telemetry experience
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Primary Submission Pipeline
  const handleSubmitPrompt = async (forcedPrompt?: string) => {
    const promptToSubmit = forcedPrompt || inputPrompt;
    if (!promptToSubmit.trim()) return;

    // 1. Add User Message
    const userMessage: Message = {
      messageId: Math.random().toString(36).substr(2, 9),
      role: 'user',
      content: promptToSubmit.trim(),
      isGrounded: false,
    };

    const updatedMessages = [...(activeSession?.messages || []), userMessage];
    
    // Update session state in-memory
    setSessions((prev) =>
      prev.map((s) => {
        if (s.sessionId === activeSessionId) {
          return {
            ...s,
            title: s.messages.length === 0 ? (promptToSubmit.slice(0, 30) + (promptToSubmit.length > 30 ? '...' : '')) : s.title,
            messages: updatedMessages,
          };
        }
        return s;
      })
    );
    setInputPrompt('');

    // If dynamic grounding is disabled, bypass and generate normal response
    if (!simulationMode) {
      await generateDirectNormalResponse(promptToSubmit, updatedMessages);
      return;
    }

    // 2. Classifying Phase
    setAppState('CLASSIFYING');
    setLoadingStepText('Classifying task risk category...');

    try {
      // Fetch analysis from backend or resilient client fallback
      let analysis: {
        taskType: string;
        risk: 'high' | 'low';
        assumptions: string[];
        missingContext?: string[];
        missingContextGaps?: string[];
      };

      try {
        const response = await callApi('/grounding/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: promptToSubmit }),
        });

        if (!response.ok) {
          throw new Error(`Analysis failed with status ${response.status}`);
        }
        analysis = await response.json();
      } catch (apiErr) {
        console.warn('Backend API unavailable, using client-side grounding analyzer:', apiErr);
        analysis = clientSideAnalyze(promptToSubmit);
      }

      // Artificial latency addition for high-fidelity micro-interactions
      if (artificialLatency > 0) {
        await sleep(artificialLatency / 3);
      }

      // If risk rating is low, skip grounding and generate direct response
      if (analysis.risk === 'low') {
        await generateDirectNormalResponse(promptToSubmit, updatedMessages);
        return;
      }

      // High risk task - perform multi-stage overlay animation
      setLoadingStepText('Isolating implicit and explicit assumptions...');
      await sleep(400);
      setLoadingStepText('Synthesizing critical context gaps...');
      await sleep(400);

      // Map assumptions and context gaps to state
      const initialAssumptions = analysis.assumptions.map((text: string) => ({
        id: Math.random().toString(36).substr(2, 9),
        text,
        status: 'pending' as const,
      }));

      const initialGaps = analysis.missingContextGaps || analysis.missingContext || [];
      const mappedGaps = initialGaps.map((question: string) => ({
        id: Math.random().toString(36).substr(2, 9),
        question,
        userInput: '',
        isRequired: false,
      }));

      setReviewState({
        originalPrompt: promptToSubmit,
        taskCategory: analysis.taskType,
        assumptions: initialAssumptions,
        missingContextGaps: mappedGaps,
      });

      setAppState('GROUNDING_REVIEW');
    } catch (err) {
      console.warn('Analysis execution error, invoking normal response fallback:', err);
      await generateDirectNormalResponse(promptToSubmit, updatedMessages);
    }
  };

  // Generate Normal (Ungrounded) Response
  const generateDirectNormalResponse = async (prompt: string, currentMessages: Message[]) => {
    setAppState('GENERATING');
    setLoadingStepText('Querying LLM Engine...');

    try {
      let responseText = '';
      try {
        const response = await callApi('/grounding/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });

        if (!response.ok) throw new Error(`Generation failed with status ${response.status}`);
        const data = await response.json();
        responseText = data.response;
      } catch (apiErr) {
        console.warn('Backend API unavailable, using client-side normal generator:', apiErr);
        responseText = clientSideGenerateNormal(prompt);
      }

      const aiMessage: Message = {
        messageId: Math.random().toString(36).substr(2, 9),
        role: 'assistant',
        content: responseText,
        isGrounded: false,
      };

      finalizeSessionWithResponse(aiMessage, currentMessages);
    } catch (err) {
      console.error(err);
      finalizeSessionWithError(prompt, currentMessages);
    }
  };

  // Generate Grounded Response using reviewed assumptions and context
  const handleGenerateGrounded = async () => {
    if (!reviewState) return;

    setAppState('GENERATING');
    setLoadingStepText('Formulating grounded system instruction...');
    await sleep(300);
    setLoadingStepText('Querying LLM Engine with verified context...');

    const validatedAssumptions = reviewState.assumptions
      .filter((a) => a.status !== 'deleted')
      .map((a) => a.text);

    const contextAnswers = reviewState.missingContextGaps
      .filter((g) => g.userInput.trim() !== '')
      .map((g) => ({
        question: g.question,
        answer: g.userInput.trim(),
      }));

    const startTime = Date.now();

    try {
      let responseText = '';
      try {
        const response = await callApi('/grounding/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: reviewState.originalPrompt,
            assumptions: validatedAssumptions,
            contextAnswers,
          }),
        });

        if (!response.ok) throw new Error(`Grounded generation failed with status ${response.status}`);
        const data = await response.json();
        responseText = data.response;
      } catch (apiErr) {
        console.warn('Backend API unavailable, using client-side grounded generator:', apiErr);
        responseText = clientSideGenerateGrounded(reviewState.originalPrompt, validatedAssumptions, contextAnswers);
      }

      const latencyMs = Date.now() - startTime + (artificialLatency > 0 ? artificialLatency : 0);
      const tokensSaved = validatedAssumptions.length * 14 + contextAnswers.length * 20;

      const aiMessage: Message = {
        messageId: Math.random().toString(36).substr(2, 9),
        role: 'assistant',
        content: responseText,
        isGrounded: true,
        groundingInsights: {
          originalAssumptionsCount: reviewState.assumptions.length,
          validatedAssumptions,
          contextAnswersMerged: contextAnswers.map((c) => `Q: ${c.question} | A: ${c.answer}`),
          metadata: {
            latencyMs,
            tokensSaved,
          },
        },
      };

      finalizeSessionWithResponse(aiMessage, activeSession.messages);
    } catch (err) {
      console.error(err);
      finalizeSessionWithError(reviewState.originalPrompt, activeSession.messages);
    }
  };

  const handleSkipGrounding = async () => {
    if (!reviewState) return;
    await generateDirectNormalResponse(reviewState.originalPrompt, activeSession.messages);
  };

  const finalizeSessionWithResponse = (aiMessage: Message, currentMessages: Message[]) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.sessionId === activeSessionId) {
          return {
            ...s,
            messages: [...currentMessages, aiMessage],
            currentState: 'COMPLETED',
          };
        }
        return s;
      })
    );
    setAppState('COMPLETED');
    setReviewState(null);
  };

  const finalizeSessionWithError = (prompt: string, currentMessages: Message[]) => {
    const aiMessage: Message = {
      messageId: Math.random().toString(36).substr(2, 9),
      role: 'assistant',
      content: `Here is a response to your query:\n\n${clientSideGenerateNormal(prompt)}`,
      isGrounded: false,
    };
    finalizeSessionWithResponse(aiMessage, currentMessages);
  };

  // Custom Inline Markdown Renderer (Bullet formatters, Headings, Bolding)
  const renderMessageContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      
      // Parse headings
      if (trimmed.startsWith('### ')) {
        const parts = trimmed.substring(4).split(/(\*\*.*?\*\*)/g);
        const parsedText = parts.map((part, partIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={partIdx} className="font-bold text-[#1a1a1a]">{part.slice(2, -2)}</strong>;
          }
          return part;
        });
        return <h4 key={idx} className="text-[14px] font-semibold text-[#1a1a1a] mt-4 mb-1.5">{parsedText}</h4>;
      }
      
      if (trimmed.startsWith('## ')) {
        const parts = trimmed.substring(3).split(/(\*\*.*?\*\*)/g);
        const parsedText = parts.map((part, partIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={partIdx} className="font-bold text-[#1a1a1a]">{part.slice(2, -2)}</strong>;
          }
          return part;
        });
        return <h3 key={idx} className="text-[16px] font-semibold text-[#1a1a1a] mt-5 mb-2">{parsedText}</h3>;
      }
      
      if (trimmed.startsWith('# ')) {
        const parts = trimmed.substring(2).split(/(\*\*.*?\*\*)/g);
        const parsedText = parts.map((part, partIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={partIdx} className="font-bold text-[#1a1a1a]">{part.slice(2, -2)}</strong>;
          }
          return part;
        });
        return <h2 key={idx} className="text-[18px] font-bold text-[#1a1a1a] mt-6 mb-2.5">{parsedText}</h2>;
      }

      // Check if it's a bullet point
      const isBullet = trimmed.startsWith('* ') || trimmed.startsWith('- ');
      const displayLine = isBullet ? trimmed.substring(2) : line;

      // Parse bold text
      const parts = displayLine.split(/(\*\*.*?\*\*)/g);
      const parsedText = parts.map((part, partIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={partIdx} className="font-semibold text-[#1a1a1a]">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={idx} className="flex items-start gap-2.5 ml-3 mb-1 text-[13px] text-[#555] leading-relaxed">
            <span className="text-[#10a37f] mt-[7px] text-[6px] leading-none shrink-0">●</span>
            <span className="flex-1">{parsedText}</span>
          </div>
        );
      }

      return (
        <div key={idx} className="min-h-[1.2em] mb-1.5 text-[13px] text-[#555] leading-[1.7]">
          {parsedText}
        </div>
      );
    });
  };

  // Quick prompt suggestions data
  const quickPrompts = [
    { icon: 'edit', label: 'Write manager report email', prompt: 'genrate the email for providing annual report to my manager' },
    { icon: 'language', label: 'Skincare strategy in Tokyo', prompt: 'Develop a market entry strategy for launching a boutique organic skincare brand in Tokyo.' },
    { icon: 'monitoring', label: 'Cloud budget reduction', prompt: 'Draft a quarterly budget allocation plan for our engineering team to reduce cloud infrastructure costs.' },
    { icon: 'groups', label: 'Remote recruitment analysis', prompt: 'Should we expand our tech recruitment pipeline to remote engineers in Eastern Europe?' },
    { icon: 'arrow_forward', label: 'Low-risk bypass test', prompt: 'Hello! Just bypassing all grounding rules.' },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#f9f9f9]">
      {/* Sidebar */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleCreateNewChat}
        simulationMode={simulationMode}
        onToggleSimulation={() => setSimulationMode(!simulationMode)}
        artificialLatency={artificialLatency}
        onLatencyChange={setArtificialLatency}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative h-full bg-white overflow-hidden">
        {/* TopNavBar */}
        <header className="h-[52px] flex items-center justify-between px-5 w-full bg-white border-b border-[#f0f0f0] z-30 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity duration-200">
              <span className="text-[15px] text-[#1a1a1a] font-semibold tracking-tight">ChatGPT</span>
              <span className="material-symbols-outlined text-[#9a9a9a] text-[14px] mt-px">expand_more</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <span className="px-2.5 py-1 bg-[#f5f5f5] rounded-full text-[10px] font-semibold text-[#6e6e73] tracking-wider uppercase border border-[#e5e5e5]">
                Failover Engine v4
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all duration-300 ${
                appState === 'CLASSIFYING' || appState === 'GENERATING'
                  ? 'bg-[#eef0ff] text-[#5b6fff] animate-pulse'
                  : appState === 'GROUNDING_REVIEW'
                    ? 'bg-[#fff3cd] text-[#b08800]'
                    : 'bg-[#f0fdf8] text-[#10a37f]'
              }`}>
                {appState === 'CLASSIFYING' && 'Classifying...'}
                {appState === 'GENERATING' && 'Generating...'}
                {appState === 'GROUNDING_REVIEW' && 'Review active'}
                {(appState === 'IDLE' || appState === 'COMPLETED') && 'Online'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9a9a9a] hover:text-[#1a1a1a] hover:bg-[#f5f5f5] transition-all duration-200">
              <span className="material-symbols-outlined text-[18px]">share</span>
            </button>
            <div className="w-7 h-7 rounded-full bg-[#f0f0f0] flex items-center justify-center border border-[#e5e5e5] overflow-hidden">
              <span className="material-symbols-outlined text-[16px] text-[#9a9a9a] translate-y-0.5">person</span>
            </div>
          </div>
        </header>

        {/* Canvas / Message Stream Container */}
        <div className="flex-1 overflow-y-auto px-5 space-y-5 flex flex-col justify-start relative">
          {activeSession?.messages.length === 0 ? (
            <div className="w-full max-w-[680px] mx-auto flex flex-col items-center justify-center flex-grow py-16 animate-fade-in">
              {/* Logo welcome */}
              <div className="chatgpt-logo-avatar w-14 h-14 mb-6 animate-bounce-in">
                <img src="/chatgpt-logo.png" alt="ChatGPT" className="chatgpt-logo" />
              </div>
              <h2 className="text-[28px] font-semibold text-[#1a1a1a] mb-2 text-center tracking-tight leading-tight">What can I help with?</h2>
              <p className="text-[14px] text-[#9a9a9a] mb-8 text-center">High-risk prompts are automatically intercepted for grounding review.</p>
              
              {/* Suggestion Quick Chips */}
              <div className="flex flex-wrap justify-center gap-2.5 w-full max-w-[560px]">
                {quickPrompts.map((item, idx) => (
                  <button
                    key={idx}
                    className="chip-stagger opacity-0 animate-float-up flex items-center gap-2 px-4 py-2.5 bg-white border border-[#e5e5e5] rounded-full hover:border-[#10a37f]/40 hover:bg-[#fafffe] hover:shadow-[0_2px_8px_rgba(16,163,127,0.06)] transition-all duration-200 press-effect group"
                    onClick={() => handleQuickPrompt(item.prompt)}
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#9a9a9a] group-hover:text-[#10a37f] transition-colors duration-200">{item.icon}</span>
                    <span className="text-[12px] text-[#555] font-medium group-hover:text-[#1a1a1a] transition-colors duration-200">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="w-full max-w-[680px] mx-auto flex flex-col gap-5 py-5">
              {activeSession?.messages.map((msg, msgIdx) => (
                <div
                  key={msg.messageId}
                  className={`flex gap-3.5 w-full ${
                    msg.role === 'user' ? 'flex-row-reverse' : ''
                  } animate-float-up`}
                  style={{ animationDelay: `${msgIdx * 60}ms` }}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === 'user'
                      ? 'bg-[#f0f0f0] border border-[#e5e5e5]'
                      : ''
                  }`}>
                    {msg.role === 'user' ? (
                      <span className="material-symbols-outlined text-[16px] text-[#9a9a9a] translate-y-0.5">person</span>
                    ) : (
                      <div className="chatgpt-logo-avatar w-8 h-8">
                        <img src="/chatgpt-logo.png" alt="ChatGPT" className="chatgpt-logo" />
                      </div>
                    )}
                  </div>

                  {/* Message Content */}
                  <div className={`flex flex-col max-w-[82%] ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}>
                    <div className={`p-4 rounded-2xl leading-relaxed transition-all duration-200 ${
                      msg.role === 'user'
                        ? 'bg-[#f5f5f5] text-[#1a1a1a] border border-[#f0f0f0] rounded-tr-md'
                        : msg.isGrounded
                          ? 'bg-white border border-[#10a37f]/15 text-[#1a1a1a] shadow-[0_1px_4px_rgba(16,163,127,0.06)] rounded-tl-md'
                          : 'bg-white border border-[#f0f0f0] text-[#1a1a1a] shadow-[0_1px_3px_rgba(0,0,0,0.03)] rounded-tl-md'
                    }`}>
                      <div className="message-bubble">
                        {renderMessageContent(msg.content)}
                      </div>
                    </div>

                    {/* Metadata tags */}
                    <div className="flex items-center gap-2 mt-1.5 px-1 text-[11px] text-[#b0b0b0]">
                      <span>{msg.role === 'user' ? 'You' : 'ChatGPT'}</span>
                      {msg.isGrounded && msg.groundingInsights && (
                        <button
                          className="grounded-badge flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f0fdf8] border border-[#10a37f]/15 text-[#10a37f] hover:bg-[#e6fbf3] transition-all duration-200 text-[10px] font-semibold press-effect"
                          onClick={() => setActiveInsights(msg.groundingInsights || null)}
                        >
                          <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                          Grounded
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Generator Loading State */}
          {(appState === 'GENERATING' || appState === 'CLASSIFYING') && (
            <div className="w-full max-w-[680px] mx-auto flex gap-3.5 animate-fade-in">
              <div className="chatgpt-logo-avatar w-8 h-8 shrink-0">
                <img src="/chatgpt-logo.png" alt="ChatGPT" className="chatgpt-logo" />
              </div>
              <div className="border border-[#f0f0f0] p-4 bg-white rounded-2xl rounded-tl-md shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex items-center gap-3.5">
                <div className="flex items-center gap-1.5">
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </div>
                <span className="text-[12px] text-[#9a9a9a]">{loadingStepText}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar Area */}
        <div className="px-5 pb-5 pt-3 bg-gradient-to-t from-white via-white to-transparent shrink-0 w-full z-10 flex flex-col items-center">
          <div className="w-full max-w-[680px] flex flex-col items-center">
            
            {/* Input Capsule */}
            <div className="w-full relative bg-[#f5f5f5] rounded-2xl border border-[#e5e5e5] mb-2 focus-within:border-[#10a37f]/40 focus-within:bg-white focus-within:shadow-[0_2px_12px_rgba(16,163,127,0.06)] transition-all duration-300">
              <div className="flex items-center px-4 py-2">
                <button 
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-[#9a9a9a] hover:text-[#10a37f] hover:bg-[#f0fdf8] transition-all duration-200 shrink-0 press-effect"
                  onClick={() => handleCreateNewChat()}
                  title="New conversation"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </button>
                
                <input
                  className="flex-1 bg-transparent border-none focus:ring-0 text-[14px] text-[#1a1a1a] placeholder:text-[#b0b0b0] px-2 outline-none"
                  type="text"
                  placeholder={simulationMode ? "Ask anything (Grounding active)..." : "Ask anything (Bypass mode)..."}
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitPrompt();
                    }
                  }}
                  disabled={appState === 'CLASSIFYING' || appState === 'GENERATING'}
                />

                <div className="flex items-center gap-1 shrink-0">
                  <button className="w-8 h-8 flex items-center justify-center rounded-lg text-[#c4c4c4] hover:text-[#9a9a9a] transition-colors duration-200">
                    <span className="material-symbols-outlined text-[18px]">mic</span>
                  </button>
                  
                  <button
                    className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 shrink-0 press-effect ${
                      inputPrompt.trim()
                        ? 'bg-[#1a1a1a] text-white hover:bg-[#333] shadow-[0_1px_3px_rgba(0,0,0,0.12)]'
                        : 'bg-[#e5e5e5] text-[#c4c4c4] cursor-not-allowed'
                    }`}
                    onClick={() => handleSubmitPrompt()}
                    disabled={!inputPrompt.trim() || appState === 'CLASSIFYING' || appState === 'GENERATING'}
                  >
                    <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      arrow_upward
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-[#c4c4c4] text-center leading-normal tracking-wide">
              Dynamic Grounding Layer intercepts high-risk prompts · Failover Engine active
            </div>
          </div>
        </div>

        {/* Modal Grounding review workspace overlay */}
        {appState === 'GROUNDING_REVIEW' && reviewState && (
          <GroundingWorkspace
            reviewState={reviewState}
            onUpdateState={setReviewState}
            onGenerateGrounded={handleGenerateGrounded}
            onSkipGrounding={handleSkipGrounding}
            isLoading={false}
            loadingStepText={loadingStepText}
          />
        )}

        {/* Insights audit drawer right panel */}
        {activeInsights && (
          <InsightsDrawer insights={activeInsights} onClose={() => setActiveInsights(null)} />
        )}
      </main>
    </div>
  );
}

export default App;
