# ChatGPT Grounding Layer — MVP Prototype

An AI Grounding Layer that intercepts high-risk prompts, extracts implicit assumptions, identifies missing context, and lets users validate before generating responses — reducing overtrust in AI outputs.

---

## Quick Start

### Prerequisites
- **Node.js** 20+
- **Gemini API Key** (primary) and/or **Groq API Key** (fallback)

### 1. Backend

```bash
cd backend
cp .env.example .env     # Add your API keys
npm install
npm run dev              # → http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev              # → http://localhost:5173
```

---

## Project Structure

```
├── backend/                  # Express + TypeScript API server
│   └── src/
│       ├── controllers/      # Request handlers
│       ├── services/         # Core business logic (LLM calls)
│       ├── routes/           # API route definitions
│       ├── middlewares/       # Error handling
│       ├── app.ts            # Express app configuration
│       └── index.ts          # Server entry point
│
├── frontend/                 # React 19 + Vite 8 client
│   ├── public/               # Static assets (logo, favicon)
│   └── src/
│       ├── components/       # UI components
│       │   ├── Sidebar.tsx
│       │   ├── GroundingWorkspace.tsx
│       │   └── InsightsDrawer.tsx
│       ├── App.tsx           # Root component + state machine
│       ├── types.ts          # Shared TypeScript interfaces
│       └── index.css         # Animation system + global styles
│
└── docs/                     # Project documentation
    ├── problem_statement.md  # Original problem definition
    ├── mvp_architecture.md   # Full architecture & design spec
    ├── task.md               # Development task tracker
    └── walkthrough.md        # Implementation walkthrough
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, TypeScript, Tailwind CSS |
| Backend | Express 4, TypeScript, Node.js |
| Primary LLM | Google Gemini 1.5 Flash |
| Fallback LLM | Groq Llama 3.3 70B |
| Icons | Google Material Symbols |
| Fonts | Inter, JetBrains Mono |

---

## Core Features

| # | Feature | Description |
|---|---------|-------------|
| 1 | Smart Task Detection | Auto-classifies prompts as high-risk or low-risk |
| 2 | Assumption Extraction | Identifies implicit/explicit assumptions from prompts |
| 3 | Missing Context Detection | Surfaces information gaps affecting response quality |
| 4 | Interactive Review | Users accept, edit, delete, or add assumptions |
| 5 | Grounded Generation | Responses built on validated assumptions only |
| 6 | Insights Audit | Post-generation confidence metrics & audit trail |
| 7 | LLM Failover | Gemini → Groq → Local Mock (auto-fallback) |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/grounding/analyze` | Classify prompt + extract assumptions & gaps |
| `POST` | `/grounding/generate` | Generate response (normal or grounded) |

---

## Documentation

- [Problem Statement](docs/problem_statement.md) — Why this product exists
- [MVP Architecture](docs/mvp_architecture.md) — Full architecture, state machine, API spec, diagrams
- [Walkthrough](docs/walkthrough.md) — What was built and how
- [Tasks](docs/task.md) — Development task tracker

---

## License

MIT
