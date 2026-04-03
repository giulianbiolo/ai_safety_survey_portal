import { useState } from "react";
import { CheckCircle2, ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "../components/Button";
import { useAppStore } from "../store/useAppStore";


export function ThankYou() {
  const { logout } = useAppStore();
  const [closeFailed, setCloseFailed] = useState(false);

  const handleClose = () => {
    window.close();

    setTimeout(() => {
      logout();
      setCloseFailed(true);
    }, 300);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-zinc-950">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl text-center">
        <div className="w-16 h-16 bg-green-500/10 rounded-full mx-auto flex items-center justify-center mb-6 border border-green-500/20">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 mb-2">
          Scenarios Complete
        </h1>
        <p className="text-zinc-400 mb-4">
          Thank you for completing all the scenarios! Your code submissions
          have been recorded successfully.
        </p>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ArrowLeft className="w-5 h-5 text-amber-400" />
            <span className="text-amber-300 font-semibold text-sm uppercase tracking-wide">
              Action Required
            </span>
            <ArrowLeft className="w-5 h-5 text-amber-400 rotate-180" />
          </div>
          <p className="text-amber-200/90 text-sm leading-relaxed">
            Please <strong>close this page</strong> and <strong>return to the
            LimeSurvey tab</strong> to complete the post-study questionnaire.
            The study is not finished until the final survey is submitted.
          </p>
        </div>

        {closeFailed ? (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-zinc-400 text-sm">
              <ExternalLink className="w-4 h-4" />
              <span>Please close this tab manually and return to the survey.</span>
            </div>
          </div>
        ) : (
          <Button
            onClick={handleClose}
            className="w-full h-12 text-base"
            variant="primary"
          >
            Close This Page
          </Button>
        )}
      </div>
    </div>
  );
}
