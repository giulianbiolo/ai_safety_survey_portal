import { CheckCircle2 } from "lucide-react";
import { Button } from "../components/Button";
import { useAppStore } from "../store/useAppStore";


export function ThankYou() {
  const { logout } = useAppStore();

  const handleClose = () => {
    logout();
    window.close();
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-zinc-950">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl text-center">
        <div className="w-16 h-16 bg-green-500/10 rounded-full mx-auto flex items-center justify-center mb-6 border border-green-500/20">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 mb-2">
          Scenarios Complete
        </h1>
        <p className="text-zinc-400 mb-8">
          Thank you for completing all the scenarios! Your code submissions
          have been recorded successfully. You can now close this page and
          return to the survey to continue.
        </p>

        <Button
          onClick={handleClose}
          className="w-full h-12 text-base"
          variant="primary"
        >
          Close This Page
        </Button>
      </div>
    </div>
  );
}
