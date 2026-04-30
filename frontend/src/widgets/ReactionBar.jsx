import { useState } from "react";
import { Smile } from "lucide-react";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "🎉"];

function ReactionGroup({ emoji, count, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
        isActive
          ? "bg-primary/20 border-primary/50 text-primary"
          : "bg-base-200 border-base-300 hover:border-primary/40 text-base-content"
      }`}
    >
      <span>{emoji}</span>
      <span className="font-medium">{count}</span>
    </button>
  );
}

export default function ReactionBar({ reactions = [], currentUserId, onReact, isMine }) {
  const [showPicker, setShowPicker] = useState(false);

  if (!reactions || reactions.length === 0) {
    return (
      <div className={`flex items-center mt-1 ${isMine ? "justify-end" : "justify-start"}`}>
        <button
          onClick={() => setShowPicker((v) => !v)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-base-300 text-base-content/40"
        >
          <Smile size={13} />
        </button>
        {showPicker && (
          <EmojiQuickPick
            onSelect={(e) => { onReact(e); setShowPicker(false); }}
            onClose={() => setShowPicker(false)}
            alignRight={isMine}
          />
        )}
      </div>
    );
  }

  // Group by emoji
  const grouped = {};
  reactions.forEach((r) => {
    if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, users: [] };
    grouped[r.emoji].count += 1;
    grouped[r.emoji].users.push(String(r.userId));
  });

  return (
    <div className={`flex flex-wrap gap-1 mt-1 items-center ${isMine ? "justify-end" : "justify-start"}`}>
      {Object.entries(grouped).map(([emoji, { count, users }]) => (
        <ReactionGroup
          key={emoji}
          emoji={emoji}
          count={count}
          isActive={users.includes(String(currentUserId))}
          onClick={() => onReact(emoji)}
        />
      ))}
      <button
        onClick={() => setShowPicker((v) => !v)}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-base-300 text-base-content/40"
      >
        <Smile size={13} />
      </button>
      {showPicker && (
        <EmojiQuickPick
          onSelect={(e) => { onReact(e); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
          alignRight={isMine}
        />
      )}
    </div>
  );
}

function EmojiQuickPick({ onSelect, onClose, alignRight }) {
  return (
    <div className="relative z-40">
      <div className="fixed inset-0" onClick={onClose} />
      <div className={`absolute bottom-8 z-50 bg-base-200 border border-base-300 rounded-2xl shadow-xl p-2 flex gap-1 ${alignRight ? "right-0" : "left-0"}`}>
        {QUICK_EMOJIS.map((e) => (
          <button
            key={e}
            onClick={() => onSelect(e)}
            className="w-8 h-8 flex items-center justify-center text-lg hover:bg-base-300 rounded-xl transition-colors"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
