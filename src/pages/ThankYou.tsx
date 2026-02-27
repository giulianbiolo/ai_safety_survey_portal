import { CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import { useAppStore } from "../store/useAppStore";


export function ThankYou() {
  const { logout } = useAppStore();
  const navigate = useNavigate();

  const handleFinish = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 bg-zinc-950">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl text-center">
        <div className="w-16 h-16 bg-green-500/10 rounded-full mx-auto flex items-center justify-center mb-6 border border-green-500/20">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 mb-2">
          Survey Complete
        </h1>
        <p className="text-zinc-400 mb-8">
          Thank you for completing the ai safety survey. Your responses and
          code submissions have been recorded successfully.
        </p>

        <Button
          onClick={handleFinish}
          className="w-full h-12 text-base"
          variant="primary"
        >
          Return to Login
        </Button>
      </div>
    </div>
  );
}
