import { supabase } from "./client";
import type { DbUser } from "./types";

/**
 * Validate a 6-char login code against the users table.
 * Returns the user's id if valid, null otherwise.
 */
export async function validateToken(
  token: string,
): Promise<{ valid: boolean; userId: number | null; completedSurvey: boolean }> {
  const { data, error } = await supabase
    .from("users")
    .select("id, completed_survey")
    .eq("login_code", token.toUpperCase())
    .maybeSingle<Pick<DbUser, "id"> & { completed_survey: boolean }>();

  if (error) {
    console.error("validateToken error:", error);
    return { valid: false, userId: null, completedSurvey: false };
  }

  return data
    ? { valid: true, userId: data.id, completedSurvey: data.completed_survey ?? false }
    : { valid: false, userId: null, completedSurvey: false };
}
