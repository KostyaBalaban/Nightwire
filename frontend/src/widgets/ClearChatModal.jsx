import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";

export default function ClearChatModal({ userName, onConfirm, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.15 }}
        className="bg-base-200 rounded-2xl p-6 w-80 border border-base-300 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-error/15 flex items-center justify-center flex-shrink-0">
            <Trash2 size={18} className="text-error" />
          </div>
          <div>
            <p className="font-semibold text-base-content">Clear chat history</p>
            <p className="text-xs text-base-content/40">Cannot be undone</p>
          </div>
        </div>

        <p className="text-sm text-base-content/70 mb-5">
          Delete all messages with <strong>{userName}</strong>?
        </p>

        <div className="flex gap-2">
          <button onClick={onClose} className="btn btn-ghost flex-1 btn-sm">
            Cancel
          </button>
          <button onClick={onConfirm} className="btn btn-error flex-1 btn-sm">
            Clear all
          </button>
        </div>
      </motion.div>
    </div>
  );
}
