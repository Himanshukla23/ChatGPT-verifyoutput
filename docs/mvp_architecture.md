# MVP Architecture & Design Specification
## AI Grounding Layer — ChatGPT Prototype

> **Version**: 1.0 (MVP Implemented)  
> **Last Updated**: June 2026  
> **Stack**: React 19 + Vite 8 · Express 4 + TypeScript · Gemini 1.5 Flash · Groq Llama 3.3 70B

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Project Directory Structure](#4-project-directory-structure)
5. [Backend Architecture](#5-backend-architecture)
6. [Frontend Architecture](#6-frontend-architecture)
7. [State Management](#7-state-management)
8. [API Specification](#8-api-specification)
9. [Component Hierarchy](#9-component-hierarchy)
10. [User Flow & Screen Transitions](#10-user-flow--screen-transitions)
11. [LLM Failover Strategy](#11-llm-failover-strategy)
12. [Database Schema (Future Production)](#12-database-schema-future-production)
13. [Phased Development Plan](#13-phased-development-plan)

---

## 1. Project Overview

### Problem Statement

AI assistants like ChatGPT generate highly polished, confident responses. Users frequently trust outputs because they appear professional and well-structured, leading to **overtrust** and **reduced verification**. The problem is not AI adoption — it is the difficulty of evaluating AI outputs before acting on them.

### Solution

Introduce a **Grounding Layer** between the user's prompt and the AI-generated response that:

1. **Detects assumptions** being made from the prompt
2. **Identifies missing context** that could affect response quality
3. **Presents assumptions** to the user for interactive review
4. **Allows users** to accept, edit, remove, or add assumptions
5. **Generates responses** using validated assumptions only
6. **Activates selectively** — only for high-risk tasks (strategy, planning, analysis, decision-making)
7. **Bypasses automatically** for low-risk tasks (greetings, summaries, translations, factual queries)

### Target Users

| Segment | Role |
|---------|------|
| Primary | Knowledge Workers, Product Managers, Business Analysts |
| Secondary | Researchers, Consultants, Strategy Professionals |

### MVP Scope

| Included | Excluded |
|----------|----------|
| ✅ Full frontend prototype | ❌ Authentication / User Accounts |
| ✅ Live LLM integration (Gemini + Groq) | ❌ Persistent database |
| ✅ Assumption detection & review workflow | ❌ Enterprise features |
| ✅ Context gap identification & bridging | ❌ Real-time collaboration |
| ✅ Grounded response generation | ❌ Streaming responses |
| ✅ Grounding insights audit panel | ❌ Payment / Billing |

---

## 2. System Architecture

### High-Level Architecture Diagram

The system follows a **client-server architecture** with a React frontend communicating with an Express.js backend. The backend handles task classification and response generation via LLM APIs with automatic failover.

```mermaid
graph TD
    User([User]) <--> Frontend["Frontend Client<br/>React 19 + Vite 8<br/>localhost:5173"]
    
    Frontend -->|"HTTP POST /grounding/analyze"| Backend["Backend Server<br/>Express + TypeScript<br/>localhost:3001"]
    Frontend -->|"HTTP POST /grounding/generate"| Backend
    
    Backend --> GeminiAPI["Gemini 1.5 Flash<br/>(Primary LLM)"]
    Backend --> GroqAPI["Groq Llama 3.3 70B<br/>(Fallback LLM)"]
    Backend --> MockEngine["Local Mock Engine<br/>(Final Fallback)"]
    
    subgraph "LLM Failover Chain"
        GeminiAPI -->|"On failure"| GroqAPI
        GroqAPI -->|"On failure"| MockEngine
    end
    
    style Frontend fill:#f0fdf8,stroke:#10a37f,stroke-width:2px
    style Backend fill:#eef0ff,stroke:#5b6fff,stroke-width:2px
    style GeminiAPI fill:#fff3cd,stroke:#b08800,stroke-width:1px
    style GroqAPI fill:#fff3cd,stroke:#b08800,stroke-width:1px
```

### Data Flow Sequence

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend (React)
    participant BE as Backend (Express)
    participant LLM as LLM API (Gemini/Groq)

    U->>FE: Types prompt & submits
    FE->>BE: POST /grounding/analyze {prompt}
    BE->>LLM: Classify task + extract assumptions
    LLM-->>BE: {taskType, risk, assumptions, missingContext}
    BE-->>FE: Analysis result (JSON)
    
    alt Low-Risk Task
        FE->>BE: POST /grounding/generate {prompt}
        BE->>LLM: Generate normal response
        LLM-->>BE: Response text
        BE-->>FE: {response, isGrounded: false}
        FE-->>U: Display normal response
    else High-Risk Task
        FE-->>U: Show Grounding Workspace overlay
        U->>FE: Reviews assumptions, fills context gaps
        FE->>BE: POST /grounding/generate {prompt, assumptions, contextAnswers}
        BE->>LLM: Generate grounded response with validated context
        LLM-->>BE: Grounded response text
        BE-->>FE: {response, isGrounded: true}
        FE-->>U: Display grounded response + insights badge
    end
```

---

## 3. Technology Stack

### Frontend

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | React | 19.2.6 | Component-based UI |
| Build Tool | Vite | 8.0.12 | Dev server & bundler |
| Language | TypeScript | 6.0.2 | Type safety |
| Styling | Tailwind CSS (CDN) | Latest | Utility-first CSS |
| Fonts | Google Fonts | — | Inter, JetBrains Mono |
| Icons | Material Symbols Outlined | — | Google icon library |

### Backend

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Runtime | Node.js | 20+ | Server runtime |
| Framework | Express | 4.19.2 | HTTP server & routing |
| Language | TypeScript | 5.4.5 | Type safety |
| Primary LLM | @google/generative-ai | 0.24.1 | Gemini 1.5 Flash |
| Fallback LLM | groq-sdk | 1.2.1 | Llama 3.3 70B Versatile |
| Environment | dotenv | 16.4.5 | Environment variable management |
| Dev Runner | ts-node-dev | 2.0.0 | Hot-reload development |

---

## 4. Project Directory Structure

```
ChatGPT prototype/
│
├── Problem statement.md              # Original problem definition
│
├── docs/
│   ├── mvp_architecture.md           # This document
│   ├── task.md                       # Development task tracking
│   └── walkthrough.md                # Implementation walkthrough
│
├── backend/
│   ├── .env                          # API keys (GEMINI_API_KEY, GROQ_API_KEY)
│   ├── .env.example                  # Environment template
│   ├── package.json                  # Dependencies & scripts
│   ├── tsconfig.json                 # TypeScript configuration
│   └── src/
│       ├── index.ts                  # Entry point — loads dotenv, starts server
│       ├── app.ts                    # Express app — CORS, JSON parsing, routes
│       ├── controllers/
│       │   ├── grounding.controller.ts   # Request handlers for analyze & generate
│       │   └── health.controller.ts      # Health check endpoint
│       ├── routes/
│       │   └── grounding.routes.ts       # POST /analyze, POST /generate
│       ├── middlewares/
│       │   └── error.middleware.ts        # Global error handler
│       └── services/
│           └── grounding.service.ts      # Core business logic — LLM calls & failover
│
└── frontend/
    ├── index.html                    # HTML shell — Tailwind CDN, fonts, theme config
    ├── package.json                  # Dependencies & scripts
    ├── vite.config.ts                # Vite configuration
    ├── tsconfig.json                 # TypeScript project references
    ├── public/
    │   ├── chatgpt-logo.png          # ChatGPT logo asset
    │   ├── favicon.svg               # Browser favicon
    │   └── icons.svg                 # Icon spritesheet
    └── src/
        ├── main.tsx                  # React mount point
        ├── App.tsx                   # Root component — state machine, pipeline logic
        ├── App.css                   # Minimal app styles
        ├── index.css                 # Animation system, scrollbar, global styles
        ├── types.ts                  # TypeScript interfaces (shared types)
        └── components/
            ├── Sidebar.tsx           # Navigation sidebar — sessions, settings
            ├── GroundingWorkspace.tsx # Two-column assumption review overlay
            └── InsightsDrawer.tsx    # Grounding audit insights drawer
```

---

## 5. Backend Architecture

### Entry Point Flow

```mermaid
graph LR
    A["index.ts<br/>dotenv/config"] --> B["app.ts<br/>Express instance"]
    B --> C["CORS + JSON middleware"]
    C --> D["GET /health"]
    C --> E["POST /grounding/analyze"]
    C --> F["POST /grounding/generate"]
    D & E & F --> G["Global Error Handler"]
```

### Service Layer — `GroundingService`

The `GroundingService` class is the core business logic layer. It encapsulates:

| Method | Purpose |
|--------|---------|
| `analyzePrompt(prompt)` | Classifies task risk, extracts assumptions & context gaps |
| `generateResponse(prompt, assumptions?, contextAnswers?)` | Generates final response (normal or grounded) |
| `analyzeWithGemini(prompt)` | Primary analysis via Gemini 1.5 Flash (JSON mode) |
| `analyzeWithGroq(prompt)` | Fallback analysis via Groq Llama 3.3 70B |
| `analyzeWithMockLocal(prompt)` | Last-resort local keyword-based classifier |
| `generateNormalResponse(prompt)` | Normal (ungrounded) LLM response |
| `generateGroundedResponse(prompt, assumptions, contextAnswers)` | Grounded response with validated context injected |

### System Prompt (Classification Engine)

The backend uses a carefully crafted system prompt that instructs the LLM to output structured JSON:

```json
{
  "taskType": "decision-making | planning | strategy | research | analysis | content-generation | greetings-and-summaries",
  "risk": "high | low",
  "assumptions": ["extracted assumption 1", "extracted assumption 2"],
  "missingContext": ["what is your budget?", "what region are you targeting?"]
}
```

**Classification Rules:**
- **High-Risk**: Complex, strategic, decision-heavy tasks; professional emails/reports that rely on implicit placeholders or organizational context
- **Low-Risk**: Basic greetings, simple factual questions, direct translations, summarization of provided text

---

## 6. Frontend Architecture

### Application Shell

The frontend uses a **single-page application** architecture with React 19 and Vite 8:

```mermaid
graph TD
    HTML["index.html<br/>Tailwind CDN + Theme Config"] --> Main["main.tsx<br/>React DOM Mount"]
    Main --> App["App.tsx<br/>Root Component + State Machine"]
    App --> Sidebar["Sidebar.tsx"]
    App --> ChatStream["Chat Message Stream"]
    App --> InputBar["Input Capsule Bar"]
    App --> GW["GroundingWorkspace.tsx<br/>(Conditional Overlay)"]
    App --> ID["InsightsDrawer.tsx<br/>(Conditional Drawer)"]
```

### Tailwind Theme Configuration

Custom color tokens are registered directly in the HTML shell via `tailwind.config`:

| Token | Hex | Usage |
|-------|-----|-------|
| `chatgpt-green` | `#10a37f` | Primary accent, badges, confidence bars |
| `primary` | `#000000` | Heading text, strong labels |
| `surface` | `#ffffff` | Card backgrounds |
| `background` | `#f9f9f9` | Page background |
| `on-surface-variant` | `#4c4546` | Secondary text |
| `outline` | `#e5e5e5` | Borders, dividers |
| `outline-variant` | `#cfc4c5` | Subtle borders |
| `error` | `#ba1a1a` | Error states, warnings |

---

## 7. State Management

### State Machine Model

The application operates as a **finite state machine** with 5 discrete states:

```mermaid
stateDiagram-v2
    [*] --> IDLE : App loads

    IDLE --> CLASSIFYING : User submits prompt
    
    CLASSIFYING --> GENERATING : Low-risk task detected
    CLASSIFYING --> GROUNDING_REVIEW : High-risk task detected
    CLASSIFYING --> GENERATING : Backend error (fallback bypass)
    
    GROUNDING_REVIEW --> GENERATING : User clicks "Generate Grounded Response"
    GROUNDING_REVIEW --> GENERATING : User clicks "Skip & Bypass"
    
    GENERATING --> COMPLETED : Response received
    GENERATING --> COMPLETED : Error (shows error message)
    
    COMPLETED --> CLASSIFYING : User submits next prompt
    COMPLETED --> IDLE : User creates new chat
```

### Core State Interfaces

```typescript
// Chat session container
interface ChatSession {
  sessionId: string;
  title: string;
  messages: Message[];
  currentState: 'IDLE' | 'CLASSIFYING' | 'GROUNDING_REVIEW' | 'GENERATING' | 'COMPLETED';
}

// Individual message in the conversation
interface Message {
  messageId: string;
  role: 'user' | 'assistant';
  content: string;
  isGrounded: boolean;
  groundingInsights?: GroundingInsights;
}

// Active grounding review session data
interface GroundingReviewState {
  originalPrompt: string;
  taskCategory: string;
  assumptions: AssumptionItem[];
  missingContextGaps: ContextGapItem[];
}

// Individual assumption card state
interface AssumptionItem {
  id: string;
  text: string;
  status: 'pending' | 'accepted' | 'edited' | 'deleted';
  originalText?: string;
}

// Individual context gap input state
interface ContextGapItem {
  id: string;
  question: string;
  userInput: string;
  isRequired: boolean;
}

// Post-generation grounding audit data
interface GroundingInsights {
  originalAssumptionsCount: number;
  validatedAssumptions: string[];
  contextAnswersMerged: string[];
  metadata: {
    latencyMs: number;
    tokensSaved: number;
  };
}
```

### Key State Variables in App.tsx

| Variable | Type | Purpose |
|----------|------|---------|
| `sessions` | `ChatSession[]` | All chat sessions in memory |
| `activeSessionId` | `string` | Currently selected session |
| `simulationMode` | `boolean` | Toggle grounding classifier on/off |
| `artificialLatency` | `number` | Configurable UI latency (ms) |
| `appState` | State enum | Current FSM state |
| `reviewState` | `GroundingReviewState \| null` | Active grounding review data |
| `activeInsights` | `GroundingInsights \| null` | Active insights drawer data |

---

## 8. API Specification

### Base URL

```
http://localhost:3001
```

### Endpoints

#### `GET /health`
Health check endpoint.

**Response**: `200 OK`
```json
{ "status": "ok", "timestamp": "2026-06-01T00:00:00.000Z" }
```

---

#### `POST /grounding/analyze`
Classifies a user prompt, extracts assumptions, and identifies missing context gaps.

**Request Body**:
```json
{
  "prompt": "Develop a market entry strategy for launching a boutique organic skincare brand in Tokyo."
}
```

**Response** (`200 OK`):
```json
{
  "taskType": "strategy",
  "risk": "high",
  "assumptions": [
    "There is existing demand for organic skincare in Tokyo",
    "The brand has sufficient capital for international market entry",
    "Regulatory requirements for skincare products in Japan are manageable"
  ],
  "missingContext": [
    "What is the initial launch budget?",
    "What is the target customer age demographic?",
    "Are there existing distribution partnerships in Japan?"
  ]
}
```

**Error Response** (`400`):
```json
{ "error": "Field \"prompt\" is required" }
```

---

#### `POST /grounding/generate`
Generates an AI response. If `assumptions` and `contextAnswers` are provided, generates a **grounded** response using validated context. Otherwise, generates a **normal** response.

**Request Body (Normal)**:
```json
{
  "prompt": "Hello, how are you?"
}
```

**Request Body (Grounded)**:
```json
{
  "prompt": "Develop a market entry strategy for launching a boutique organic skincare brand in Tokyo.",
  "assumptions": [
    "There is existing demand for organic skincare in Tokyo",
    "The brand has $500K initial budget"
  ],
  "contextAnswers": [
    {
      "question": "What is the initial launch budget?",
      "answer": "$500,000 USD"
    },
    {
      "question": "What is the target customer age demographic?",
      "answer": "Women aged 25-40"
    }
  ]
}
```

**Response** (`200 OK`):
```json
{
  "response": "## Market Entry Strategy for Tokyo...\n\n...",
  "isGrounded": true
}
```

---

## 9. Component Hierarchy

### Visual Component Tree

```
App (Root — State Machine Controller)
│
├── Sidebar
│   ├── Brand Header (ChatGPT logo + title)
│   ├── New Chat Button
│   ├── Session History List
│   │   └── Session Item (active/inactive states)
│   └── Engine Settings Tray
│       ├── Grounding Classifier Toggle
│       └── Latency Boost Slider
│
├── Main Content Area
│   ├── Top Navigation Bar
│   │   ├── Model Title ("ChatGPT")
│   │   ├── Engine Status Badge (Failover Engine v4)
│   │   ├── State Indicator (Online / Classifying / Generating / Review active)
│   │   └── User Actions (Share, Profile)
│   │
│   ├── Chat Message Stream
│   │   ├── Welcome State (logo, heading, suggestion chips)
│   │   └── Message List
│   │       ├── User Message Bubble (right-aligned, gray bg)
│   │       └── AI Message Bubble (left-aligned, white bg)
│   │           ├── Markdown Renderer (headings, bold, bullets)
│   │           └── Grounded Badge → opens InsightsDrawer
│   │
│   ├── Typing Indicator (three animated dots)
│   │
│   └── Input Capsule Bar
│       ├── New Chat Button (+)
│       ├── Text Input (with placeholder based on mode)
│       ├── Microphone Button
│       └── Send Button (arrow_upward, filled)
│
├── GroundingWorkspace (Conditional modal overlay)
│   ├── Header (shield icon + category badge)
│   ├── Split Columns
│   │   ├── Left: Detected Assumptions
│   │   │   ├── Assumption Cards (icon, textarea, delete/restore)
│   │   │   └── Add Custom Assumption Input
│   │   └── Right: Missing Context Gaps
│   │       ├── Context Gap Fields (label + input)
│   │       └── Pro Tip Box
│   └── Footer (Skip & Bypass | Generate Grounded Response)
│
└── InsightsDrawer (Conditional right panel)
    ├── Header (logo + title + close)
    ├── Confidence Bar (gradient, animated)
    ├── Stats Grid (2x2 bento cards)
    │   ├── Assumptions Reviewed
    │   ├── Assumptions Discarded
    │   └── Context Gaps Answered
    ├── Alignment Audit Observations
    │   ├── Anchored Assumption Cards (green check)
    │   ├── Injected Context Cards (purple star)
    │   └── Direct Bypass Warning (if applicable)
    └── Footer (Export PDF | Apply Findings)
```

---

## 10. User Flow & Screen Transitions

### Complete User Journey

```mermaid
graph TD
    S1["🏠 Welcome Screen<br/>Logo + suggestion chips"] -->|"User types & submits prompt"| S2
    
    S2["⏳ Classification Phase<br/>Typing dots + status text"] -->|"Low-risk detected<br/>(greetings, factual)"| S3A
    S2 -->|"High-risk detected<br/>(strategy, planning, emails)"| S3B
    
    S3A["💬 Normal Response<br/>Standard AI message bubble"] --> S5
    
    S3B["📋 Grounding Workspace<br/>Two-column modal overlay"]
    S3B -->|"User edits assumptions<br/>fills context gaps"| S3B
    S3B -->|"Click 'Generate Grounded Response'"| S4A
    S3B -->|"Click 'Skip & Bypass'"| S3A
    
    S4A["⚡ Grounded Generation<br/>Typing indicator active"] --> S4B
    
    S4B["✅ Grounded Response<br/>Green border + 'Grounded' badge"] --> S5
    S4B -->|"Click 'Grounded' badge"| S6
    
    S5["🔄 Ready for Next Prompt<br/>Input bar active"]
    S5 -->|"User submits next prompt"| S2
    
    S6["📊 Insights Drawer<br/>Confidence bar, stats, audit log"]
    S6 -->|"Close"| S5

    style S1 fill:#f5f5f5,stroke:#e5e5e5
    style S3B fill:#f0fdf8,stroke:#10a37f
    style S4B fill:#f0fdf8,stroke:#10a37f
    style S6 fill:#eef0ff,stroke:#5b6fff
```

### Example Scenarios

| User Input | Risk Classification | Flow |
|-----------|---------------------|------|
| "Hello!" | `low` | Direct normal response |
| "What is the capital of France?" | `low` | Direct normal response |
| "Draft a quarterly budget plan for our engineering team" | `high` | Grounding workspace → review → grounded response |
| "Generate an email to my manager about the annual report" | `high` | Grounding workspace (detects [Manager Name], [Year] placeholders) |
| "Develop a market entry strategy for Tokyo" | `high` | Grounding workspace → assumptions + context gaps |

---

## 11. LLM Failover Strategy

The backend implements a **three-tier failover chain** for both analysis and generation:

```mermaid
graph TD
    Request["Incoming Request"] --> Gemini{"Gemini 1.5 Flash<br/>(Primary)"}
    
    Gemini -->|"✅ Success"| Return["Return Response"]
    Gemini -->|"❌ API Error / Rate Limit"| Groq{"Groq Llama 3.3 70B<br/>(Fallback)"}
    
    Groq -->|"✅ Success"| Return
    Groq -->|"❌ API Error"| Mock{"Local Mock Engine<br/>(Last Resort)"}
    
    Mock -->|"Always succeeds"| Return

    style Gemini fill:#fff3cd,stroke:#b08800
    style Groq fill:#fff3cd,stroke:#b08800
    style Mock fill:#f5f5f5,stroke:#999
```

| Tier | Provider | Model | Response Format | When Used |
|------|----------|-------|-----------------|-----------|
| 1 (Primary) | Google Gemini | gemini-1.5-flash | `responseMimeType: 'application/json'` | API key configured & valid |
| 2 (Fallback) | Groq | llama-3.3-70b-versatile | `response_format: { type: 'json_object' }` | Gemini fails or unconfigured |
| 3 (Mock) | Local | Keyword matcher | Hardcoded JSON responses | Both APIs fail or unconfigured |

### Environment Configuration

```env
# backend/.env
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
PORT=3001
NODE_ENV=development
```

---

## 12. Database Schema (Future Production)

While the MVP runs purely in-memory (client-side state), a production implementation requires a relational schema for grounding compliance tracking, user validation metrics, and audit trails.

```mermaid
erDiagram
    USERS {
        uuid id PK
        varchar email
        timestamp created_at
    }
    SESSIONS {
        uuid id PK
        uuid user_id FK
        varchar title
        timestamp created_at
    }
    MESSAGES {
        uuid id PK
        uuid session_id FK
        varchar role
        text content
        boolean is_grounded
        timestamp created_at
    }
    GROUNDING_ATTEMPTS {
        uuid id PK
        uuid message_id FK "References user prompt message"
        varchar detected_task_type
        varchar risk_level
        decimal confidence_score
        timestamp created_at
    }
    ASSUMPTIONS {
        uuid id PK
        uuid grounding_attempt_id FK
        text raw_detected_text
        text user_edited_text
        varchar resolution_status "accepted / edited / deleted / added"
        integer display_order
    }
    CONTEXT_GAPS {
        uuid id PK
        uuid grounding_attempt_id FK
        text gap_question
        text user_provided_answer
        boolean was_answered
    }

    USERS ||--o{ SESSIONS : starts
    SESSIONS ||--o{ MESSAGES : contains
    MESSAGES ||--o| GROUNDING_ATTEMPTS : triggers
    GROUNDING_ATTEMPTS ||--o{ ASSUMPTIONS : detects
    GROUNDING_ATTEMPTS ||--o{ CONTEXT_GAPS : requests
```

---

## 13. Phased Development Plan

Development was executed across four sequential phases:

```mermaid
gantt
    title MVP Development Phases
    dateFormat  YYYY-MM-DD
    
    section Phase 1 — Foundation
    Backend scaffolding (Express + TypeScript)         :done, p1a, 2026-05-31, 1d
    Frontend scaffolding (React + Vite)                :done, p1b, 2026-05-31, 1d
    Core type definitions & state models               :done, p1c, 2026-05-31, 1d
    
    section Phase 2 — Backend Intelligence
    GroundingService with Gemini integration            :done, p2a, 2026-05-31, 1d
    Groq fallback + local mock fallback                :done, p2b, 2026-05-31, 1d
    POST /grounding/analyze endpoint                   :done, p2c, 2026-05-31, 1d
    POST /grounding/generate endpoint                  :done, p2d, 2026-05-31, 1d
    
    section Phase 3 — Frontend UI
    Chat interface + message rendering                 :done, p3a, 2026-06-01, 1d
    GroundingWorkspace (two-column review)              :done, p3b, 2026-06-01, 1d
    InsightsDrawer (audit panel)                       :done, p3c, 2026-06-01, 1d
    Sidebar + session management                       :done, p3d, 2026-06-01, 1d
    
    section Phase 4 — UI Polish
    ChatGPT logo integration                           :done, p4a, 2026-06-01, 1d
    Animation system (stagger, float, bounce)           :done, p4b, 2026-06-01, 1d
    Premium color palette refinement                   :done, p4c, 2026-06-01, 1d
    Typing indicator + micro-interactions               :done, p4d, 2026-06-01, 1d
```

### Phase Descriptions

#### Phase 1: Foundation
Established the monorepo structure with separate `backend/` and `frontend/` directories. Set up Express with TypeScript for the backend and React 19 + Vite 8 for the frontend. Defined all shared TypeScript interfaces.

#### Phase 2: Backend Intelligence
Implemented the `GroundingService` class with the three-tier LLM failover strategy (Gemini → Groq → Mock). Created the classification system prompt that returns structured JSON. Built two API endpoints: `/grounding/analyze` for task classification and `/grounding/generate` for response generation (both normal and grounded).

#### Phase 3: Frontend UI
Built the complete ChatGPT-style interface with Tailwind CSS. Implemented the state machine controller in `App.tsx`, the sidebar with session management, the two-column `GroundingWorkspace` overlay for assumption review, and the `InsightsDrawer` audit panel with confidence metrics.

#### Phase 4: UI Polish
Integrated the official ChatGPT logo throughout the interface. Added a comprehensive CSS animation system with staggered entrances, typing indicators, hover-lift effects, press feedback, and shimmer loading bars. Refined the color palette to an Apple-inspired system for premium visual quality.

---

## Running the Application

### Prerequisites
- Node.js 20+
- Gemini API key (primary) and/or Groq API key (fallback)

### Backend
```bash
cd backend
cp .env.example .env        # Add your API keys
npm install
npm run dev                  # Starts on http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install
npm run dev                  # Starts on http://localhost:5173
```

### Production Build
```bash
cd frontend
npm run build                # Outputs to frontend/dist/
```
