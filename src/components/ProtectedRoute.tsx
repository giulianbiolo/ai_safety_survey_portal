import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requirePrivacy?: boolean;
  requireSurvey?: boolean;
  requireTestDisclaimer?: boolean;
  requireProductionDisclaimer?: boolean;
  requireAllTestScenarios?: boolean;
  requireAllScenarios?: boolean;
  requirePostSurvey?: boolean;
}

export function ProtectedRoute({
  children,
  requirePrivacy,
  requireSurvey,
  requireTestDisclaimer,
  requireProductionDisclaimer,
  requireAllTestScenarios,
  requireAllScenarios,
  requirePostSurvey,
}: ProtectedRouteProps) {
  // Selector-based reads so guards on quiet routes don't re-render every time
  // an unrelated slice (e.g. scenarioStartTimes) ticks.
  const token = useAppStore((s) => s.token);
  const completedScenarios = useAppStore((s) => s.completedScenarios);
  const scenarioList = useAppStore((s) => s.scenarioList);
  const testDisclaimerSeen = useAppStore((s) => s.testDisclaimerSeen);
  const productionDisclaimerSeen = useAppStore((s) => s.productionDisclaimerSeen);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Token without a populated scenarioList is an invalid state — Login.tsx
  // commits both atomically, so an empty list here means localStorage was
  // tampered with or a future code path forgot to call setScenarioList.
  // Bounce to /login to re-populate (same-token re-login preserves progress
  // because of the H1 reset logic).
  if (scenarioList.length === 0) {
    return <Navigate to="/login" replace />;
  }

  // Privacy and surveys are now handled by LimeSurvey
  // if (requirePrivacy && !privacyAccepted) {
  //   return <Navigate to="/privacy" replace />;
  // }

  // if (requireSurvey && !privacyAccepted) {
  //   return <Navigate to="/privacy" replace />;
  // }

  // if (requireSurvey && !surveyCompleted) {
  //   return <Navigate to="/survey" replace />;
  // }

  if (requireTestDisclaimer && !testDisclaimerSeen) {
    return <Navigate to="/disclaimer/test" replace />;
  }

  if (requireProductionDisclaimer) {
    // Must have completed all test scenarios first
    const testScenarios = scenarioList.filter((s) => s.scenarioKind === "TEST");
    const allTestDone = testScenarios.every((s) =>
      completedScenarios.includes(s.scenarioId),
    );
    if (!allTestDone) {
      return <Navigate to="/disclaimer/test" replace />;
    }
    if (!productionDisclaimerSeen) {
      return <Navigate to="/disclaimer/production" replace />;
    }
  }

  if (requireAllTestScenarios) {
    const testScenarios = scenarioList.filter((s) => s.scenarioKind === "TEST");
    const allTestDone = testScenarios.every((s) =>
      completedScenarios.includes(s.scenarioId),
    );
    if (!allTestDone) {
      return <Navigate to="/disclaimer/test" replace />;
    }
  }

  if (requireAllScenarios) {
    const allDone = scenarioList.every((s) =>
      completedScenarios.includes(s.scenarioId),
    );
    if (!allDone) {
      // Find the first incomplete scenario and redirect there
      const next = scenarioList.find(
        (s) => !completedScenarios.includes(s.scenarioId),
      );
      if (next) {
        return <Navigate to={`/scenario/${next.scenarioId}`} replace />;
      }
    }
  }

  // Post-survey is now handled by LimeSurvey
  // if (requirePostSurvey && !postSurveyCompleted) {
  //   return <Navigate to="/post-survey" replace />;
  // }

  return <>{children}</>;
}
