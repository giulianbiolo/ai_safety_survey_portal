export type UserGroup = "A" | "B" | "C";
export type ScenarioModality = "HUMAN_ONLY" | "WITH_AI";
export type QuestionType = "SINGLE_CHOICE" | "TEXT";
export type QuestionKind = "PRELIMINARY" | "POSTSURVEY";
export type ScenarioKind = "TEST" | "PRODUCTION";

export interface DbUser {
  id: number;
  login_code: string;
  session_token: string | null;
  user_group: UserGroup;
  completed_survey: boolean;
}

export interface DbSurveyQuestion {
  id: number;
  question_title: string;
  question_type: QuestionType;
  possible_answers: string | null;
  question_kind: QuestionKind;
  order: number;
}

export interface DbUserSurveyAnswer {
  id: number;
  user_id: number;
  question_id: number;
  answer: string;
}

export interface DbScenario {
  id: number;
  name: string;
  description: string | null;
  scenario_code: string;
  test_code: string;
  readme: string | null;
  scenario_kind: ScenarioKind;
}

export interface DbUserScenarioSubmit {
  id: number;
  user_id: number;
  scenario_id: number;
  submit_time: number | null;
  submit_code: string | null;
  test_run_count: number;
}

export interface DbUserScenarioTestHistory {
  id: number;
  user_id: number;
  scenario_id: number;
  submit_time: number | null;
  submit_code: string;
  test_run_count: number;
}

export interface DbScenarioGroup {
  id: number;
  group: UserGroup;
  scenario_id: number;
  modality: ScenarioModality;
}

