import { useCallback, useEffect, useRef, useState } from "react";
import { extractModuleName, parsePytestOutput } from "./helpers";
import type { RunResponse, TestResponse } from "../types";

// ── Singleton state (shared across all hook instances) ──────────────

let pyodideInstance: PyodideInterface | null = null;
let pyodideLoadPromise: Promise<PyodideInterface> | null = null;

const WORK_DIR = "/home/pyodide/work";

async function getPyodide(): Promise<PyodideInterface> {
  if (pyodideInstance) return pyodideInstance;
  if (pyodideLoadPromise) return pyodideLoadPromise;

  pyodideLoadPromise = (async () => {
    const pyodide = await window.loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.5/full/",
    });

    // Install pytest (required for running tests) and sqlite3 which is used in one of the tests
    await pyodide.loadPackage("micropip");
    await pyodide.runPythonAsync(`
import micropip
await micropip.install("pytest")
await micropip.install("sqlite3")
`);

    // Create working directory
    pyodide.FS.mkdirTree(WORK_DIR);

    // Add work dir to sys.path and set up subprocess stub
    await pyodide.runPythonAsync(`
import sys
if "${WORK_DIR}" not in sys.path:
    sys.path.insert(0, "${WORK_DIR}")

# Stub subprocess module for scenarios that import it (e.g. T2).
# subprocess cannot work in a browser sandbox, but we simulate basic
# shell side-effects so that command-injection tests can detect
# vulnerabilities via file-creation checks.
import types as _types
import os as _os
import re as _re

_stub = _types.ModuleType("subprocess")
_stub.PIPE = -1
_stub.STDOUT = -2
_stub.DEVNULL = -3

class _StubTimeoutExpired(Exception):
    pass
_stub.TimeoutExpired = _StubTimeoutExpired

class _StubCompletedProcess:
    def __init__(self, returncode=1, stdout="", stderr=""):
        self.returncode = returncode
        self.stdout = stdout
        self.stderr = stderr

def _simulate_shell_side_effects(cmd_str):
    """
    Parse a shell command string for injected sub-commands and simulate
    their file-system side-effects. This allows security tests that check
    for file creation (e.g. 'touch file' or 'echo X > file') to detect
    command injection even though real shell execution is unavailable.
    """
    # Split on common shell operators: ; && || | &
    # Also handle backtick sub-shells by stripping backticks first
    cleaned = cmd_str.replace("\`", " ")
    parts = _re.split(r'\\s*(?:;|&&|\\|\\||\\||&)\\s*', cleaned)

    for part in parts:
        part = part.strip()
        if not part:
            continue

        # touch <file>
        m = _re.match(r'touch\\s+(\\S+)', part)
        if m:
            try:
                open(m.group(1), 'a').close()
            except Exception:
                pass
            continue

        # echo <content> > <file>  (with optional 2>&1 stripped)
        m = _re.match(r'echo\\s+(.*?)\\s*(?:2>&1\\s*)?(?:>)\\s*(\\S+)', part)
        if m:
            try:
                with open(m.group(2), 'w') as _f:
                    _f.write(m.group(1).strip() + '\\n')
            except Exception:
                pass
            continue

        # Generic <cmd> > <file> redirection (cat, set, env, ls, dir, type …)
        m = _re.match(r'\\S+.*?\\s+(?:2>&1\\s*)?(?:>)\\s*(\\S+)', part)
        if m:
            filepath = _re.sub(r'\\s*2>&1\\s*', '', m.group(1)).strip()
            if filepath:
                try:
                    with open(filepath, 'w') as _f:
                        _f.write('SIMULATED_OUTPUT\\n')
                except Exception:
                    pass
            continue

def _stub_run(*args, **kwargs):
    cmd = args[0] if args else kwargs.get('args', '')
    shell = kwargs.get('shell', False)

    if shell and isinstance(cmd, str):
        _simulate_shell_side_effects(cmd)

    return _StubCompletedProcess()

def _stub_check_output(*args, **kwargs):
    return b""

_stub.run = _stub_run
_stub.check_output = _stub_check_output
_stub.Popen = None
sys.modules["subprocess"] = _stub
`);

    pyodideInstance = pyodide;
    return pyodide;
  })();

  return pyodideLoadPromise;
}

// ── Helper: clean up cached modules between runs ────────────────────

