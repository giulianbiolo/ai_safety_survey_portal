# AI Safety Survey Portal

A university research web application that measures and compares human vs AI-assisted ability to detect and fix software security vulnerabilities. Participants authenticate with a token, complete a preliminary survey, and then work through a series of timed code-editing scenarios — each presenting a Python file containing a real security flaw.

## Research Design

Participants are assigned to one of three groups (A, B, C). Each group completes 4 out of 6 available scenarios in a specific order. For each scenario, the group assignment determines the **modality**:

- **HUMAN_ONLY** — the participant works without any AI assistance
- **WITH_AI** — AI assistance is permitted

This between-subjects design allows the study to compare vulnerability detection and remediation performance across conditions.

## User Flow

1. **Token Authentication** — enter a 6-character alphanumeric code (validated against the database)
2. **Privacy Policy & Consent** — review what data is collected, how it is used, storage and security measures, and participant rights (access, deletion, withdrawal). Must accept before continuing.
3. **Preliminary Survey** — single-choice and free-text questions about experience and background
4. **Scenarios (×4)** — for each scenario:
   - Read the instructions and review the test suite
   - Edit the Python source code in a Monaco editor to fix the vulnerability
   - Run tests in-browser to verify the fix
   - Submit before the 15-minute countdown expires (auto-submits on timeout)
5. **Thank You** — completion screen with logout

All navigation is enforced linearly via route guards — users cannot skip steps or revisit completed scenarios.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS v4 (dark theme) |
| Code Editor | Monaco Editor (`@monaco-editor/react`) |
| Python Execution | Pyodide v0.27.5 (WASM, runs entirely in-browser) |
| Backend / Database | Supabase (PostgreSQL + Row Level Security) |
| State Management | Zustand (persisted to localStorage) |
| Animations | Motion (Framer Motion) |
| Icons | Lucide React |

## Project Structure

```
src/
├── App.tsx                  # Router and route definitions
├── main.tsx                 # Entry point
├── components/
│   ├── Layout.tsx           # Header + page wrapper
│   ├── ProtectedRoute.tsx   # Route guards (token, privacy, survey, scenario)
│   ├── Button.tsx           # Reusable button (primary/secondary/danger/ghost)
│   └── EditorWrapper.tsx    # Monaco Editor wrapper (Python, dark theme)
├── pages/
│   ├── Login.tsx            # Token entry
│   ├── PrivacyPolicy.tsx    # Privacy policy & informed consent
│   ├── Survey.tsx           # Preliminary questionnaire
│   ├── Scenario.tsx         # Code editor + tests + output (3-panel layout)
│   └── ThankYou.tsx         # Completion screen
├── store/
│   └── useAppStore.ts       # Zustand store (token, group, progress)
├── supabase/
│   ├── client.ts            # Supabase client init
│   ├── auth.ts              # Token validation
│   ├── survey.ts            # Survey questions & submission
│   ├── scenarios.ts         # Scenario data & submission
│   ├── types.ts             # Database type definitions
│   └── init-db.sql          # Full SQL schema
├── pyodide/
│   ├── usePyodide.ts        # Hook: runCode() and runTests()
│   └── helpers.ts           # Pytest output parser
├── types/
│   └── index.ts             # Shared TypeScript types
└── utils/
    └── cn.ts                # Tailwind class merge utility (clsx + tailwind-merge)
```

## Architecture Overview

### In-Browser Python Execution

Python code runs entirely client-side via **Pyodide** (CPython compiled to WebAssembly). The `usePyodide` hook loads the runtime, installs `pytest` and `sqlite3` through micropip, stubs out `subprocess`, and manages a virtual filesystem at `/home/pyodide/work`. Users can run their code and execute the test suite without any server-side execution.

### Backend

**Supabase** provides the PostgreSQL database with Row Level Security. The database stores users, survey questions/answers, scenario definitions, and submission data. All client-database communication uses the Supabase JS SDK with the public anon key. Credentials are loaded from environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) — see `.env.example`.

**Database tables:** `users`, `survey_questions`, `user_survey_answers`, `scenarios`, `user_scenario_submits`, `scenario_groups`

### State & Routing

A **Zustand** store (persisted to localStorage) tracks authentication state, user group, privacy consent, survey completion, and scenario progress. The `ProtectedRoute` component reads this store to enforce the linear flow — redirecting users who attempt to access pages out of order.

## Development

### Prerequisites

- [Bun](https://bun.sh/) (package manager and runtime)
- A Supabase project with the schema from `src/supabase/init-db.sql` applied

### Setup

1. Copy the example environment file and fill in your Supabase credentials:

```bash
cp .env.example .env
```

2. Edit `.env` with your project's values:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Commands

```bash
bun install        # Install dependencies
bun run dev        # Start dev server (port 3000, 0.0.0.0)
bun run build      # Production build → dist/
bun run preview    # Preview production build
bun run lint       # TypeScript type-check (tsc --noEmit)
bun run clean      # Remove dist/
```

## License

University project — not licensed for external use.
