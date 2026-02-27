import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Info } from "lucide-react";
import { Button } from "../components/Button";
import { useAppStore } from "../store/useAppStore";

export function Disclaimer() {
  const { phase } = useParams<{ phase: string }>();
  const navigate = useNavigate();
  const {
    scenarioList,
    completedScenarios,
    seeTestDisclaimer,
    seeProductionDisclaimer,
    testDisclaimerSeen,
    productionDisclaimerSeen,
  } = useAppStore();

  const isTest = phase === "test";
  const isProduction = phase === "production";

  if (!isTest && !isProduction) {
    return <Navigate to="/login" replace />;
  }

  // If already seen, redirect to the first incomplete scenario of this phase
  if ((isTest && testDisclaimerSeen) || (isProduction && productionDisclaimerSeen)) {
    const kind = isTest ? "TEST" : "PRODUCTION";
    const phaseScenarios = scenarioList.filter((s) => s.scenarioKind === kind);
    const next = phaseScenarios.find((s) => !completedScenarios.includes(s.scenarioId));
    if (next) {
      return <Navigate to={`/scenario/${next.scenarioId}`} replace />;
    }
    // All done in this phase
    if (isTest) {
      return <Navigate to="/disclaimer/production" replace />;
    }
    return <Navigate to="/thank-you" replace />;
  }

  const kind = isTest ? "TEST" : "PRODUCTION";
  const phaseScenarios = scenarioList.filter((s) => s.scenarioKind === kind);
  const count = phaseScenarios.length;

  const handleContinue = () => {
    if (isTest) {
      seeTestDisclaimer();
    } else {
      seeProductionDisclaimer();
    }

    // Navigate to the first scenario of this phase
    const first = phaseScenarios[0];
    if (first) {
      navigate(`/scenario/${first.scenarioId}`);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-zinc-950">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl text-center">
        <div className="w-16 h-16 bg-indigo-500/10 rounded-full mx-auto flex items-center justify-center mb-6 border border-indigo-500/20">
          <Info className="w-8 h-8 text-indigo-400" />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 mb-3">
          {isTest ? "Test Scenarios" : "Survey Scenarios"}
        </h1>

        <p className="text-zinc-400 mb-3">
          {isTest
            ? `You are about to begin ${count} test scenario${count !== 1 ? "s" : ""}. These are practice scenarios to help you familiarize yourself with the interface and workflow.`
            : `You are about to begin ${count} survey scenario${count !== 1 ? "s" : ""}. These are the real scenarios that will be used for the study.`}
        </p>

        <p className="text-zinc-500 text-sm mb-8">
          Each scenario has a 15-minute time limit. You will need to identify and
          fix security vulnerabilities in Python code.
        </p>

        <Button
          onClick={handleContinue}
          className="w-full h-12 text-base"
          variant="primary"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
