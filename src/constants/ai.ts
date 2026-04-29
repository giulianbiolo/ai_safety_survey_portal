/**
 * Configuration for the AI assistance shown during "With AI" scenarios.
 * Edit these values to change what users see in the AI instructions dialog/tab.
 */

export const AI_TOOL_NAME = "Duck.ai";
export const AI_TOOL_URL = "https://duck.ai";

export const AI_DEFAULT_PROMPT = `I am a software engineer who needs to quickly fix a security bug in a Python test.
I will provide you with the source code (testX.py) and the corresponding tests (test_casesX.py).
Some of the tests fails, indicating a vulnerability.
My goal is to modify the testX.py file to:
1. Resolve the security issue.
2. Ensure that all tests
(including the previously failing one) pass.
3. Avoid introducing any functional bugs.
Please analyze the source code, identify the bug that causes the test failure, propose a secure fix, and provide the modified Python code.
[Insert the content of testX.py here]
[Insert the content of test_casesX.py here]
What is the correct and secure code for testX.py?`;
