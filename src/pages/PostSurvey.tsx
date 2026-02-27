import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getQuestions, submitSurvey } from "../supabase";
import { Button } from "../components/Button";
import { useAppStore } from "../store/useAppStore";
import { Question } from "../types";
import { cn } from "../utils/cn";

export function PostSurvey() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { completePostSurvey, postSurveyCompleted, userId } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (postSurveyCompleted) {
      navigate("/thank-you", { replace: true });
      return;
    }

    const fetchQuestions = async () => {
      try {
        const data = await getQuestions("POSTSURVEY");
        setQuestions(data);
      } catch (error) {
        console.error("Failed to fetch post-survey questions", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, [postSurveyCompleted, navigate]);

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
      await submitSurvey(userId!, answers, true);
      completePostSurvey();
      navigate("/thank-you");
    } catch (error) {
      console.error("Failed to submit post-survey", error);
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
            Post-Study Survey
          </h1>
          <p className="text-zinc-400 mt-2">
            You have completed all coding scenarios. Please answer the following
            questions before finishing.
          </p>
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
                <div className="space-y-3">
                  {q.answers.map((answer, aIndex) => {
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
            Submit & Finish
          </Button>
        </div>
      </div>
    </div>
  );
}
