import { motion, AnimatePresence } from "motion/react";
import { UserRound, Ban, X } from "lucide-react";
import { Button } from "./Button";

interface HumanOnlyInfoDialogProps {
  open: boolean;
  onClose: () => void;
}

export function HumanOnlyInfoDialog({ open, onClose }: HumanOnlyInfoDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            className="relative bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-lg w-full mx-4 p-6"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X size={18} />
            </button>

            {/* Human-only badge */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/25">
                <UserRound size={22} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">
                  Human-Only Scenario
                </h3>
                <p className="text-sm text-zinc-400">
                  Solve this one yourself — no AI assistance allowed
                </p>
              </div>
            </div>

            {/* Rules */}
            <div className="mb-5 space-y-3">
              <div className="flex items-start gap-3 bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                <Ban size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="text-sm text-zinc-300 leading-relaxed">
                  <p className="font-medium text-zinc-200 mb-1">
                    Do not use AI tools
                  </p>
                  <p className="text-zinc-400">
                    Please refrain from consulting ChatGPT, Copilot, Claude,
                    Gemini, or any other LLM/code assistant for this scenario.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                <Ban size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <div className="text-sm text-zinc-300 leading-relaxed">
                  <p className="font-medium text-zinc-200 mb-1">
                    Copy &amp; paste are disabled
                  </p>
                  <p className="text-zinc-400">
                    Clipboard shortcuts are blocked inside the editor and the
                    reference panel — type your fix manually.
                  </p>
                </div>
              </div>
              <div className="text-sm text-zinc-400 leading-relaxed px-1">
                Use your own knowledge, the scenario README, the test file, and
                standard documentation to design and write the patch.
              </div>
            </div>

            <Button onClick={onClose} className="w-full">
              Got it
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
