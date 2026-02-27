import { useAppStore } from "../store/useAppStore";
import { SurveyPage } from "../components/SurveyPage";

export function PostSurvey() {
  const { completePostSurvey, postSurveyCompleted } = useAppStore();

  return (
    <SurveyPage
      kind="POSTSURVEY"
      title="Post-Study Survey"
      subtitle="You have completed all coding scenarios. Please answer the following questions before finishing."
      submitLabel="Submit & Finish"
      redirectIfDone="/thank-you"
      redirectAfterSubmit="/thank-you"
      isAlreadyDone={postSurveyCompleted}
      onSubmit={() => completePostSurvey()}
      markCompleted
    />
  );
}
