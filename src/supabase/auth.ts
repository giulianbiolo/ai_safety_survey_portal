import { supabase } from "./client";
import type { DbUser } from "./types";

/**
 * Validate a 6-char login code against the users table.
 * Returns the user's id if valid, null otherwise.
 */
export async function validateToken(
  token: string,
): Promise<{ valid: boolean; userId: number | null }> {
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("login_code", token.toUpperCase())
    .maybeSingle<Pick<DbUser, "id">>();

  if (error) {
    console.error("validateToken error:", error);
    return { valid: false, userId: null };
  }

  return data ? { valid: true, userId: data.id } : { valid: false, userId: null };
}
