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

The Supabase project is the single source of truth for users, scenarios, and submissions. The `src/supabase/` module is the integration point. Schema and security model both live in `init-db.sql` and the file is idempotent (`CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS`, `CREATE OR REPLACE FUNCTION`).

**Security model.** Authentication is token-based: each participant gets a 6-char `login_code` stored in `users`. The browser talks to Postgres as the `anon` role using the publishable anon key. **RLS is enabled and there are zero policies on any table** — anon has no direct read/write access to anything. Every participant operation goes through one of eight `SECURITY DEFINER` RPC functions; each takes the `login_code` as its de-facto auth token, looks up the matching user server-side, and acts only on rows for that user. This blocks token enumeration via `SELECT login_code FROM users`, submission forgery with arbitrary `user_id`, and tampering with `completed_survey`. Each function has `SET search_path = public, pg_temp` (anti-shadowing), `REVOKE ALL … FROM PUBLIC`, and `GRANT EXECUTE … TO anon`.

| File | Purpose |
|---|---|
| `client.ts` | Supabase client init (reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from `.env`) |
| `auth.ts` | `validateToken(token)` — calls `rpc("login")`. Returns `{valid, userId, userGroup, completedSurvey, reason}` where `reason ∈ "ok"|"invalid_token"|"rpc_error"` so the UI can distinguish bad-credential from network failure |
| `survey.ts` | `getQuestions(loginCode, kind)`, `submitSurvey(loginCode, answers, markCompleted)` — currently disabled (LimeSurvey) but kept on the same RPC layer for re-enable |
| `scenarios.ts` | `getScenario(loginCode, scenarioId)`, `getGroupScenarios(loginCode)`, `submitScenario(loginCode, scenarioId, code, elapsed, testRunCount)`, `recordTestRun(loginCode, scenarioId, code, elapsed, iteration)`, `markSurveyCompleted(loginCode)` (3× retry with exponential backoff; throws on final failure) |
| `types.ts` | Database type definitions |
| `init-db.sql` | Authoritative schema — DDL + RLS toggles + the eight RPCs |
| `init-db.ts` | Bun helper that prints `init-db.sql` with paste-into-Studio instructions (apply via service-role; the anon publishable key cannot execute DDL or `SECURITY DEFINER`) |
| `index.ts` | Barrel exports |

**RPC surface (Postgres-side).**

| Function | Args | Raises (besides happy path) |
|---|---|---|
| `login(p_login_code)` | text | Never raises — returns an empty rowset for unknown tokens so the client can distinguish "wrong token" from "RPC error" via the `reason` field |
| `get_scenario(p_login_code, p_scenario_id)` | text, int | `invalid_login_code` |
| `get_group_scenarios(p_login_code)` | text | `invalid_login_code`. Returns TEST first, then PROD, ascending by id within each |
| `submit_scenario(p_login_code, p_scenario_id, p_submit_code, p_submit_time, p_test_run_count)` | text, int, text, float8, int | `invalid_login_code`, `session_completed`, `scenario_not_assigned`. INSERT uses `ON CONFLICT (user_id, scenario_id) DO NOTHING` so a duplicate (race or network retry) is silently deduped rather than surfacing a `unique_violation` to the client |
| `record_test_run(...)` | same shape | `invalid_login_code`, `session_completed` |
| `mark_survey_completed(p_login_code)` | text | `invalid_login_code` if no row matched (so client retries detect failure rather than silently no-op). **Stays idempotent on completed sessions** — the only mutation RPC that doesn't gate on `session_completed` |
| `get_survey_questions(p_login_code, p_kind)` | text, question_kind | `invalid_login_code` |
| `submit_survey(p_login_code, p_answers, p_mark_completed)` | text, jsonb, boolean | `invalid_login_code`, `session_completed`. Upserts on `(user_id, question_id)`; optionally flips `completed_survey` |

**Defence-in-depth invariants (Postgres-side).**

- `user_scenario_submits` has a `UNIQUE (user_id, scenario_id)` constraint (`user_scenario_submits_unique`). It exists *in addition to* the client-side `isSubmitting` guard in `Scenario.tsx`, so even if a future client bug or a manipulated network retry attempts a duplicate INSERT, the DB rejects the second row at the storage layer. `submit_scenario` pairs this with `ON CONFLICT … DO NOTHING` so the RPC returns success either way — analysis pipelines should rely on the row's `submit_time` / `submit_code`, not on the call returning "first vs second insert".
- The three mutation RPCs (`submit_scenario`, `record_test_run`, `submit_survey`) **gate on `users.completed_survey`**. Once the flag flips, any further write attempt with the same login_code raises `session_completed`. This shrinks the post-completion exposure window for a stolen token from "forever" to "until the participant finishes".
- `mark_survey_completed` is intentionally **not** gated — it must remain idempotent so the client's 3-attempt retry can re-execute safely if a transient failure mid-flow leaves us unsure whether the flag flipped.

