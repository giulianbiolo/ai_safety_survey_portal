import { motion, AnimatePresence } from "motion/react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "./Button";

interface ConfirmResetDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmResetDialog({
  open,
  onClose,
  onConfirm,
}: ConfirmResetDialogProps) {
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
            className="relative bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6"
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

            {/* Warning icon + title */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/25">
                <AlertTriangle size={22} className="text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-100">
                Reset Code?
              </h3>
            </div>

            <p className="text-sm text-zinc-400 mb-6">
              This will discard all your changes and restore the original
              scenario code. This action cannot be undone.
            </p>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="danger" onClick={onConfirm}>
                Reset Code
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
