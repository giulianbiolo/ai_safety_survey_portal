import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getQuestions, submitSurvey } from "../supabase";
import { Button } from "./Button";
import { useAppStore } from "../store/useAppStore";
import { Question } from "../types";
import { QuestionKind } from "../supabase/types";
import { cn } from "../utils/cn";

interface ScaleInfo {
  items: { value: string; number: string; label: string | null }[];
  leftLabel: string | null;
  rightLabel: string | null;
}

function parseScaleQuestion(answers: string[] | null): ScaleInfo | null {
  if (!answers || answers.length !== 5) return null;

  const parsed = answers.map((a, i) => {
    const match = a.match(/^(\d)\s*(.*)$/);
    if (!match || match[1] !== String(i + 1)) return null;
    return {
      value: a,
      number: match[1],
      label: match[2] || null,
    };
  });

  if (parsed.some((p) => p === null)) return null;

  const items = parsed as ScaleInfo["items"];
  return {
    items,
    leftLabel: items[0].label,
    rightLabel: items[items.length - 1].label,
  };
}

interface SurveyPageProps {
  kind: QuestionKind;
  title: string;
  subtitle: string;
  submitLabel: string;
  redirectIfDone: string;
  redirectAfterSubmit: string;
  isAlreadyDone: boolean;
  onSubmit: (answers: Record<number, string>) => void;
  markCompleted?: boolean;
}

export function SurveyPage({
  kind,
  title,
  subtitle,
  submitLabel,
  redirectIfDone,
  redirectAfterSubmit,
  isAlreadyDone,
  onSubmit,
  markCompleted = false,
}: SurveyPageProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const userId = useAppStore((s) => s.userId);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAlreadyDone) {
      navigate(redirectIfDone, { replace: true });
      return;
    }

    const fetchQuestions = async () => {
      try {
        const data = await getQuestions(kind);
        setQuestions(data);
      } catch (error) {
        console.error(`Failed to fetch ${kind} questions`, error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [isAlreadyDone, navigate, redirectIfDone, kind]);

  const handleSelect = (questionId: number, answerValue: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answerValue }));
  };

  const handleTextChange = (questionId: number, text: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: text }));
  };

  const allAnswered =
    questions.length > 0 &&
    questions.every((q) => {
      const answer = answers[q.question_id];
      return answer !== undefined && answer.trim().length > 0;
    });

  const handleSubmit = async () => {
    if (!allAnswered) return;

    setIsSubmitting(true);
    try {
      await submitSurvey(userId!, answers, markCompleted);
      onSubmit(answers);
      navigate(redirectAfterSubmit);
    } catch (error) {
      console.error(`Failed to submit ${kind} survey`, error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-zinc-950">
      <div className="max-w-3xl w-full mx-auto p-6 flex-1 flex flex-col">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-50">
            {title}
          </h1>
          <p className="text-zinc-400 mt-2">{subtitle}</p>
        </div>

        <div className="flex-1 overflow-y-auto pr-4 space-y-8 pb-32 custom-scrollbar">
          {questions.map((q, index) => (
            <div
              key={q.question_id}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6"
            >
              <h3 className="text-lg font-medium text-zinc-100 mb-4">
                <span className="text-zinc-500 mr-2">{index + 1}.</span>
                {q.question}
              </h3>

              {q.type === "SINGLE_CHOICE" && q.answers ? (
                (() => {
                  const scale = parseScaleQuestion(q.answers);
                  if (scale) {
                    const selectedIndex = scale.items.findIndex(
                      (item) => item.value === answers[q.question_id],
                    );
                    return (
                      <div className="px-2 pt-2 pb-1">
                        <div className="relative flex items-center justify-between">
                          {/* Background track */}
                          <div className="absolute left-[20px] right-[20px] top-1/2 -translate-y-1/2 h-1 rounded-full bg-zinc-800" />
                          {/* Filled track */}
                          {selectedIndex >= 0 && (
                            <div
                              className="absolute left-[20px] top-1/2 -translate-y-1/2 h-1 rounded-full bg-indigo-500/60 transition-all duration-300"
                              style={{
                                width: `calc((100% - 40px) * ${selectedIndex / 4})`,
                              }}
                            />
                          )}
                          {scale.items.map((item, i) => {
                            const isSelected = answers[q.question_id] === item.value;
                            const isFilled = selectedIndex >= 0 && i <= selectedIndex;
                            return (
                              <button
                                key={item.number}
                                onClick={() => handleSelect(q.question_id, item.value)}
                                className={cn(
                                  "relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200 border-2",
                                  isSelected
                                    ? "bg-indigo-600 border-indigo-500 text-white scale-115 shadow-lg shadow-indigo-500/30"
                                    : isFilled
                                      ? "bg-indigo-950 border-indigo-500/50 text-indigo-300"
                                      : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 hover:bg-zinc-800",
                                )}
                              >
                                {item.number}
                              </button>
                            );
                          })}
                        </div>
                        {(scale.leftLabel || scale.rightLabel) && (
                          <div className="flex items-start justify-between mt-3">
                            <span className="text-xs text-zinc-500 max-w-[120px] text-left leading-tight">
                              {scale.leftLabel}
                            </span>
                            <span className="text-xs text-zinc-500 max-w-[120px] text-right leading-tight">
                              {scale.rightLabel}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-3">
                      {q.answers!.map((answer, aIndex) => {
                        const isSelected = answers[q.question_id] === answer;
                        return (
                          <button
                            key={aIndex}
                            onClick={() => handleSelect(q.question_id, answer)}
                            className={cn(
                              "w-full text-left px-4 py-3 rounded-lg border transition-all duration-200",
                              isSelected
                                ? "bg-indigo-600/10 border-indigo-500 text-indigo-100"
                                : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/50",
                            )}
                          >
                            <div className="flex items-center">
                              <div
                                className={cn(
                                  "w-4 h-4 rounded-full border flex items-center justify-center mr-3",
                                  isSelected
                                    ? "border-indigo-500"
                                    : "border-zinc-600",
                                )}
                              >
                                {isSelected && (
                                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                )}
                              </div>
                              {answer}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()
              ) : (
                <textarea
                  value={answers[q.question_id] ?? ""}
                  onChange={(e) =>
                    handleTextChange(q.question_id, e.target.value)
                  }
                  placeholder="Type your answer here..."
                  rows={4}
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-y"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-zinc-950/80 backdrop-blur-md border-t border-zinc-800">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="text-sm text-zinc-400">
            {Object.keys(answers).filter((k) => {
              const v = answers[Number(k)];
              return v !== undefined && v !== "";
            }).length}{" "}
            of {questions.length} answered
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!allAnswered || isSubmitting}
            isLoading={isSubmitting}
            size="lg"
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