**Database tables:** `users`, `survey_questions`, `user_survey_answers`, `scenarios`, `user_scenario_submits` (with `UNIQUE (user_id, scenario_id)`), `user_scenario_test_history`, `scenario_groups`.

**Migration to an existing DB.** Re-run `init-db.sql` once via the Supabase SQL Editor (or `supabase db push`) using a service-role credential. The `DROP POLICY IF EXISTS` block wipes the prior permissive `anon_all_*` policies; the eight `CREATE OR REPLACE FUNCTION` blocks install the RPC layer. **The new client cannot talk to a pre-RPC schema and the old client cannot talk to the locked-down schema** — apply the SQL and deploy the front-end together.

**Trap to remember when changing API signatures.** `loginCode`, `userGroup`, and `userId` are all strings/numbers, so swapping one for another at a call site type-checks but blows up at runtime as `invalid_login_code` (or worse, silently picks the wrong row). After any signature change in `src/supabase/`, grep every call site under `src/pages/` and `src/components/` to confirm the right value is being passed — `tsc` will not catch the swap.

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
| `ProtectedRoute` | `components/ProtectedRoute.tsx` | Route guards (`requireTestDisclaimer`, `requireAllScenarios` active; `requirePrivacy`, `requireSurvey`, `requirePostSurvey` commented out). Also bounces to `/login` whenever the persisted store has a `token` but `scenarioList` is empty — that combination shouldn't be reachable via Login.tsx, so it indicates localStorage tampering or a future code path that forgot to call `setScenarioList`. |
| `SurveyPage` | `components/SurveyPage.tsx` | Shared survey page (currently unused — surveys moved to LimeSurvey). Used by both `Survey` and `PostSurvey` pages via props (`kind`, `title`, `onSubmit`, etc.) |
| `Button` | `components/Button.tsx` | Reusable button (variants: primary, secondary, danger, ghost) |
| `EditorWrapper` | `components/EditorWrapper.tsx` | Monaco Editor wrapper (Python, dark theme, `readOnly` prop, optional `disableCopyPaste` prop — see "Copy/paste policy" below) |
| `AiInfoDialog` | `components/AiInfoDialog.tsx` | Modal shown on WITH_AI scenario load with AI tool name + copyable suggested prompt. Reopened via the clickable "With AI" badge. |
| `AiInstructionsPanel` | `components/AiInstructionsPanel.tsx` | Inline panel version of AI instructions, rendered inside the reference panel's "AI Instructions" tab |
| `HumanOnlyInfoDialog` | `components/HumanOnlyInfoDialog.tsx` | Symmetric counterpart to `AiInfoDialog`: amber-themed modal shown on HUMAN_ONLY scenario load reminding the participant not to use AI tools and noting that copy/paste is disabled. Reopened via the clickable "Human Only" badge. |
| `ConfirmSubmitDialog` | `components/ConfirmSubmitDialog.tsx` | Confirmation modal shown before scenario submission (warns action is irreversible). Not shown on timeout auto-submit. |
| `ConfirmResetDialog` | `components/ConfirmResetDialog.tsx` | Confirmation modal shown before resetting the editor code back to `scenario.initialCode`. |

### Page Details

**Login** — Token input with uppercase auto-format. Calls `validateToken` (single RPC round-trip; returns `userId`, `userGroup`, `completedSurvey`, `reason`). Rejects already-completed users (`completedSurvey === true`) and rows with a missing `user_group` (defends against a transient failure silently coercing the participant into the wrong study arm). Fetches the scenario list via `getGroupScenarios(loginCode)` *before* committing token/user/list to the persisted store, so a fetch failure leaves no half-authenticated state. **Shared-browser hygiene:** if a *different* `login_code` is being committed than what's already in localStorage, calls `logout()` first to wipe the previous participant's `completedScenarios` / `scenarioStartTimes` / disclaimer flags. Differentiates "Invalid token" from "Couldn't reach the server" via the `reason` field. Redirects to `/disclaimer/test`.

**PrivacyPolicy** — *Currently disabled (route commented out).* Displays data collection details, usage, storage, security measures, and participant rights.

**Survey / PostSurvey** — *Currently disabled (routes commented out).* Thin wrappers around `SurveyPage` component.

