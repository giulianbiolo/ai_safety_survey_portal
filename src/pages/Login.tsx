import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { validateToken, getGroupScenarios } from "../supabase";
import { Button } from "../components/Button";
import { useAppStore } from "../store/useAppStore";

export function Login() {
  const [tokenInput, setTokenInput] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { setToken, setUser, setScenarioList, logout } = useAppStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!/^[A-Za-z0-9]{6}$/.test(tokenInput)) {
      setError("Token must be exactly 6 alphanumeric characters.");
      return;
    }

    setIsLoading(true);
    try {
      const { valid, userId, userGroup, completedSurvey, reason } =
        await validateToken(tokenInput);

      if (!valid || userId === null) {
        setError(
          reason === "rpc_error"
            ? "Couldn't reach the server. Please check your connection and try again."
            : "Invalid token. Please try again.",
        );
        return;
      }

      if (completedSurvey) {
        setError(
          "You have already completed the survey. You cannot log in again to re-submit it.",
        );
        return;
      }

      // The schema makes user_group NOT NULL, so a missing value here means
      // either a corrupted row or an unexpected RLS shape — fail loud rather
      // than silently coercing the participant into the wrong study arm.
      if (userGroup === null) {
        console.error("validateToken returned null user_group for userId", userId);
        setError(
          "Account misconfigured (missing group). Please contact the study administrator.",
        );
        return;
      }

      // Fetch the scenario list FIRST. If this fails we don't want to leave
      // a half-committed token/userId in the persisted store. The RPC takes
      // the login_code, NOT the group letter — passing userGroup here was a
      // C3-migration regression that surfaced as `{p_login_code:"A"}` on the
      // wire and an `invalid_login_code` exception from the function.
      const newToken = tokenInput.toUpperCase();
      const scenarioList = await getGroupScenarios(newToken);

      // If a different participant previously authenticated in this browser,
      // wipe their persisted progress (completedScenarios, scenarioStartTimes,
      // disclaimer flags) before committing the new identity.
      const persistedToken = useAppStore.getState().token;
      if (persistedToken && persistedToken !== newToken) {
        logout();
      }

      setToken(newToken);
      setUser(userId, userGroup);
      setScenarioList(scenarioList);

      navigate("/disclaimer/test");
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-zinc-950 h-screen">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl mx-auto flex items-center justify-center font-bold text-xl mb-4 shadow-lg shadow-indigo-500/20">
            AI
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            AI Safety Survey Portal
          </h1>
          <p className="text-zinc-400 mt-2 text-sm">
            Enter your 6-character access token to begin.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="token"
              className="block text-sm font-medium text-zinc-300"
            >
              Access Token
            </label>
            <input
              id="token"
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
              placeholder="e.g. A1B2C3"
              maxLength={6}
              className="w-full h-12 px-4 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-50 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all uppercase tracking-widest text-center font-mono text-lg"
              disabled={isLoading}
            />
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base"
            isLoading={isLoading}
          >
            Begin Survey
          </Button>
        </form>
      </div>
    </div>
  );
}
