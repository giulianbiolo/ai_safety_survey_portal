import { supabase } from "./client";
import type { QuestionKind, QuestionType } from "./types";
import type { Question } from "../types";

/**
 * In-app surveys are currently disabled (LimeSurvey handles them), but the
 * code path is kept and routed through SECURITY DEFINER RPCs so re-enabling
 * doesn't require another schema migration.
 */

// ── get_survey_questions ──────────────────────────────────────────

interface GetSurveyQuestionsRow {
  id: number;
  question_title: string;
  question_type: QuestionType;
  possible_answers: string | null;
  order: number;
}

export async function getQuestions(
  loginCode: string,
  kind: QuestionKind = "PRELIMINARY",
): Promise<Question[]> {
  const { data, error } = await supabase.rpc("get_survey_questions", {
    p_login_code: loginCode,
    p_kind: kind,
  });

  if (error) {
    console.error("getQuestions error:", error);
    throw error;
  }

  return ((data as GetSurveyQuestionsRow[] | null) ?? []).map((q) => ({
    question_id: q.id,
    question: q.question_title,
    type: q.question_type,
    answers: q.possible_answers
      ? q.possible_answers.split(",").map((a) => a.trim())
      : null,
  }));
}

// ── submit_survey ─────────────────────────────────────────────────

/**
 * Submit all survey answers for a user.
 * `answers` is a map of question_id → answer value.
 * When `markCompleted` is true, also sets `users.completed_survey = true`.
 */
export async function submitSurvey(
  loginCode: string,
  answers: Record<number, string>,
  markCompleted = false,
): Promise<{ success: boolean }> {
  const { error } = await supabase.rpc("submit_survey", {
    p_login_code: loginCode,
    p_answers: answers,
    p_mark_completed: markCompleted,
  });

  if (error) {
    console.error("submitSurvey error:", error);
    throw error;
  }

  return { success: true };
}
