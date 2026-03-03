import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { getScenario, submitScenario } from "../supabase";
import type { UserGroup } from "../supabase";
import { usePyodide } from "../pyodide/usePyodide";
import { Button } from "../components/Button";
import { EditorWrapper } from "../components/EditorWrapper";
import { useAppStore } from "../store/useAppStore";
import { ScenarioData } from "../types";
import { cn } from "../utils/cn";

const SCENARIO_TIME_LIMIT = 900; // 15 minutes in seconds

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function Scenario() {
  const { id } = useParams<{ id: string }>();
  const scenarioId = parseInt(id || "1", 10);
  const navigate = useNavigate();
  const {
    completedScenarios,
    completeScenario,
    scenarioStartTimes,
    startScenario,
    userId,
    userGroup,
    scenarioList,
  } = useAppStore();
  const { ready: pyodideReady, loading: pyodideLoading, runTests } = usePyodide();

  const [scenario, setScenario] = useState<ScenarioData | null>(null);
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [output, setOutput] = useState<string>("");
  const [testResults, setTestResults] = useState<string[]>([]);
  const [testPassed, setTestPassed] = useState<boolean | null>(null);
  const [timeLeft, setTimeLeft] = useState(SCENARIO_TIME_LIMIT);
  const [referenceTab, setReferenceTab] = useState<"test" | "readme">("test");
  const [testRunCount, setTestRunCount] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isCompleted = completedScenarios.includes(scenarioId);

  // Find current scenario's position in the ordered list
  const currentIndex = scenarioList.findIndex(
    (s) => s.scenarioId === scenarioId,
  );
  const currentEntry = scenarioList[currentIndex];
  const currentKind = currentEntry?.scenarioKind;

  // Scenarios in the current phase
  const phaseScenarios = scenarioList.filter(
    (s) => s.scenarioKind === currentKind,
  );
  const phaseIndex = phaseScenarios.findIndex(
    (s) => s.scenarioId === scenarioId,
  );

  // Enforce linear progression within the scenario list
  if (currentIndex > 0 && scenarioList.length > 0) {
    // Check that all previous scenarios in the list are completed
    const prevEntry = scenarioList[currentIndex - 1];
    if (prevEntry && !completedScenarios.includes(prevEntry.scenarioId)) {
      // Find the first incomplete scenario
      const next = scenarioList.find(
        (s) => !completedScenarios.includes(s.scenarioId),
      );
      if (next) {
        return <Navigate to={`/scenario/${next.scenarioId}`} replace />;
      }
    }
  }

  // If this scenario ID is not in the list at all, redirect
  if (scenarioList.length > 0 && currentIndex === -1) {
    return <Navigate to="/login" replace />;
  }

  /**
   * Compute where to navigate after completing the current scenario.
   */
  function getNextDestination(): string {
    // Find next scenario in the same phase
    const nextInPhase = phaseScenarios.find(
      (s) =>
        !completedScenarios.includes(s.scenarioId) &&
        s.scenarioId !== scenarioId,
    );

    if (nextInPhase) {
      return `/scenario/${nextInPhase.scenarioId}`;
    }

    // Current phase is done
    if (currentKind === "TEST") {
      // Move to production disclaimer
      return "/disclaimer/production";
    }

    // Production phase done — proceed to post-survey
    return "/post-survey";
  }

  useEffect(() => {
    const fetchScenario = async () => {
      setIsLoading(true);
      try {
        const data = await getScenario(scenarioId, (userGroup ?? "A") as UserGroup);
        setScenario(data);
        setCode(data.initialCode);
        setOutput("");
        setTestResults([]);
        setTestPassed(null);

        // Record start time (only sets once per scenario, persisted in localStorage)
        startScenario(scenarioId);
      } catch (error) {
        console.error("Failed to fetch scenario", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchScenario();
  }, [scenarioId, startScenario, userGroup]);

  // Compute remaining time from persisted start timestamp
  useEffect(() => {
    if (isCompleted) return;

    const computeTimeLeft = () => {
      const startTime = scenarioStartTimes[scenarioId];
      if (startTime == null) return SCENARIO_TIME_LIMIT;
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      return Math.max(SCENARIO_TIME_LIMIT - elapsed, 0);
    };

    setTimeLeft(computeTimeLeft());

    timerRef.current = setInterval(() => {
      const remaining = computeTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0 && timerRef.current) {
        clearInterval(timerRef.current);
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [scenarioId, isCompleted, scenarioStartTimes]);

  // Handle timeout (timeLeft reaching 0)
  useEffect(() => {
    if (timeLeft !== 0 || isCompleted) return;

    const handleTimeout = async () => {
      setIsSubmitting(true);
      try {
        await submitScenario(userId!, scenarioId, "TIMEOUT", SCENARIO_TIME_LIMIT, (userGroup ?? "A") as UserGroup, testRunCount);
        completeScenario(scenarioId);
        navigate(getNextDestination());
      } catch (error) {
        console.error("Failed to submit scenario on timeout", error);
      } finally {
        setIsSubmitting(false);
      }
    };

    handleTimeout();
  }, [timeLeft, isCompleted, scenarioId, completeScenario, navigate]);

  const handleTest = async () => {
    if (!pyodideReady || !scenario) return;
    setIsTesting(true);
    setTestRunCount((c) => c + 1);
    setOutput("Running tests...");
    setTestResults([]);
    setTestPassed(null);
    try {
      const result = await runTests(code, scenario.testCode);
      setTestPassed(result.passed);
      setTestResults(result.results);
      setOutput(
        result.passed ? "All tests passed successfully!" : "Some tests failed.",
      );
    } catch (error) {
      setOutput("Error running tests.");
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const elapsed = scenarioStartTimes[scenarioId]
        ? Math.floor((Date.now() - scenarioStartTimes[scenarioId]) / 1000)
        : null;
      await submitScenario(userId!, scenarioId, code, elapsed, (userGroup ?? "A") as UserGroup, testRunCount);
      completeScenario(scenarioId);
      navigate(getNextDestination());
    } catch (error) {
      console.error("Failed to submit scenario", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !scenario) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const actionsDisabled = isCompleted || isTesting || isSubmitting;

  // Bottom bar label: "Test Scenario X of Y" or "Scenario X of Y"
  const phaseLabel = currentKind === "TEST" ? "Test Scenario" : "Scenario";
  const phasePosition = phaseIndex + 1;
  const phaseTotal = phaseScenarios.length;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Editable scenario code */}
        <div className="flex-1 flex flex-col border-r border-zinc-800 min-w-0">
          <div className="h-10 border-b border-zinc-800 bg-zinc-900/50 flex items-center px-4 shrink-0">
            <h2 className="text-sm font-medium text-zinc-300">
              scenario_{scenarioId}.py
            </h2>
            {isCompleted && (
              <span className="ml-3 px-2 py-0.5 rounded text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                Completed
              </span>
            )}
            <span
              className={cn(
                "ml-3 px-2 py-0.5 rounded text-xs font-medium border",
                scenario.aiAllowed
                  ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20",
              )}
            >
              {scenario.aiAllowed ? "With AI" : "Human Only"}
            </span>
          </div>
          <div className="flex-1 min-h-0">
            <EditorWrapper
              value={code}
              onChange={(val) => setCode(val || "")}
              readOnly={isCompleted || isSubmitting}
            />
          </div>
        </div>

        {/* Read-only reference panel (test code + README, tabbed) */}
        <div className="flex-1 flex flex-col border-r border-zinc-800 min-w-0">
          <div className="h-10 border-b border-zinc-800 bg-zinc-900/50 flex items-center px-4 gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setReferenceTab("test")}
              className={cn(
                "px-3 py-1 rounded text-xs font-medium transition-colors",
                referenceTab === "test"
                  ? "bg-zinc-700 text-zinc-200"
                  : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              test_{scenarioId}.py
            </button>
            <button
              type="button"
              onClick={() => setReferenceTab("readme")}
              className={cn(
                "px-3 py-1 rounded text-xs font-medium transition-colors",
                referenceTab === "readme"
                  ? "bg-zinc-700 text-zinc-200"
                  : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              README.md
            </button>
            <span className="ml-auto px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-500">
              Read-only
            </span>
          </div>
          <div className="flex-1 min-h-0">
            <EditorWrapper
              value={referenceTab === "test" ? scenario.testCode : scenario.readme}
              onChange={() => {}}
              language={referenceTab === "test" ? "python" : "markdown"}
              readOnly={true}
            />
          </div>
        </div>

        {/* Output & tests panel */}
        <div className="w-full lg:w-96 flex flex-col bg-zinc-950 shrink-0 border-t lg:border-t-0 border-zinc-800">
          <div className="h-10 border-b border-zinc-800 bg-zinc-900/50 flex items-center px-4 shrink-0">
            <h2 className="text-sm font-medium text-zinc-300">
              Output & Tests
            </h2>
            {pyodideLoading && (
              <span className="ml-auto text-xs text-amber-400 flex items-center gap-1.5">
                <div className="animate-spin rounded-full h-3 w-3 border-b border-amber-400"></div>
                Loading Python runtime...
              </span>
            )}
            {pyodideReady && !pyodideLoading && (
              <span className="ml-auto text-xs text-green-500">
                Python ready
              </span>
            )}
          </div>
          <div className="flex-1 min-h-0 p-4 overflow-y-auto font-mono text-sm space-y-4 custom-scrollbar">
            {output && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-md p-3">
                <div className="text-zinc-500 text-xs mb-2 uppercase tracking-wider">
                  Output
                </div>
                <pre className="text-zinc-300 whitespace-pre-wrap">
                  {output}
                </pre>
              </div>
            )}

            {testResults.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-md p-3 flex flex-col min-h-0">
                <div className="text-zinc-500 text-xs mb-2 uppercase tracking-wider shrink-0">
                  Test Results
                </div>
                <div className="space-y-1 overflow-y-auto max-h-[60vh] custom-scrollbar">
                  {testResults.map((res, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        res.includes("PASS")
                          ? "text-green-400"
                          : res.includes("FAIL") || res.includes("SECURITY ISSUE")
                            ? "text-red-400"
                            : "text-zinc-400",
                      )}
                    >
                      {res}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!output && testResults.length === 0 && (
              <div className="text-zinc-600 text-center mt-10">
                Run tests to see output here.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="h-16 border-t border-zinc-800 bg-zinc-900 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-400">
            {phaseLabel} {phasePosition} of {phaseTotal}
          </span>
          {!isCompleted && (
            <span
              className={cn(
                "text-sm font-mono font-medium tabular-nums",
                timeLeft < 60 ? "text-red-400" : "text-zinc-300",
              )}
            >
              ⏱ {formatTime(timeLeft)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={handleTest}
            disabled={actionsDisabled || !pyodideReady}
            isLoading={isTesting}
          >
            Run Tests
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={actionsDisabled}
            isLoading={isSubmitting}
          >
            {isCompleted ? "Submitted" : "Submit Scenario"}
          </Button>
        </div>
      </div>
    </div>
  );
}
