import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";

import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";

import { Login } from "./pages/Login";
import { PrivacyPolicy } from "./pages/PrivacyPolicy";
import { Disclaimer } from "./pages/Disclaimer";
import { Scenario } from "./pages/Scenario";
import { Survey } from "./pages/Survey";
import { PostSurvey } from "./pages/PostSurvey";
import { ThankYou } from "./pages/ThankYou";


export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<Layout />}>
          {/* Privacy and surveys are now handled by LimeSurvey */}
          {/* <Route
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
          /> */}
          <Route
            path="/disclaimer/:phase"
            element={
              <ProtectedRoute>
                <Disclaimer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scenario/:id"
            element={
              <ProtectedRoute requireTestDisclaimer>
                <Scenario />
              </ProtectedRoute>
            }
          />
          {/* Post-survey is now handled by LimeSurvey */}
          {/* <Route
            path="/post-survey"
            element={
              <ProtectedRoute requireSurvey requireAllScenarios>
                <PostSurvey />
              </ProtectedRoute>
            }
          /> */}
          <Route
            path="/thank-you"
            element={<ThankYou />}
          />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
