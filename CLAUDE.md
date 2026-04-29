# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

University survey webapp comparing human vs AI ability to find and fix software vulnerabilities. Surveys (preliminary and post-study) are handled externally by **LimeSurvey**. This app handles only the scenario portion.

**Current flow:** LimeSurvey (preliminary survey) → redirect to this app → **Token Auth → Disclaimer → Scenarios (code editing + testing) → Thank You (close page)** → return to LimeSurvey (post-study survey).

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
| `/disclaimer/:phase` | `ProtectedRoute` (token) | Phase disclaimer (test / production) |
| `/scenario/:id` | `ProtectedRoute` (token + test disclaimer) | Code editor with run/test/submit |
| `/thank-you` | `ProtectedRoute` (token + all scenarios) | Completion — prompts user to close page |
| `/`, `*` | — | Redirect to `/login` |

**Disabled routes** (commented out in `App.tsx`, handled by LimeSurvey): `/privacy`, `/survey`, `/post-survey`.

### State Management (`src/store/useAppStore.ts`)

Zustand store persisted to localStorage under key `"survey-storage"`. Tracks: `token`, `userId`, `userGroup` (A/B/C), `privacyAccepted`, `surveyCompleted`, `surveyAnswers`, `completedScenarios`, `scenarioStartTimes`, `postSurveyCompleted`. The `ProtectedRoute` component reads this store to enforce linear flow. Note: `privacyAccepted`, `surveyCompleted`, `surveyAnswers`, and `postSurveyCompleted` are currently unused (surveys moved to LimeSurvey) but kept for potential re-enablement.

### Backend — Supabase (`src/supabase/`)

The mock API has been fully replaced by a real Supabase PostgreSQL backend. The `src/supabase/` module is the single integration point.

