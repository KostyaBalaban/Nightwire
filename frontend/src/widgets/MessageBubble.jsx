import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useChatStore } from "../store/chat.store.js";
import MessageStatus from "./MessageStatus.jsx";
import ReplyQuote from "./ReplyQuote.jsx";
import MessageContextMenu from "./MessageContextMenu.jsx";
import ReportModal from "./ReportModal.jsx";
import FileCard from "./FileCard.jsx";
import ReactionBar from "./ReactionBar.jsx";
import toast from "react-hot-toast";

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function MessageBubble({
  msg,
  isMine,
  currentUserId,
  onImageClick,
  onScrollToReply,
}) {
  const [ctx, setCtx] = useState(null);
  const [showReport, setShowReport] = useState(false);

  const setReplyTo = useChatStore((s) => s.setReplyTo);
  const setEditingMessage = useChatStore((s) => s.setEditingMessage);
  const deleteMessage = useChatStore((s) => s.deleteMessage);
  const toggleReaction = useChatStore((s) => s.toggleReaction);

  const isHidden = msg.deletedFor?.some((id) => String(id) === String(currentUserId));
  if (isHidden) return null;

  if (msg.isDeletedForEveryone) {
    return (
      <div
        id={`msg-${msg._id}`}
        className={`flex animate-msg-in ${isMine ? "justify-end" : "justify-start"}`}
      >
        <div className="px-4 py-2 rounded-2xl bg-base-300/40 border border-base-300 text-sm text-base-content/30 italic select-none">
          Message deleted
        </div>
      </div>
    );
  }

  const handleContextMenu = (e) => {
    e.preventDefault();
    const safeX = Math.min(e.clientX, window.innerWidth - 200);
    const safeY = Math.min(e.clientY, window.innerHeight - 220);
    setCtx({ x: safeX, y: safeY });
  };

  const handleReply = () => {
    setReplyTo(msg);
    setCtx(null);
  };
  const handleEdit = () => {
    setEditingMessage(msg);
    setCtx(null);
  };
  const handleDeleteForMe = async () => {
    setCtx(null);
    try {
      await deleteMessage(msg._id, false);
    } catch {
      toast.error("Failed to delete");
    }
  };
  const handleDeleteForAll = async () => {
    setCtx(null);
    try {
      await deleteMessage(msg._id, true);
    } catch {
      toast.error("Failed to delete");
    }
  };
  const handleReact = async (emoji) => {
    try {
      await toggleReaction(msg._id, emoji);
    } catch {
      toast.error("Failed to react");
    }
  };

  return (
    <>
      <div
        id={`msg-${msg._id}`}
        className={`flex group animate-msg-in ${isMine ? "justify-end" : "justify-start"}`}
        onContextMenu={handleContextMenu}
      >
        <div className="flex flex-col max-w-[72%]">
          <div
            className={`px-4 py-2.5 shadow-sm select-text msg-highlight-target ${
              isMine
                ? "bg-gradient-to-br from-ember-500 to-ember-600 text-white rounded-2xl rounded-br-sm"
                : "bg-neutral text-neutral-content rounded-2xl rounded-bl-sm"
            }`}
          >
            {/* Reply quote */}
            {msg.replyTo && (
              <ReplyQuote
                replyTo={msg.replyTo}
                snippet={msg.replyToSnippet}
                isMine={isMine}
                onScrollTo={() => onScrollToReply?.(String(msg.replyTo._id ?? msg.replyTo))}
              />
            )}

            {/* File attachment (non-image) */}
            {msg.fileUrl && (
              <FileCard
                fileUrl={msg.fileUrl}
                fileType={msg.fileType}
                fileName={msg.fileName}
                fileSize={msg.fileSize}
                isMine={isMine}
              />
            )}

            {/* Image */}
            {msg.image && (
              <img
                src={msg.image}
                alt="attachment"
                className="max-w-xs rounded-xl mb-1.5 cursor-zoom-in"
                loading="lazy"
                onClick={() => onImageClick?.(msg.image)}
              />
            )}

            {/* Text */}
            {msg.text && <p className="text-sm leading-relaxed break-words">{msg.text}</p>}

            {/* Footer */}
            <div className="flex items-center justify-end gap-1.5 mt-1">
              {msg.isEncrypted && (
                <span
                  className={`text-[10px] ${isMine ? "text-white/40" : "text-base-content/30"}`}
                >
                  🔒
                </span>
              )}
              {msg.isEdited && (
                <span
                  className={`text-[10px] ${isMine ? "text-white/45" : "text-base-content/30"}`}
                >
                  edited
                </span>
              )}
              <span className={`text-[11px] ${isMine ? "text-white/55" : "text-base-content/35"}`}>
                {formatTime(msg.createdAt)}
              </span>
              {isMine && <MessageStatus status={msg.status} />}
            </div>
          </div>

          {/* Reactions */}
          <ReactionBar
            reactions={msg.reactions ?? []}
            currentUserId={currentUserId}
            onReact={handleReact}
            isMine={isMine}
          />
        </div>
      </div>

      <AnimatePresence>
        {ctx && (
          <MessageContextMenu
            x={ctx.x}
            y={ctx.y}
            isMine={isMine}
            isDeleted={msg.isDeletedForEveryone}
            onReply={handleReply}
            onEdit={handleEdit}
            onDeleteForMe={handleDeleteForMe}
            onDeleteForAll={handleDeleteForAll}
            onClose={() => setCtx(null)}
            onReact={handleReact}
            onReport={() => setShowReport(true)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReport && (
          <ReportModal
            targetType="message"
            targetId={msg._id}
            onClose={() => setShowReport(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
