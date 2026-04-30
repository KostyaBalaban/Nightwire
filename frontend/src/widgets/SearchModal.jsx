import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { useChatStore } from "../store/chat.store.js";
import { useSessionStore } from "../store/session.store.js";

function Highlight({ text, query }) {
  if (!query.trim() || !text) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-primary/30 text-base-content rounded-sm px-0.5 not-italic">
            {p}
          </mark>
        ) : (
          p
        )
      )}
    </>
  );
}

export default function SearchModal({ onClose, onNavigate }) {
  const [query, setQuery] = useState("");
  const timerRef = useRef(null);

  const searchMessages  = useChatStore((s) => s.searchMessages);
  const searchResults   = useChatStore((s) => s.searchResults);
  const isSearching     = useChatStore((s) => s.isSearching);
  const clearSearch     = useChatStore((s) => s.clearSearchResults);
  const currentUser     = useSessionStore((s) => s.user);

  const handleInput = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (q.trim().length > 1) searchMessages(q);
      else clearSearch();
    }, 380);
  };

  const handleClose = () => {
    clearSearch();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-16 px-4"
      onClick={handleClose}
    >
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        transition={{ duration: 0.15 }}
        className="bg-base-200 rounded-2xl w-full max-w-lg border border-base-300 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-base-300">
          <Search size={16} className="text-base-content/40 flex-shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={handleInput}
            placeholder="Search messages…"
            className="flex-1 bg-transparent text-base-content placeholder:text-base-content/40 outline-none text-sm"
          />
          <button
            onClick={handleClose}
            className="btn btn-ghost btn-xs btn-circle flex-shrink-0"
          >
            <X size={15} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {isSearching && (
            <div className="flex justify-center py-10">
              <span className="loading loading-dots loading-sm text-primary" />
            </div>
          )}

          {!isSearching && query.length > 1 && searchResults.length === 0 && (
            <p className="text-center text-base-content/40 text-sm py-10">
              No messages found
            </p>
          )}

          {!isSearching &&
            searchResults.map((msg) => {
              const isMine  = String(msg.senderId?._id) === String(currentUser?._id);
              const partner = isMine ? msg.receiverId : msg.senderId;

              return (
                <button
                  key={msg._id}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-base-300 transition-colors text-left border-b border-base-300/50 last:border-0"
                  onClick={() => { onNavigate(msg); handleClose(); }}
                >
                  {partner?.profilePic ? (
                    <img
                      src={partner.profilePic}
                      alt={partner.fullName}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-ember-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                      {partner?.fullName?.[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-base-content/50 mb-0.5">
                      {partner?.fullName}
                    </p>
                    <p className="text-sm text-base-content truncate">
                      <Highlight text={msg.text} query={query} />
                    </p>
                  </div>
                  <span className="text-xs text-base-content/30 flex-shrink-0 mt-1">
                    {new Date(msg.createdAt).toLocaleDateString()}
                  </span>
                </button>
              );
            })}
        </div>
      </motion.div>
    </div>
  );
}