**Disclaimer** (`src/pages/Disclaimer.tsx`) — Phase intro screen. The route is `/disclaimer/:phase` where `phase` is `"test"` (TEST/training phase) or `"production"` (PRODUCTION/evaluation phase). User-facing copy uses **"Training Scenarios"** for TEST and **"Evaluation Scenarios"** for PRODUCTION (the internal `scenario_kind` enum still uses `TEST` / `PRODUCTION`). The Scenario bottom-bar progress label uses the same vocabulary (`"Training Scenario X of Y"` / `"Evaluation Scenario X of Y"`) — if you ever rename the phases, update both surfaces together.

**Scenario** — 3-panel horizontally resizable layout (`react-resizable-panels`; default 40/35/25%, each min 400px):
1. Editable Monaco editor (scenario code) with AI/Human-Only badge (clickable in **both** modalities — opens the matching `AiInfoDialog` or `HumanOnlyInfoDialog`) and a Reset button (right-aligned) that opens `ConfirmResetDialog` and restores `scenario.initialCode` on confirm
2. Tabbed read-only panel (test code + README + "AI Instructions" tab when `aiAllowed`)
3. Output panel (stdout/stderr + parsed test results)

The editable panel header and the test tab label use a local `extractFilename(content, fallback)` helper (in `src/pages/Scenario.tsx`): if the file's first line is a comment matching `# <name>.py`, that filename is used as the title; otherwise it falls back to `scenario_${id}.py` / `test_${id}.py`. The editable header updates live as the user types.

On every scenario load, exactly one modality dialog auto-opens: `AiInfoDialog` when `scenario.aiAllowed` is true, otherwise `HumanOnlyInfoDialog`. State is tracked by `showAiDialog` and `showHumanOnlyDialog` in `src/pages/Scenario.tsx`; both are flipped in the `fetchScenario` effect based on `data.aiAllowed`. The AI tool name, link, and prompt text are hardcoded in `src/constants/ai.ts` (`AI_TOOL_NAME`, `AI_TOOL_URL`, `AI_DEFAULT_PROMPT`). The tool name is rendered as a clickable external link (opens in a new tab) in both `AiInfoDialog` and `AiInstructionsPanel`. Both AI surfaces label the prompt as **"Suggested Prompt"** to convey it is non-mandatory.

**Copy/paste policy.** On HUMAN_ONLY scenarios, copy/cut/paste is disabled in *both* Monaco editors (the editable code panel and the read-only test/README panel). This is implemented in `EditorWrapper`'s optional `disableCopyPaste` prop, which (a) overrides Monaco's `Ctrl/Cmd+C/V/X` and the `Shift+Insert` / `Shift+Delete` / `Ctrl+Insert` aliases as no-ops via `editor.addCommand`, (b) attaches DOM-level capture-phase `copy`/`cut`/`paste` blockers on `editor.getDomNode()` (covers middle-click paste, browser-menu paste, drag-paste), and (c) sets Monaco's `contextmenu: false` and `dragAndDrop: false`. Because `addCommand` only runs at mount, a `key={disableCopyPaste ? "no-clipboard" : "default"}` toggle on `<Editor>` forces a remount when the policy flips between scenarios. `Scenario.tsx` passes `disableCopyPaste={!scenario.aiAllowed}` to both EditorWrapper instances. This is a soft barrier — devtools-level bypass is still possible.

Bottom bar: scenario progress, 20-minute countdown timer (red under 60s, auto-submit on timeout), Run Tests button, Submit button (opens `ConfirmSubmitDialog` before submitting; timeout auto-submit bypasses the confirmation). The timeout-handler effect early-returns when `isSubmitting` is already true, so a manual Submit click at ~0:01 with a slow network can't race the timer into a duplicate `user_scenario_submits` row. Each test run records a snapshot to `user_scenario_test_history` via `recordTestRun(token, …)`, deduplicated client-side by a `lastRecordedCodeRef` (so `test_run_count` is the source of truth for click count, not `COUNT(*)` over the history table). The Output panel header surfaces a red "Python runtime failed — please reload" message if Pyodide loading throws (CDN failure or micropip install error), so the participant isn't left staring at a perpetual "Loading…" spinner. After all production scenarios, navigates to `/thank-you`. **Important:** both `handleSubmit` and `handleTimeout` call `markSurveyCompleted(token)` (sets `users.completed_survey = true` in Supabase) when the next destination is `/thank-you` — this flag is what prevents the participant from re-logging in from another browser and corrupting the experimental N. The function retries 3× with exponential backoff internally; if every attempt fails it throws and the caller `window.alert`s admin-actionable text before still navigating (the alternative — leaving the participant stuck on the scenario page — was judged worse UX for a controlled pilot). It is set in `src/pages/Scenario.tsx`, NOT on the Thank You page.

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
