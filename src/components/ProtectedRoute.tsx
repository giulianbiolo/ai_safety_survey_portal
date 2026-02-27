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
  const {
    token,
    privacyAccepted,
    surveyCompleted,
    completedScenarios,
    scenarioList,
    testDisclaimerSeen,
    productionDisclaimerSeen,
    postSurveyCompleted,
  } = useAppStore();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requirePrivacy && !privacyAccepted) {
    return <Navigate to="/privacy" replace />;
  }

  if (requireSurvey && !privacyAccepted) {
    return <Navigate to="/privacy" replace />;
  }

  if (requireSurvey && !surveyCompleted) {
    return <Navigate to="/survey" replace />;
  }

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

  if (requirePostSurvey && !postSurveyCompleted) {
    return <Navigate to="/post-survey" replace />;
  }

  return <>{children}</>;
}
