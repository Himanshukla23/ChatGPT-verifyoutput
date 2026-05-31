export interface ChatSession {
  sessionId: string;
  title: string;
  messages: Message[];
  currentState: 'IDLE' | 'CLASSIFYING' | 'GROUNDING_REVIEW' | 'GENERATING' | 'COMPLETED';
}

export interface Message {
  messageId: string;
  role: 'user' | 'assistant';
  content: string;
  isGrounded: boolean;
  groundingInsights?: GroundingInsights;
}

export interface GroundingReviewState {
  originalPrompt: string;
  taskCategory: string;
  assumptions: AssumptionItem[];
  missingContextGaps: ContextGapItem[];
}

export interface AssumptionItem {
  id: string;
  text: string;
  status: 'pending' | 'accepted' | 'edited' | 'deleted';
  originalText?: string;
}

export interface ContextGapItem {
  id: string;
  question: string;
  userInput: string;
  isRequired: boolean;
}

export interface GroundingInsights {
  originalAssumptionsCount: number;
  validatedAssumptions: string[];
  contextAnswersMerged: string[];
  metadata: {
    latencyMs: number;
    tokensSaved: number;
  };
}
