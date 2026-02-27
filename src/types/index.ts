export interface Question {
  question_id: number;
  question: string;
  type: "SINGLE_CHOICE" | "TEXT";
  answers: string[] | null; // null for TEXT questions
}

export interface ScenarioData {
  scenarioId: number;
  initialCode: string;
  testCode: string;
  readme: string;
  aiAllowed: boolean;
}

export interface RunResponse {
  stdout: string;
  stderr: string;
}

export interface TestResponse {
  passed: boolean;
  results: string[];
}

export interface SubmitResponse {
  success: boolean;
}

export interface AppState {
  token: string | null;
  userId: number | null;
  userGroup: string | null;
  privacyAccepted: boolean;
  surveyCompleted: boolean;
  surveyAnswers: Record<number, string>;
  completedScenarios: number[];
  scenarioStartTimes: Record<number, number>;
  setToken: (token: string) => void;
  setUser: (userId: number, userGroup: string) => void;
  acceptPrivacy: () => void;
  completeSurvey: (answers: Record<number, string>) => void;
  completeScenario: (id: number) => void;
  startScenario: (id: number) => void;
  logout: () => void;
}
