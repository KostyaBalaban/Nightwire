import { useRef, useEffect } from "react";
import EmojiPicker from "emoji-picker-react";
import { usePrefsStore } from "../store/prefs.store.js";

export default function EmojiPickerPopup({ onSelect, onClose }) {
  const theme = usePrefsStore((s) => s.theme);
  const isDark = theme === "nightwire";
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-2 right-0 z-50 shadow-2xl rounded-2xl overflow-hidden"
    >
      <EmojiPicker
        onEmojiClick={(data) => onSelect(data.emoji)}
        theme={isDark ? "dark" : "light"}
        height={370}
        width={320}
        lazyLoadEmojis
        searchPlaceholder="Search emoji…"
      />
    </div>
  );
}
