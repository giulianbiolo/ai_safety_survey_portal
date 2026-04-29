import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, Copy, Check, X } from "lucide-react";
import { Button } from "./Button";
import { AI_TOOL_NAME, AI_TOOL_URL, AI_DEFAULT_PROMPT } from "../constants/ai";

interface AiInfoDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AiInfoDialog({ open, onClose }: AiInfoDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(AI_DEFAULT_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

            {/* AI tool badge */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-500/15 border border-indigo-500/25">
                <Bot size={22} className="text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">
                  AI Assistance Enabled
                </h3>
                <p className="text-sm text-zinc-400">
                  Use{" "}
                  <a
                    href={AI_TOOL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
                  >
                    {AI_TOOL_NAME}
                  </a>{" "}
                  to help you with this scenario
                </p>
              </div>
            </div>

            {/* Prompt section */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Default Prompt
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check size={14} className="text-green-400" />
                      <span className="text-green-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed max-h-60 overflow-y-auto custom-scrollbar">
                {AI_DEFAULT_PROMPT}
              </pre>
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
