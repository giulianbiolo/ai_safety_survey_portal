import { useAppStore } from "../store/useAppStore";
import { SurveyPage } from "../components/SurveyPage";

export function Survey() {
  const { completeSurvey, surveyCompleted } = useAppStore();

  return (
    <SurveyPage
      kind="PRELIMINARY"
      title="Preliminary Survey"
      subtitle="Please answer all questions before proceeding to the coding scenarios."
      submitLabel="Submit Survey & Continue"
      redirectIfDone="/scenario/1"
      redirectAfterSubmit="/scenario/1"
      isAlreadyDone={surveyCompleted}
      onSubmit={(answers) => completeSurvey(answers)}
    />
  );
}
