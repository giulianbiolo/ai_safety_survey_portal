import { supabase } from "./client";
import type { UserGroup } from "./types";

/**
 * Validate a 6-char login code against the users table via the `login` RPC.
 *
 * The RPC runs SECURITY DEFINER server-side and is the only way the anon role
 * can read user identity — direct SELECT on `users` is denied by RLS so the
 * publishable key cannot enumerate login codes.
 *
 * Returns the user's id, group, and completion flag in a single round-trip.
 * The `reason` field lets the caller distinguish a missing-row outcome from
 * a real RPC failure (network/server) so the UI can show the right message.
 */
export type ValidateTokenReason = "ok" | "invalid_token" | "rpc_error";

export async function validateToken(
  token: string,
): Promise<{
  valid: boolean;
  userId: number | null;
  userGroup: UserGroup | null;
  completedSurvey: boolean;
  reason: ValidateTokenReason;
}> {
  const { data, error } = await supabase.rpc("login", {
    p_login_code: token,
  });

  if (error) {
    console.error("validateToken error:", error);
    return {
      valid: false,
      userId: null,
      userGroup: null,
      completedSurvey: false,
      reason: "rpc_error",
    };
  }

  // The RPC returns SETOF — an empty array means no matching login_code.
  const row = (data as
    | { user_id: number; user_group: UserGroup | null; completed_survey: boolean }[]
    | null)?.[0];

  if (!row) {
    return {
      valid: false,
      userId: null,
      userGroup: null,
      completedSurvey: false,
      reason: "invalid_token",
    };
  }

  return {
    valid: true,
    userId: row.user_id,
    userGroup: row.user_group ?? null,
    completedSurvey: row.completed_survey ?? false,
    reason: "ok",
  };
}
