import { supabase } from "./client";
import type { ScenarioData, ScenarioListEntry, SubmitResponse } from "../types";
import type { ScenarioKind, ScenarioModality } from "./types";

/**
 * All participant CRUD goes through SECURITY DEFINER RPCs that take the
 * 6-char login_code as the de-facto auth token. The anon role has no direct
 * table access, so the publishable key cannot bypass these functions.
 */

// ── get_scenario ──────────────────────────────────────────────────

interface GetScenarioRow {
  scenario_id: number;
  scenario_code: string;
  test_code: string;
  readme: string | null;
  scenario_kind: ScenarioKind;
  modality: ScenarioModality;
}

export async function getScenario(
  loginCode: string,
  scenarioId: number,
): Promise<ScenarioData> {
  const { data, error } = await supabase.rpc("get_scenario", {
    p_login_code: loginCode,
    p_scenario_id: scenarioId,
  });

  if (error) {
    console.error("getScenario error:", error);
    throw new Error(`Scenario ${scenarioId} not found`);
  }

  const row = (data as GetScenarioRow[] | null)?.[0];
  if (!row) {
    throw new Error(`Scenario ${scenarioId} not found`);
  }

  return {
    scenarioId: row.scenario_id,
    initialCode: row.scenario_code,
    testCode: row.test_code,
    readme: row.readme ?? "",
    aiAllowed: row.modality === "WITH_AI",
    scenarioKind: row.scenario_kind,
  };
}

// ── get_group_scenarios ───────────────────────────────────────────

interface GetGroupScenariosRow {
  scenario_id: number;
  modality: ScenarioModality;
  scenario_kind: ScenarioKind;
}

export async function getGroupScenarios(
  loginCode: string,
): Promise<ScenarioListEntry[]> {
  const { data, error } = await supabase.rpc("get_group_scenarios", {
    p_login_code: loginCode,
  });

  if (error) {
    console.error("getGroupScenarios error:", error);
    throw error;
  }

  // The RPC already orders TEST first, then PRODUCTION, ascending by id within each.
  return ((data as GetGroupScenariosRow[] | null) ?? []).map((row) => ({
    scenarioId: row.scenario_id,
    modality: row.modality,
    scenarioKind: row.scenario_kind,
  }));
}

// ── record_test_run ───────────────────────────────────────────────

export async function recordTestRun(
  loginCode: string,
  scenarioId: number,
  code: string,
  elapsedSeconds: number | null,
  iteration: number,
): Promise<void> {
  const { error } = await supabase.rpc("record_test_run", {
    p_login_code: loginCode,
    p_scenario_id: scenarioId,
    p_submit_code: code,
    p_submit_time: elapsedSeconds,
    p_test_run_count: iteration,
  });

  if (error) {
    console.error("recordTestRun error:", error);
  }
}

// ── submit_scenario ───────────────────────────────────────────────

export async function submitScenario(
  loginCode: string,
  scenarioId: number,
  code: string,
  elapsedSeconds: number | null,
  testRunCount: number,
): Promise<SubmitResponse> {
  const { error } = await supabase.rpc("submit_scenario", {
    p_login_code: loginCode,
    p_scenario_id: scenarioId,
    p_submit_code: code,
    p_submit_time: elapsedSeconds,
    p_test_run_count: testRunCount,
  });

  if (error) {
    console.error("submitScenario error:", error);
    throw error;
  }

  return { success: true };
}

// ── mark_survey_completed ─────────────────────────────────────────

/**
 * Mark the user's survey as completed in the users table.
 * Called when the user finishes their last production scenario.
 *
 * Retries with exponential backoff on failure: this flag is what prevents
 * a participant from re-logging in and accidentally re-doing the study, so
 * a transient hiccup must not silently leave it unset. Throws if every
 * attempt fails — callers must surface that to the participant.
 */
export async function markSurveyCompleted(loginCode: string): Promise<void> {
  const MAX_ATTEMPTS = 3;
  const BASE_DELAY_MS = 500;

  let lastError: unknown = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const { error } = await supabase.rpc("mark_survey_completed", {
      p_login_code: loginCode,
    });

    if (!error) return;

    lastError = error;
    console.error(
      `markSurveyCompleted attempt ${attempt + 1}/${MAX_ATTEMPTS} failed:`,
      error,
    );
  }

  throw lastError ?? new Error("markSurveyCompleted failed after retries");
}
