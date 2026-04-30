import { X, CornerUpLeft } from "lucide-react";

export default function ReplyPreview({ msg, onCancel }) {
  return (
    <div className="px-4 py-2 bg-base-200 border-t border-base-300 flex items-center gap-3 flex-shrink-0">
      <CornerUpLeft size={14} className="text-primary flex-shrink-0" />
      <div className="flex-1 min-w-0 border-l-2 border-primary pl-2">
        <p className="text-xs text-primary mb-0.5 font-medium">Reply</p>
        {msg.isDeletedForEveryone ? (
          <p className="text-xs text-base-content/40 italic">Message deleted</p>
        ) : (
          <p className="text-xs text-base-content/60 truncate">
            {msg.image && !msg.text ? "📷 Photo" : msg.text}
          </p>
        )}
      </div>
      <button
        onClick={onCancel}
        className="btn btn-ghost btn-xs btn-circle flex-shrink-0"
      >
        <X size={12} />
      </button>
    </div>
  );
}
