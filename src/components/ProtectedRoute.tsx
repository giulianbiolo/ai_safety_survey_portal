import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requirePrivacy?: boolean;
  requireSurvey?: boolean;
  requireScenario?: number;
}

export function ProtectedRoute({
  children,
  requirePrivacy,
  requireSurvey,
  requireScenario,
}: ProtectedRouteProps) {
  const { token, privacyAccepted, surveyCompleted, completedScenarios } =
    useAppStore();
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

  if (requireScenario !== undefined) {
    // If requiring scenario N, scenario N-1 must be completed
    if (
      requireScenario > 1 &&
      !completedScenarios.includes(requireScenario - 1)
    ) {
      // Redirect to the earliest incomplete scenario, or survey if not done
      const nextScenario = completedScenarios.length + 1;
      return <Navigate to={`/scenario/${nextScenario}`} replace />;
    }
  }

  return <>{children}</>;
}
