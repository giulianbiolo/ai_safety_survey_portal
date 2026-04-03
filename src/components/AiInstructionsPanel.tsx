import { useState } from "react";
import { Bot, Copy, Check } from "lucide-react";
import { AI_TOOL_NAME, AI_DEFAULT_PROMPT } from "../constants/ai";

export function AiInstructionsPanel() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(AI_DEFAULT_PROMPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5 custom-scrollbar">
      {/* AI tool badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-500/15 border border-indigo-500/25">
          <Bot size={20} className="text-indigo-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">
            AI Assistance Enabled
          </h3>
          <p className="text-xs text-zinc-400">
            Use{" "}
            <span className="font-semibold text-indigo-400">
              {AI_TOOL_NAME}
            </span>{" "}
            for this scenario
          </p>
        </div>
      </div>

      {/* Prompt */}
      <div>
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
        <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">
          {AI_DEFAULT_PROMPT}
        </pre>
      </div>
    </div>
  );
}
