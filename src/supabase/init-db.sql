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
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scenario_id     INTEGER NOT NULL REFERENCES scenarios(id),
  submit_time     DOUBLE PRECISION,  -- seconds elapsed (0–1200)
  submit_code     TEXT,
  test_run_count  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_scenario_test_history (
  id              BIGSERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scenario_id     INTEGER NOT NULL REFERENCES scenarios(id),
  submit_time     DOUBLE PRECISION,  -- seconds elapsed at time of test run
  submit_code     TEXT NOT NULL,
  test_run_count  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS scenario_groups (
  id          SERIAL PRIMARY KEY,
  "group"     user_group NOT NULL,
  scenario_id INTEGER NOT NULL REFERENCES scenarios(id),
  modality    scenario_modality NOT NULL,
  UNIQUE ("group", scenario_id)
);

-- ── Row Level Security ──────────────────────────────────────
-- Auth is token-based (a 6-char login_code), not Supabase Auth, so the
-- whole app talks to Postgres as the `anon` role with the publishable key.
--
-- Security model: anon has NO direct table access. The only way to read
-- or mutate this schema from the browser is via the SECURITY DEFINER
-- functions defined below, each of which (a) takes a login_code as its
-- de-facto auth token, (b) looks up the user row server-side, and (c)
-- performs the operation only for that user. This blocks token
-- enumeration, submission forgery, and tampering with completed_survey.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_survey_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_scenario_submits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_scenario_test_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_groups ENABLE ROW LEVEL SECURITY;

-- Drop the previous permissive policies (idempotent for re-runs / migrations).
DROP POLICY IF EXISTS "anon_all_users"                      ON users;
DROP POLICY IF EXISTS "anon_all_survey_questions"           ON survey_questions;
DROP POLICY IF EXISTS "anon_all_user_survey_answers"        ON user_survey_answers;
DROP POLICY IF EXISTS "anon_all_scenarios"                  ON scenarios;
DROP POLICY IF EXISTS "anon_all_user_scenario_submits"      ON user_scenario_submits;
DROP POLICY IF EXISTS "anon_all_user_scenario_test_history" ON user_scenario_test_history;
DROP POLICY IF EXISTS "anon_all_scenario_groups"            ON scenario_groups;

-- ──────────────────────────────────────────────────────────────────────
-- Authenticated RPC layer
-- ──────────────────────────────────────────────────────────────────────

-- ── login: validate token and return user identity ─────────────
-- Returns an empty rowset for invalid codes (never raises) so the client
-- can distinguish "wrong token" from "DB error" via the absence of rows.

CREATE OR REPLACE FUNCTION login(p_login_code TEXT)
RETURNS TABLE(user_id INTEGER, user_group user_group, completed_survey BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.user_group, u.completed_survey
  FROM users u
  WHERE u.login_code = upper(p_login_code);
END;
$$;

REVOKE ALL ON FUNCTION login(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION login(TEXT) TO anon;

-- ── get_scenario: scenario data + modality for the caller's group ─

CREATE OR REPLACE FUNCTION get_scenario(p_login_code TEXT, p_scenario_id INTEGER)
RETURNS TABLE(
  scenario_id   INTEGER,
  scenario_code TEXT,
  test_code     TEXT,
  readme        TEXT,
  scenario_kind scenario_kind,
  modality      scenario_modality
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_group user_group;
BEGIN
  SELECT u.user_group INTO v_user_group
  FROM users u
  WHERE u.login_code = upper(p_login_code);

  IF v_user_group IS NULL THEN
    RAISE EXCEPTION 'invalid_login_code';
  END IF;

  RETURN QUERY
  SELECT s.id, s.scenario_code, s.test_code, s.readme, s.scenario_kind, sg.modality
  FROM scenarios s
  JOIN scenario_groups sg ON sg.scenario_id = s.id
  WHERE s.id = p_scenario_id AND sg."group" = v_user_group;
END;
$$;

REVOKE ALL ON FUNCTION get_scenario(TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_scenario(TEXT, INTEGER) TO anon;

-- ── get_group_scenarios: ordered scenario list for the caller's group ─
-- TEST scenarios first, then PRODUCTION; ascending by scenario_id within
-- each kind. Mirrors the order the WebApp expects.

CREATE OR REPLACE FUNCTION get_group_scenarios(p_login_code TEXT)
RETURNS TABLE(
  scenario_id   INTEGER,
  modality      scenario_modality,
  scenario_kind scenario_kind
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_group user_group;
BEGIN
  SELECT u.user_group INTO v_user_group
  FROM users u
  WHERE u.login_code = upper(p_login_code);

  IF v_user_group IS NULL THEN
    RAISE EXCEPTION 'invalid_login_code';
  END IF;

  RETURN QUERY
  SELECT sg.scenario_id, sg.modality, s.scenario_kind
  FROM scenario_groups sg
  JOIN scenarios s ON s.id = sg.scenario_id
  WHERE sg."group" = v_user_group
  ORDER BY
    CASE WHEN s.scenario_kind = 'TEST' THEN 0 ELSE 1 END,
    sg.scenario_id;
END;
$$;

REVOKE ALL ON FUNCTION get_group_scenarios(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_group_scenarios(TEXT) TO anon;

-- ── submit_scenario: insert one participant submission ─────────
-- Verifies that the (user_group, scenario_id) pair is actually assigned
-- before inserting, so a participant can't smuggle a submission for a
-- scenario not in their study arm.

CREATE OR REPLACE FUNCTION submit_scenario(
  p_login_code     TEXT,
  p_scenario_id    INTEGER,
  p_submit_code    TEXT,
  p_submit_time    DOUBLE PRECISION,
  p_test_run_count INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id    INTEGER;
  v_user_group user_group;
BEGIN
  SELECT u.id, u.user_group INTO v_user_id, v_user_group
  FROM users u
  WHERE u.login_code = upper(p_login_code);

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_login_code';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM scenario_groups sg
    WHERE sg."group" = v_user_group AND sg.scenario_id = p_scenario_id
  ) THEN
    RAISE EXCEPTION 'scenario_not_assigned';
  END IF;

  INSERT INTO user_scenario_submits (
    user_id, scenario_id, submit_code, submit_time, test_run_count
  ) VALUES (
    v_user_id, p_scenario_id, p_submit_code, p_submit_time, p_test_run_count
  );
END;
$$;

REVOKE ALL ON FUNCTION submit_scenario(TEXT, INTEGER, TEXT, DOUBLE PRECISION, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION submit_scenario(TEXT, INTEGER, TEXT, DOUBLE PRECISION, INTEGER) TO anon;

-- ── record_test_run: snapshot of code + elapsed at "Run Tests" click ─

CREATE OR REPLACE FUNCTION record_test_run(
  p_login_code     TEXT,
  p_scenario_id    INTEGER,
  p_submit_code    TEXT,
  p_submit_time    DOUBLE PRECISION,
  p_test_run_count INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id INTEGER;
BEGIN
  SELECT u.id INTO v_user_id
  FROM users u
  WHERE u.login_code = upper(p_login_code);

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_login_code';
  END IF;

  INSERT INTO user_scenario_test_history (
    user_id, scenario_id, submit_code, submit_time, test_run_count
  ) VALUES (
    v_user_id, p_scenario_id, p_submit_code, p_submit_time, p_test_run_count
  );
END;
$$;

REVOKE ALL ON FUNCTION record_test_run(TEXT, INTEGER, TEXT, DOUBLE PRECISION, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_test_run(TEXT, INTEGER, TEXT, DOUBLE PRECISION, INTEGER) TO anon;

-- ── mark_survey_completed: set users.completed_survey = TRUE ────
-- Raises if the login_code matches no user, so client retries surface
-- a real failure rather than silently no-op'ing.

CREATE OR REPLACE FUNCTION mark_survey_completed(p_login_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE users
  SET completed_survey = TRUE
  WHERE login_code = upper(p_login_code);

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RAISE EXCEPTION 'invalid_login_code';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION mark_survey_completed(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mark_survey_completed(TEXT) TO anon;

-- ── get_survey_questions: list questions of a given kind ───────
-- Surveys are handled by LimeSurvey today; kept here so re-enabling
-- the in-app path doesn't require another migration.

CREATE OR REPLACE FUNCTION get_survey_questions(p_login_code TEXT, p_kind question_kind)
RETURNS TABLE(
  id               INTEGER,
  question_title   TEXT,
  question_type    question_type,
  possible_answers TEXT,
  "order"          INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users u WHERE u.login_code = upper(p_login_code)) THEN
    RAISE EXCEPTION 'invalid_login_code';
  END IF;

  RETURN QUERY
  SELECT q.id, q.question_title, q.question_type, q.possible_answers, q."order"
  FROM survey_questions q
  WHERE q.question_kind = p_kind
  ORDER BY q."order";
END;
$$;

REVOKE ALL ON FUNCTION get_survey_questions(TEXT, question_kind) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_survey_questions(TEXT, question_kind) TO anon;

-- ── submit_survey: upsert all answers, optionally close the session ─

CREATE OR REPLACE FUNCTION submit_survey(
  p_login_code     TEXT,
  p_answers        JSONB,
  p_mark_completed BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id INTEGER;
  v_qid     INTEGER;
  v_answer  TEXT;
BEGIN
  SELECT u.id INTO v_user_id
  FROM users u
  WHERE u.login_code = upper(p_login_code);

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'invalid_login_code';
  END IF;

  FOR v_qid, v_answer IN
    SELECT (key)::INTEGER, value
    FROM jsonb_each_text(p_answers)
  LOOP
    INSERT INTO user_survey_answers (user_id, question_id, answer)
    VALUES (v_user_id, v_qid, v_answer)
    ON CONFLICT (user_id, question_id) DO UPDATE SET answer = EXCLUDED.answer;
  END LOOP;

  IF p_mark_completed THEN
    UPDATE users SET completed_survey = TRUE WHERE id = v_user_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION submit_survey(TEXT, JSONB, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION submit_survey(TEXT, JSONB, BOOLEAN) TO anon;
