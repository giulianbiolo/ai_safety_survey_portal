import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AppState } from "../types";


export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      userGroup: null,
      privacyAccepted: false,
      surveyCompleted: false,
      surveyAnswers: {},
      completedScenarios: [],
      scenarioStartTimes: {},
      scenarioList: [],
      testDisclaimerSeen: false,
      productionDisclaimerSeen: false,
      postSurveyCompleted: false,
      setToken: (token) => set({ token }),
      setUser: (userId, userGroup) => set({ userId, userGroup }),
      acceptPrivacy: () => set({ privacyAccepted: true }),
      completeSurvey: (answers) =>
        set({ surveyCompleted: true, surveyAnswers: answers }),
      completeScenario: (id) =>
        set((state) => ({
          completedScenarios: state.completedScenarios.includes(id)
            ? state.completedScenarios
            : [...state.completedScenarios, id],
        })),
      startScenario: (id) =>
        set((state) => ({
          scenarioStartTimes:
            state.scenarioStartTimes[id] != null
              ? state.scenarioStartTimes
              : { ...state.scenarioStartTimes, [id]: Date.now() },
        })),
      setScenarioList: (list) => set({ scenarioList: list }),
      seeTestDisclaimer: () => set({ testDisclaimerSeen: true }),
      seeProductionDisclaimer: () => set({ productionDisclaimerSeen: true }),
      completePostSurvey: () => set({ postSurveyCompleted: true }),
      logout: () =>
        set({
          token: null,
          userId: null,
          userGroup: null,
          privacyAccepted: false,
          surveyCompleted: false,
          surveyAnswers: {},
          completedScenarios: [],
          scenarioStartTimes: {},
          scenarioList: [],
          testDisclaimerSeen: false,
          productionDisclaimerSeen: false,
          postSurveyCompleted: false,
        }),
    }),
    {
      name: "survey-storage",
    },
  ),
);