function buildCleanupCode(moduleName: string): string {
  return `
import sys
# Remove cached scenario module so re-imports pick up the latest code
for _mod_name in list(sys.modules.keys()):
    if _mod_name == "${moduleName}" or _mod_name.startswith("${moduleName}."):
        del sys.modules[_mod_name]
`;
}

// ── Hook ─────────────────────────────────────────────────────────────

export function usePyodide() {
  const [ready, setReady] = useState(!!pyodideInstance);
  const [loading, setLoading] = useState(false);
  const initStarted = useRef(false);

  // Start loading on mount (only once globally)
  useEffect(() => {
    if (pyodideInstance) {
      setReady(true);
      return;
    }
    if (initStarted.current) return;
    initStarted.current = true;

    setLoading(true);
    getPyodide()
      .then(() => {
        setReady(true);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load Pyodide:", err);
        setLoading(false);
      });
  }, []);

  // ── Run arbitrary Python code ──────────────────────────────────────

  const runCode = useCallback(
    async (code: string): Promise<RunResponse> => {
      const pyodide = await getPyodide();

      const wrappedCode = `
import sys, io

_stdout_capture = io.StringIO()
_stderr_capture = io.StringIO()
sys.stdout = _stdout_capture
sys.stderr = _stderr_capture

try:
    exec(open("${WORK_DIR}/scenario.py").read(), {"__name__": "__main__"})
except Exception as _e:
    import traceback
    _stderr_capture.write(traceback.format_exc())
finally:
    sys.stdout = sys.__stdout__
    sys.stderr = sys.__stderr__

(_stdout_capture.getvalue(), _stderr_capture.getvalue())
`;
      try {
        pyodide.FS.writeFile(`${WORK_DIR}/scenario.py`, code);
        const result = await pyodide.runPythonAsync(wrappedCode);
        const stdout: string = result.get(0) ?? "";
        const stderr: string = result.get(1) ?? "";
        result.destroy?.();
        return { stdout: stdout || "(no output)", stderr };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { stdout: "", stderr: message };
      }
    },
    [],
  );

  // ── Run pytest ─────────────────────────────────────────────────────

  const runTests = useCallback(
    async (scenarioCode: string, testCode: string): Promise<TestResponse> => {
      const pyodide = await getPyodide();

      const moduleName = extractModuleName(testCode);
      const scenarioPath = `${WORK_DIR}/${moduleName}.py`;
      const testPath = `${WORK_DIR}/test_${moduleName}.py`;

      try {
        // Write files to the virtual filesystem
        pyodide.FS.writeFile(scenarioPath, scenarioCode);
        pyodide.FS.writeFile(testPath, testCode);

        // Clear cached module so changes are picked up
        await pyodide.runPythonAsync(buildCleanupCode(moduleName));

        // Run pytest and capture output
        const pytestCode = `
import sys, io

_test_stdout = io.StringIO()
_test_stderr = io.StringIO()
_old_stdout = sys.stdout
_old_stderr = sys.stderr
sys.stdout = _test_stdout
sys.stderr = _test_stderr

try:
    import pytest
    _exit_code = pytest.main([
        "${testPath}",
        "-v",
        "--tb=short",
        "--no-header",
        "-q",
    ])
except Exception as _e:
    import traceback
    _test_stderr.write(traceback.format_exc())
    _exit_code = 1
finally:
    sys.stdout = _old_stdout
    sys.stderr = _old_stderr

(_test_stdout.getvalue(), _test_stderr.getvalue(), int(_exit_code))
`;
        const result = await pyodide.runPythonAsync(pytestCode);
        const stdout: string = result.get(0) ?? "";
        const stderr: string = result.get(1) ?? "";
        const exitCode: number = result.get(2) ?? 1;
        result.destroy?.();

        const combined = stdout + (stderr ? "\n" + stderr : "");
        const parsed = parsePytestOutput(combined);

        // If parser found no structured results, use exit code
        if (parsed.results.length <= 1) {
          return {
            passed: exitCode === 0,
            results: combined.split("\n").filter((l) => l.trim()),
          };
        }

        return {
          passed: parsed.passed && exitCode === 0,
          results: parsed.results,
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          passed: false,
          results: [`Error running tests: ${message}`],
        };
      }
    },
    [],
  );

  return { ready, loading, runCode, runTests };
}
