import { supabase } from "./client";
import type { DbSurveyQuestion } from "./types";
import type { Question } from "../types";

/**
 * Fetch all survey questions ordered by their `order` column.
 */
export async function getQuestions(): Promise<Question[]> {
  const { data, error } = await supabase
    .from("survey_questions")
    .select("*")
    .order("order", { ascending: true })
    .returns<DbSurveyQuestion[]>();

  if (error) {
    console.error("getQuestions error:", error);
    throw error;
  }

  return (data ?? []).map((q) => ({
    question_id: q.id,
    question: q.question_title,
    type: q.question_type,
    answers: q.possible_answers
      ? q.possible_answers.split(",").map((a) => a.trim())
      : null,
  }));
}

/**
 * Submit all survey answers for a user.
 * `answers` is a map of question_id → answer value.
 */
export async function submitSurvey(
  userId: number,
  answers: Record<number, string>,
): Promise<{ success: boolean }> {
  const rows = Object.entries(answers).map(([questionId, answer]) => ({
    user_id: userId,
    question_id: Number(questionId),
    answer,
  }));

  const { error: insertError } = await supabase
    .from("user_survey_answers")
    .upsert(rows, { onConflict: "user_id,question_id" });

  if (insertError) {
    console.error("submitSurvey insert error:", insertError);
    throw insertError;
  }

  return { success: true };
}
