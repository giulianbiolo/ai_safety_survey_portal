/**
 * Extract the module name that the test file imports from.
 * Parses lines like `from user_auth import UserAuthSystem`
 * or `import system_monitor` to get the module name.
 */
export function extractModuleName(testCode: string): string {
  const lines = testCode.split("\n");
  for (const line of lines) {
    const fromMatch = line.match(/^from\s+(\w+)\s+import/);
    if (fromMatch) {
      // Skip standard library / pytest imports
      const mod = fromMatch[1];
      if (!isStdlib(mod)) return mod;
    }
    const importMatch = line.match(/^import\s+(\w+)/);
    if (importMatch) {
      const mod = importMatch[1];
      if (!isStdlib(mod)) return mod;
    }
  }
  return "scenario";
}

const STDLIB_MODULES = new Set([
  "pytest",
  "os",
  "sys",
  "time",
  "json",
  "re",
  "math",
  "random",
  "hashlib",
  "sqlite3",
  "subprocess",
  "platform",
  "io",
  "datetime",
  "collections",
  "functools",
  "itertools",
  "pathlib",
  "typing",
  "unittest",
  "tempfile",
  "shutil",
  "logging",
  "enum",
  "abc",
  "copy",
  "uuid",
  "base64",
  "hmac",
  "secrets",
  "string",
  "textwrap",
  "struct",
  "socket",
  "http",
  "urllib",
]);

function isStdlib(name: string): boolean {
  return STDLIB_MODULES.has(name);
}

/**
 * Parse pytest verbose output into structured results.
 * Expects `-v --tb=short` style output.
 */
export function parsePytestOutput(raw: string): {
  passed: boolean;
  results: string[];
} {
  const lines = raw.split("\n");
  const results: string[] = [];
  let totalPassed = 0;
  let totalFailed = 0;

  for (const line of lines) {
    // Match lines like: test_file.py::TestClass::test_name PASSED
    // or: test_file.py::TestClass::test_name FAILED
    const testMatch = line.match(/::(\S+)\s+(PASSED|FAILED|ERROR)/);
    if (testMatch) {
      const testName = testMatch[1].replace(/::/g, " > ");
      const status = testMatch[2];
      if (status === "PASSED") {
        totalPassed++;
        results.push(`PASS: ${testName}`);
      } else {
        totalFailed++;
        results.push(`FAIL: ${testName}`);
      }
      continue;
    }

    // Capture failure details (lines starting with E or FAILED)
    if (
      line.startsWith("E ") ||
      line.startsWith("FAILED") ||
      line.match(/^\s+assert\s/) ||
      line.includes("SECURITY ISSUE")
    ) {
      results.push(line.trim());
    }
  }

  // If no structured results were parsed, include the raw output
  if (results.length === 0) {
    const meaningful = lines.filter((l) => l.trim().length > 0);
    results.push(...meaningful.slice(-20));
  }

  // Summary line
  if (totalPassed > 0 || totalFailed > 0) {
    results.push(
      `\n${totalPassed} passed, ${totalFailed} failed`,
    );
  }

  return {
    passed: totalFailed === 0 && totalPassed > 0,
    results,
  };
}
