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
  scenarioKind: "TEST" | "PRODUCTION";
}

export interface ScenarioListEntry {
  scenarioId: number;
  modality: string;
  scenarioKind: "TEST" | "PRODUCTION";
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
  scenarioList: ScenarioListEntry[];
  testDisclaimerSeen: boolean;
  productionDisclaimerSeen: boolean;
  setToken: (token: string) => void;
  setUser: (userId: number, userGroup: string) => void;
  acceptPrivacy: () => void;
  completeSurvey: (answers: Record<number, string>) => void;
  completeScenario: (id: number) => void;
  startScenario: (id: number) => void;
  setScenarioList: (list: ScenarioListEntry[]) => void;
  seeTestDisclaimer: () => void;
  seeProductionDisclaimer: () => void;
  logout: () => void;
}