| File | Purpose |
|---|---|
| `client.ts` | Supabase client initialization (reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env`) |
| `auth.ts` | `validateToken()` — checks `users.login_code` |
| `survey.ts` | `getQuestions(kind)`, `submitSurvey()` — kind is `"PRELIMINARY"` or `"POSTSURVEY"` |
| `scenarios.ts` | `getScenario()`, `submitScenario()`, `getGroupScenarios()`, `recordTestRun()`, `markSurveyCompleted()` |
| `types.ts` | Database type definitions |
| `init-db.sql` | Full SQL schema for database setup |
| `index.ts` | Barrel exports |

**Database tables:** `users`, `survey_questions`, `user_survey_answers`, `scenarios`, `user_scenario_submits`, `user_scenario_test_history`, `scenario_groups`. RLS enabled with permissive anon policies.

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
| `ProtectedRoute` | `components/ProtectedRoute.tsx` | Route guards (`requireTestDisclaimer`, `requireAllScenarios` active; `requirePrivacy`, `requireSurvey`, `requirePostSurvey` commented out) |
| `SurveyPage` | `components/SurveyPage.tsx` | Shared survey page (currently unused — surveys moved to LimeSurvey). Used by both `Survey` and `PostSurvey` pages via props (`kind`, `title`, `onSubmit`, etc.) |
| `Button` | `components/Button.tsx` | Reusable button (variants: primary, secondary, danger, ghost) |
| `EditorWrapper` | `components/EditorWrapper.tsx` | Monaco Editor wrapper (Python, dark theme, `readOnly` prop) |
| `AiInfoDialog` | `components/AiInfoDialog.tsx` | Modal shown on WITH_AI scenario load with AI tool name + copyable default prompt. Reopened via the clickable "With AI" badge. |
| `AiInstructionsPanel` | `components/AiInstructionsPanel.tsx` | Inline panel version of AI instructions, rendered inside the reference panel's "AI Instructions" tab |
| `ConfirmSubmitDialog` | `components/ConfirmSubmitDialog.tsx` | Confirmation modal shown before scenario submission (warns action is irreversible). Not shown on timeout auto-submit. |
| `ConfirmResetDialog` | `components/ConfirmResetDialog.tsx` | Confirmation modal shown before resetting the editor code back to `scenario.initialCode`. |

### Page Details

**Login** — Token input with uppercase auto-format, validates against Supabase, fetches user group. Redirects to `/disclaimer/test`.

**PrivacyPolicy** — *Currently disabled (route commented out).* Displays data collection details, usage, storage, security measures, and participant rights.

**Survey / PostSurvey** — *Currently disabled (routes commented out).* Thin wrappers around `SurveyPage` component.

**Scenario** — 3-panel horizontally resizable layout (`react-resizable-panels`; default 40/35/25%, each min 400px):
1. Editable Monaco editor (scenario code) with AI/Human-Only badge (clickable on WITH_AI scenarios to reopen AI instructions dialog) and a Reset button (right-aligned) that opens `ConfirmResetDialog` and restores `scenario.initialCode` on confirm
2. Tabbed read-only panel (test code + README + "AI Instructions" tab when `aiAllowed`)
3. Output panel (stdout/stderr + parsed test results)

The editable panel header and the test tab label use a local `extractFilename(content, fallback)` helper (in `src/pages/Scenario.tsx`): if the file's first line is a comment matching `# <name>.py`, that filename is used as the title; otherwise it falls back to `scenario_${id}.py` / `test_${id}.py`. The editable header updates live as the user types.

On WITH_AI scenarios, an `AiInfoDialog` modal auto-opens on load showing which AI tool to use and a copyable default prompt. The AI tool name, link, and prompt text are hardcoded in `src/constants/ai.ts` (`AI_TOOL_NAME`, `AI_TOOL_URL`, `AI_DEFAULT_PROMPT`). The tool name is rendered as a clickable external link (opens in a new tab) in both `AiInfoDialog` and `AiInstructionsPanel`.

Bottom bar: scenario progress, 20-minute countdown timer (red under 60s, auto-submit on timeout), Run Tests button, Submit button (opens `ConfirmSubmitDialog` before submitting; timeout auto-submit bypasses the confirmation). Each test run records a snapshot to `user_scenario_test_history` via `recordTestRun()`, but is deduplicated client-side: a `lastRecordedCodeRef` ref skips the insert if the code hasn't changed since the last recorded run. After all production scenarios, navigates to `/thank-you`. **Important:** both `handleSubmit` and `handleTimeout` call `markSurveyCompleted(userId)` (sets `users.completed_survey = true` in Supabase) when the next destination is `/thank-you`, i.e. when the last production scenario is submitted. This flag prevents re-login (`Login.tsx` checks it via `validateToken`). It is set in `src/pages/Scenario.tsx`, NOT on the Thank You page.

**ThankYou** — Completion message with a prominent amber "Action Required" banner instructing the user to close the page and return to LimeSurvey for the post-study questionnaire. Emphasises the study is not finished until the final survey is submitted. Attempts `window.close()`; on failure (e.g. Chrome) calls `logout()` and shows a fallback message with an `ExternalLink` icon.

### Key Conventions

- **Path alias:** `@/*` maps to `src/*` (configured in both `tsconfig.json` and `vite.config.ts`)
- **Styling:** Tailwind CSS v4 via `@tailwindcss/vite` plugin. Dark theme (zinc-950 backgrounds, indigo-600 accents). Utility helper `cn()` in `src/utils/cn.ts` (clsx + tailwind-merge).
- **Code editor:** Monaco Editor (`@monaco-editor/react`) with Python syntax, `vs-dark` theme, JetBrains Mono / Fira Code font
- **Resizable panels:** `react-resizable-panels` (v4 API — exports are `Group`, `Panel`, `Separator`)
- **Animations:** `motion/react` (Framer Motion v12+)
- **Icons:** `lucide-react`
- **Types:** Centralized in `src/types/index.ts` (`ScenarioData`, `RunResponse`, `TestResponse`, `AppState`)
- **Environment variables:** Supabase credentials are loaded from `.env` via Vite's `import.meta.env` (prefixed with `VITE_`). Copy `.env.example` to `.env` and fill in your project's values.

### Re-enabling In-App Surveys

Surveys (privacy, preliminary, post-study) were disabled in favour of LimeSurvey. All code is commented out, not deleted. To restore the full in-app survey flow:

1. **`src/App.tsx`** — Uncomment the `/privacy`, `/survey`, and `/post-survey` `<Route>` blocks. Restore the original guards:
   - `/disclaimer/:phase` → `requireSurvey`
   - `/scenario/:id` → `requireSurvey requireTestDisclaimer`
   - `/post-survey` → `requireSurvey requireAllScenarios`
   - `/thank-you` → `requireSurvey requireAllScenarios requirePostSurvey`
2. **`src/components/ProtectedRoute.tsx`** — Uncomment the three guard blocks for `requirePrivacy`, `requireSurvey`, and `requirePostSurvey`.
3. **`src/pages/Login.tsx`** — Change `navigate("/disclaimer/test")` back to `navigate("/privacy")`.
4. **`src/pages/Scenario.tsx`** — In `getNextDestination()`, change the production-phase-done return from `"/thank-you"` back to `"/post-survey"`. Also remove the `markSurveyCompleted` calls in `handleSubmit` and `handleTimeout` (the post-survey's `submitSurvey(..., markCompleted=true)` will set the flag instead).
5. **`src/pages/ThankYou.tsx`** — Restore the logout + navigate-to-login flow instead of `window.close()`.
