import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { CornerUpLeft, Edit2, Trash, Trash2, Flag } from "lucide-react";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

export default function MessageContextMenu({
  x, y, isMine, isDeleted,
  onReply, onEdit, onDeleteForMe, onDeleteForAll, onClose,
  onReact, onReport,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [onClose]);

  const safeX = Math.min(x, window.innerWidth  - 200);
  const safeY = Math.min(y, window.innerHeight - 250);

  const Item = ({ icon: Icon, label, onClick, danger }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left hover:bg-base-300 ${
        danger ? "text-error" : "text-base-content"
      }`}
    >
      <Icon size={14} className="flex-shrink-0" />
      {label}
    </button>
  );

  return (
    <>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.88 }}
        transition={{ duration: 0.12 }}
        style={{ top: safeY, left: safeX, position: "fixed", zIndex: 9999 }}
        className="bg-base-200 border border-base-300 rounded-xl shadow-2xl overflow-hidden min-w-[180px]"
      >
        {/* Quick emoji reactions */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-base-300">
          {QUICK_EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => { onReact?.(e); onClose(); }}
              className="w-8 h-8 flex items-center justify-center text-base hover:bg-base-300 rounded-lg transition-colors"
            >
              {e}
            </button>
          ))}
        </div>

        <Item icon={CornerUpLeft} label="Reply"         onClick={onReply} />
        {isMine && !isDeleted && (
          <Item icon={Edit2}      label="Edit"           onClick={onEdit} />
        )}
        <div className="border-t border-base-300" />
        {!isMine && (
          <Item icon={Flag}         label="Report"         onClick={() => { onReport?.(); onClose(); }} danger />
        )}
        <Item icon={Trash}          label="Delete for me"  onClick={onDeleteForMe} danger />
        {isMine && !isDeleted && (
          <Item icon={Trash2}       label="Delete for all" onClick={onDeleteForAll} danger />
        )}
      </motion.div>

    </>
  );
}
