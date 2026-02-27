import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";

import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";

import { Login } from "./pages/Login";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";
import { Scenario } from "./pages/Scenario";
import { Survey } from "./pages/Survey";
import { ThankYou } from "./pages/ThankYou";


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<Layout />}>
          <Route
            path="/privacy"
            element={
              <ProtectedRoute>
                <PrivacyPolicy />
              </ProtectedRoute>
            }
          />
          <Route
            path="/survey"
            element={
              <ProtectedRoute requirePrivacy>
                <Survey />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scenario/:id"
            element={
              <ProtectedRoute requireSurvey>
                <Scenario />
              </ProtectedRoute>
            }
          />
          <Route
            path="/thank-you"
            element={
              <ProtectedRoute requireSurvey requireScenario={4}>
                <ThankYou />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
