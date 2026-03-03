-- ============================================================
-- Supabase DB initialization for AI Safety Survey Portal
-- ============================================================

-- ── Enums ───────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE user_group AS ENUM ('A', 'B', 'C');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE scenario_modality AS ENUM ('HUMAN_ONLY', 'WITH_AI');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE question_type AS ENUM ('SINGLE_CHOICE', 'TEXT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE question_kind AS ENUM ('PRELIMINARY', 'POSTSURVEY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE scenario_kind AS ENUM ('TEST', 'PRODUCTION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Tables ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  login_code      VARCHAR(6) UNIQUE NOT NULL,
  session_token   TEXT,
  user_group      user_group NOT NULL,
  completed_survey BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS survey_questions (
  id               SERIAL PRIMARY KEY,
  question_title   TEXT NOT NULL,
  question_type    question_type NOT NULL,
  possible_answers TEXT NOT NULL,  -- comma-separated
  question_kind    question_kind NOT NULL DEFAULT 'PRELIMINARY',
  "order"          INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_survey_answers (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL,
  answer      TEXT NOT NULL,
  UNIQUE (user_id, question_id)
);

CREATE TABLE IF NOT EXISTS scenarios (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  scenario_code TEXT NOT NULL,
  test_code     TEXT NOT NULL,
  readme        TEXT,
  scenario_kind scenario_kind NOT NULL DEFAULT 'PRODUCTION'
);

CREATE TABLE IF NOT EXISTS user_scenario_submits (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scenario_id   INTEGER NOT NULL REFERENCES scenarios(id),
  submit_time   DOUBLE PRECISION,  -- seconds elapsed (0–900)
  submit_code   TEXT,
);

CREATE TABLE IF NOT EXISTS scenario_groups (
  id          SERIAL PRIMARY KEY,
  "group"     user_group NOT NULL,
  scenario_id INTEGER NOT NULL REFERENCES scenarios(id),
  modality    scenario_modality NOT NULL,
  UNIQUE ("group", scenario_id)
);

-- ── Row Level Security ──────────────────────────────────────
-- Enable RLS but allow anonymous access (using the anon key)
-- since auth is token-based, not Supabase Auth.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_survey_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_scenario_submits ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_groups ENABLE ROW LEVEL SECURITY;

-- Policies: allow full access for anon role (the publishable key role)
CREATE POLICY "anon_all_users" ON users FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_survey_questions" ON survey_questions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_user_survey_answers" ON user_survey_answers FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_scenarios" ON scenarios FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_user_scenario_submits" ON user_scenario_submits FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_scenario_groups" ON scenario_groups FOR ALL TO anon USING (true) WITH CHECK (true);
