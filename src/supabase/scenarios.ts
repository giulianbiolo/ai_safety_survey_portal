import { supabase } from "./client";
import type { ScenarioData, ScenarioListEntry, SubmitResponse } from "../types";
import type { DbScenario, DbScenarioGroup, UserGroup } from "./types";

/**
 * Fetch a scenario by its ID, including the AI modality for the user's group.
 */
export async function getScenario(
  scenarioId: number,
  userGroup: UserGroup,
): Promise<ScenarioData> {
  const { data: scenario, error } = await supabase
    .from("scenarios")
    .select("*")
    .eq("id", scenarioId)
    .single<DbScenario>();

  if (error || !scenario) {
    throw new Error(`Scenario ${scenarioId} not found`);
  }

  // Look up modality for this user's group
  const { data: groupData } = await supabase
    .from("scenario_groups")
    .select("modality")
    .eq("scenario_id", scenarioId)
    .eq("group", userGroup)
    .maybeSingle<Pick<DbScenarioGroup, "modality">>();

  const aiAllowed = groupData?.modality === "WITH_AI";

  return {
    scenarioId: scenario.id,
    initialCode: scenario.scenario_code,
    testCode: scenario.test_code,
    readme: scenario.readme ?? "",
    aiAllowed,
    scenarioKind: scenario.scenario_kind,
  };
}

/**
 * Get the ordered list of scenario IDs assigned to a user group,
 * including scenario_kind (TEST | PRODUCTION) from the scenarios table.
 * Ordered so TEST scenarios come first, then PRODUCTION.
 */
export async function getGroupScenarios(
  userGroup: UserGroup,
): Promise<ScenarioListEntry[]> {
  const { data, error } = await supabase
    .from("scenario_groups")
    .select("scenario_id, modality, scenarios(scenario_kind)")
    .eq("group", userGroup)
    .order("scenario_id", { ascending: true })
    .returns<
      {
        scenario_id: number;
        modality: string;
        scenarios: { scenario_kind: "TEST" | "PRODUCTION" };
      }[]
    >();

  if (error) {
    console.error("getGroupScenarios error:", error);
    throw error;
  }

  const entries = (data ?? []).map((row) => ({
    scenarioId: row.scenario_id,
    modality: row.modality,
    scenarioKind: row.scenarios.scenario_kind,
  }));

  // Sort: TEST scenarios first, then PRODUCTION
  entries.sort((a, b) => {
    if (a.scenarioKind === b.scenarioKind) return a.scenarioId - b.scenarioId;
    return a.scenarioKind === "TEST" ? -1 : 1;
  });

  return entries;
}

/**
 * Submit a scenario solution. Stores the code and elapsed time.
 * If this is the user's last scenario (for their group), marks
 * `completed_survey` on the user record.
 */
export async function submitScenario(
  userId: number,
  scenarioId: number,
  code: string,
  elapsedSeconds: number | null,
  userGroup: UserGroup,
): Promise<SubmitResponse> {
  const { error } = await supabase.from("user_scenario_submits").insert({
    user_id: userId,
    scenario_id: scenarioId,
    submit_code: code,
    submit_time: elapsedSeconds,
  });

  if (error) {
    console.error("submitScenario error:", error);
    throw error;
  }

  // Check if all scenarios for this group are now submitted
  const { data: groupScenarios } = await supabase
    .from("scenario_groups")
    .select("scenario_id")
    .eq("group", userGroup)
    .returns<{ scenario_id: number }[]>();

  const requiredIds = new Set((groupScenarios ?? []).map((r) => r.scenario_id));

  const { data: submissions } = await supabase
    .from("user_scenario_submits")
    .select("scenario_id")
    .eq("user_id", userId)
    .returns<{ scenario_id: number }[]>();

  const submittedIds = new Set((submissions ?? []).map((s) => s.scenario_id));
  const allCompleted = [...requiredIds].every((id) => submittedIds.has(id));

  if (allCompleted) {
    await supabase
      .from("users")
      .update({ completed_survey: true })
      .eq("id", userId);
  }

  return { success: true };
}
