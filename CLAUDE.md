# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

University survey webapp comparing human vs AI ability to find and fix software vulnerabilities. Flow: **Token Auth → Privacy Policy & Consent → Preliminary Survey → Scenarios (code editing + testing) → Thank You**.

Each scenario presents a Python file with a security vulnerability and its test suite. Users are assigned to groups (A, B, C) which determine scenario order and whether AI assistance is allowed per scenario (`HUMAN_ONLY` or `WITH_AI` modality).

## Commands

```bash
bun run dev        # Start Vite dev server on port 3000 (0.0.0.0)
bun run build      # Production build to /dist
bun run preview    # Preview production build
bun run lint       # TypeScript type-check (tsc --noEmit)
bun run clean      # Remove /dist
bun install        # Install dependencies
```

No test runner is configured.

## Architecture

**Frontend:** React 19 + TypeScript + Vite. **Backend:** Supabase (PostgreSQL + RLS).

### Routing (`src/App.tsx`)

| Route | Guard | Page |
|---|---|---|
| `/login` | None | Token entry (6-char alphanumeric) |
| `/privacy` | `ProtectedRoute` (token) | Privacy policy & informed consent |
| `/survey` | `ProtectedRoute` (token + privacy) | Preliminary survey |
| `/scenario/:id` | `ProtectedRoute` (token + privacy + survey) | Code editor with run/test/submit |
| `/thank-you` | `ProtectedRoute` (token + privacy + survey + all 4 scenarios) | Completion |
| `/`, `*` | — | Redirect to `/login` |

### State Management (`src/store/useAppStore.ts`)

Zustand store persisted to localStorage under key `"survey-storage"`. Tracks: `token`, `userId`, `userGroup` (A/B/C), `privacyAccepted`, `surveyCompleted`, `surveyAnswers`, `completedScenarios`, `scenarioStartTimes`. The `ProtectedRoute` component reads this store to enforce linear flow.

### Backend — Supabase (`src/supabase/`)

The mock API has been fully replaced by a real Supabase PostgreSQL backend. The `src/supabase/` module is the single integration point.

| File | Purpose |
|---|---|
| `client.ts` | Supabase client initialization (reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env`) |
| `auth.ts` | `validateToken()` — checks `users.login_code` |
| `survey.ts` | `getQuestions()`, `submitSurvey()` |
| `scenarios.ts` | `getScenario()`, `submitScenario()`, `getGroupScenarios()` |
| `types.ts` | Database type definitions |
| `init-db.sql` | Full SQL schema for database setup |
| `index.ts` | Barrel exports |

**Database tables:** `users`, `survey_questions`, `user_survey_answers`, `scenarios`, `user_scenario_submits`, `scenario_groups`. RLS enabled with permissive anon policies.

### Python Execution — Pyodide (`src/pyodide/`)

Python code runs **in the browser** via Pyodide (v0.27.5, loaded from CDN). No backend Python execution.

| File | Purpose |
|---|---|
| `usePyodide.ts` | Hook exposing `runCode()` and `runTests()` |
| `helpers.ts` | Pytest output parsing (extracts PASS/FAIL per test) |
| `pyodide.d.ts` | Type definitions |

The hook loads Pyodide, installs `pytest` + `sqlite3` via micropip, stubs out `subprocess`, and manages a virtual filesystem at `/home/pyodide/work` for test execution.

### Scenario Content (`src/scenarios/`)

6 scenario templates (T1–T6), each containing:
- `scenario.py` — Python file with a security vulnerability
- `test.py` — Pytest suite (includes tests that detect the vulnerability)
- `README.md` — Instructions for the user

Users complete 4 scenarios per session. The `scenario_groups` table maps user groups to specific scenarios and modalities.

### Key Components

| Component | File | Purpose |
|---|---|---|
| `Layout` | `components/Layout.tsx` | Header + router outlet wrapper |
| `ProtectedRoute` | `components/ProtectedRoute.tsx` | Route guards (`requirePrivacy`, `requireSurvey`, `requireScenario` props) |
| `Button` | `components/Button.tsx` | Reusable button (variants: primary, secondary, danger, ghost) |
| `EditorWrapper` | `components/EditorWrapper.tsx` | Monaco Editor wrapper (Python, dark theme, `readOnly` prop) |

### Page Details

**Login** — Token input with uppercase auto-format, validates against Supabase, fetches user group. Redirects to `/privacy`.

**PrivacyPolicy** — Displays data collection details, usage, storage, security measures, and participant rights (access, deletion, withdrawal). User must check a consent checkbox before proceeding. Redirects to `/survey` if already accepted.

**Survey** — Loads questions from Supabase. Supports `SINGLE_CHOICE` (radio) and `TEXT` (textarea) types. Progress tracking, submit-all-at-once.

**Scenario** — 3-panel layout:
1. Editable Monaco editor (scenario code) with AI/Human-Only badge
2. Tabbed read-only panel (test code + README)
3. Output panel (stdout/stderr + parsed test results)

Bottom bar: scenario progress, 15-minute countdown timer (red under 60s, auto-submit on timeout), Run Tests button, Submit button.

**ThankYou** — Completion message with logout button.

### Key Conventions

- **Path alias:** `@/*` maps to `src/*` (configured in both `tsconfig.json` and `vite.config.ts`)
- **Styling:** Tailwind CSS v4 via `@tailwindcss/vite` plugin. Dark theme (zinc-950 backgrounds, indigo-600 accents). Utility helper `cn()` in `src/utils/cn.ts` (clsx + tailwind-merge).
- **Code editor:** Monaco Editor (`@monaco-editor/react`) with Python syntax, `vs-dark` theme, JetBrains Mono / Fira Code font
- **Animations:** `motion` (Framer Motion)
- **Icons:** `lucide-react`
- **Types:** Centralized in `src/types/index.ts` (`ScenarioData`, `RunResponse`, `TestResponse`, `AppState`)
- **Environment variables:** Supabase credentials are loaded from `.env` via Vite's `import.meta.env` (prefixed with `VITE_`). Copy `.env.example` to `.env` and fill in your project's values.
