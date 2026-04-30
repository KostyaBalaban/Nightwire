import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Send, Paperclip, X,
  MessageSquare, Smile, MoreVertical, Edit2, Trash2,
} from "lucide-react";
import toast from "react-hot-toast";

import { useChatStore }   from "../../store/chat.store.js";
import { useSessionStore } from "../../store/session.store.js";
import { usePrefsStore }   from "../../store/prefs.store.js";
import { socket }          from "../../lib/socket.js";
import { useSound }        from "../../hooks/useSound.js";
import { encryptMessage }  from "../../lib/crypto.js";
import { loadPrivateKey }  from "../../lib/crypto.js";
import { axiosInstance }   from "../../lib/axios.js";

import MessageBubble      from "../../widgets/MessageBubble.jsx";
import AvatarWithStatus   from "../../widgets/AvatarWithStatus.jsx";
import TypingIndicator    from "../../widgets/TypingIndicator.jsx";
import ReplyPreview       from "../../widgets/ReplyPreview.jsx";
import EmojiPickerPopup   from "../../widgets/EmojiPickerPopup.jsx";
import ImageModal         from "../../widgets/ImageModal.jsx";
import ClearChatModal     from "../../widgets/ClearChatModal.jsx";
import LastSeenLabel      from "../../widgets/LastSeenLabel.jsx";
import EncryptionBadge    from "../../widgets/EncryptionBadge.jsx";
import UserProfileModal   from "../../widgets/UserProfileModal.jsx";
import { MessageSkeleton } from "../../widgets/SkeletonLoader.jsx";

const FILE_MAX = 50 * 1024 * 1024; // 50 MB

function fileTypeFromMime(mimeType) {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "document";
}

export default function ConvoWindow() {
  const [text, setText]               = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [filePreview, setFilePreview]  = useState(null); // { name, type, size, data }
  const [sending, setSending]         = useState(false);
  const [showEmoji, setShowEmoji]     = useState(false);
  const [imageModal, setImageModal]   = useState({ open: false, src: "" });
  const [showClearChat, setShowClearChat] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [isDragging, setIsDragging]   = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const bottomRef       = useRef(null);
  const fileRef         = useRef(null);
  const typingTimer     = useRef(null);
  const isTypingRef     = useRef(false);
  const headerMenuRef   = useRef(null);
  const dropZoneRef     = useRef(null);

  const activeUser        = useChatStore((s) => s.activeUser);
  const clearActiveUser   = useChatStore((s) => s.clearActiveUser);
  const messages          = useChatStore((s) => s.messages);
  const isLoadingMessages = useChatStore((s) => s.isLoadingMessages);
  const sendMessageStore  = useChatStore((s) => s.sendMessage);
  const onlineUsers       = useChatStore((s) => s.onlineUsers);
  const typingUsers       = useChatStore((s) => s.typingUsers);
  const replyTo           = useChatStore((s) => s.replyTo);
  const clearReplyTo      = useChatStore((s) => s.clearReplyTo);
  const editingMessage    = useChatStore((s) => s.editingMessage);
  const clearEditing      = useChatStore((s) => s.clearEditingMessage);
  const editMessageStore  = useChatStore((s) => s.editMessage);
  const clearChatStore    = useChatStore((s) => s.clearChatHistory);
  const currentUser       = useSessionStore((s) => s.user);
  const { playSend }      = useSound();

  const isOnline       = activeUser && onlineUsers.includes(activeUser._id);
  const isActiveTyping = activeUser && typingUsers.has(String(activeUser._id));
  const allImages      = messages.filter((m) => m.image && !m.isDeletedForEveryone).map((m) => m.image);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length, isActiveTyping]);
  useEffect(() => {
    if (editingMessage) setText(editingMessage.text ?? "");
    else setText("");
  }, [editingMessage?._id]);
  useEffect(() => {
    const handler = (e) => { if (headerMenuRef.current && !headerMenuRef.current.contains(e.target)) setShowHeaderMenu(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Drag & drop ───────────────────────────────────────────────────────────

  const processFile = (file) => {
    if (!file) return;
    if (file.size > FILE_MAX) { toast.error("Max file size is 50 MB"); return; }
    const fType = fileTypeFromMime(file.type);
    const reader = new FileReader();
    reader.onload = () => {
      if (fType === "image") {
        setImagePreview(reader.result);
        setFilePreview(null);
      } else {
        setFilePreview({ name: file.name, type: fType, size: file.size, data: reader.result });
        setImagePreview(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false); }, []);
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, []);

  // ── Empty state ───────────────────────────────────────────────────────────

  if (!activeUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-base-100 text-base-content/40 select-none">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-base-200 flex items-center justify-center mx-auto border border-base-300">
            <MessageSquare size={28} className="text-base-content/20" />
          </div>
          <p className="font-medium text-base-content/60">No chat selected</p>
          <p className="text-sm">Choose a person on the left to start</p>
        </div>
      </div>
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  const stopTyping = () => {
    if (isTypingRef.current) { isTypingRef.current = false; socket.emit("typing:stop", { receiverId: activeUser._id }); }
    clearTimeout(typingTimer.current);
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    if (!isTypingRef.current) { isTypingRef.current = true; socket.emit("typing:start", { receiverId: activeUser._id }); }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, 2500);
  };

  const handleSend = async () => {
    if (editingMessage) {
      if (!text.trim()) return;
      try { await editMessageStore(editingMessage._id, text.trim()); clearEditing(); }
      catch { toast.error("Failed to edit message"); }
      return;
    }

    if (!text.trim() && !imagePreview && !filePreview) return;
    setSending(true);
    stopTyping();
    try {
      const payload = {};

      // E2E encryption for text
      if (text.trim()) {
        const privKey = loadPrivateKey();
        if (activeUser.publicKey && privKey) {
          payload.text           = await encryptMessage(text.trim(), activeUser.publicKey);
          payload.isEncrypted    = true;
          payload._localText     = text.trim();
        } else {
          payload.text = text.trim();
        }
      }

      if (imagePreview) {
        payload.image = imagePreview;
      } else if (filePreview) {
        payload.fileData = filePreview.data;
        payload.fileType = filePreview.type;
        payload.fileName = filePreview.name;
        payload.fileSize = filePreview.size;
      }

      await sendMessageStore(payload);
      setText("");
      setImagePreview(null);
      setFilePreview(null);
      playSend();
    } catch {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === "Escape" && editingMessage) clearEditing();
  };

  const handleFileSelect = (e) => { processFile(e.target.files[0]); e.target.value = ""; };

  const handleScrollToMsg = (msgId) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.querySelector(".msg-highlight-target")?.classList.add("ring-2", "ring-primary", "ring-offset-1");
    setTimeout(() => el.querySelector(".msg-highlight-target")?.classList.remove("ring-2", "ring-primary", "ring-offset-1"), 1600);
  };

  const handleClearChat = async () => {
    try { await clearChatStore(activeUser._id); setShowClearChat(false); toast.success("Chat cleared"); }
    catch { toast.error("Failed to clear chat"); }
  };

  const cancelEdit = () => { clearEditing(); setText(""); };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      ref={dropZoneRef}
      className={`flex-1 flex flex-col bg-base-100 min-h-0 relative ${isDragging ? "ring-2 ring-primary ring-inset" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 bg-primary/10 z-30 flex items-center justify-center pointer-events-none">
          <div className="bg-base-200 border-2 border-primary border-dashed rounded-2xl px-8 py-6 text-primary font-semibold">
            Drop file to attach
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-base-300 bg-base-200 flex-shrink-0">
        <button onClick={clearActiveUser} className="btn btn-ghost btn-sm btn-circle md:hidden">
          <ArrowLeft size={18} />
        </button>
        <button
          onClick={() => setShowProfile(true)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
        >
          <AvatarWithStatus src={activeUser.profilePic} name={activeUser.fullName} online={isOnline} />
          <div className="min-w-0">
            <p className="font-semibold text-base-content truncate">{activeUser.fullName}</p>
            <LastSeenLabel user={activeUser} isOnline={isOnline} />
          </div>
        </button>
        {activeUser.publicKey && loadPrivateKey() && (
          <EncryptionBadge />
        )}
        <div className="relative" ref={headerMenuRef}>
          <button className="btn btn-ghost btn-circle btn-sm" onClick={() => setShowHeaderMenu((v) => !v)}>
            <MoreVertical size={16} className="text-base-content/60" />
          </button>
          {showHeaderMenu && (
            <div className="absolute right-0 top-9 bg-base-200 border border-base-300 rounded-xl shadow-xl z-30 overflow-hidden min-w-[160px]">
              <button
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-base-300 text-error transition-colors"
                onClick={() => { setShowClearChat(true); setShowHeaderMenu(false); }}
              >
                <Trash2 size={14} /> Clear history
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5 min-h-0">
        {isLoadingMessages && <MessageSkeleton />}
        {!isLoadingMessages && messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-base-content/40 space-y-1">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs">Send the first one!</p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg._id}
            msg={msg}
            isMine={String(msg.senderId) === String(currentUser._id)}
            currentUserId={String(currentUser._id)}
            onImageClick={(src) => setImageModal({ open: true, src })}
            onScrollToReply={handleScrollToMsg}
          />
        ))}
        {isActiveTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Editing bar */}
      {editingMessage && (
        <div className="px-4 py-2 bg-base-200 border-t border-base-300 flex items-center gap-3 flex-shrink-0">
          <Edit2 size={14} className="text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0 border-l-2 border-primary pl-2">
            <p className="text-xs text-primary mb-0.5 font-medium">Editing</p>
            <p className="text-xs text-base-content/60 truncate">{editingMessage.text}</p>
          </div>
          <button onClick={cancelEdit} className="btn btn-ghost btn-xs btn-circle flex-shrink-0"><X size={12} /></button>
        </div>
      )}

      {/* Reply bar */}
      {replyTo && !editingMessage && <ReplyPreview msg={replyTo} onCancel={clearReplyTo} />}

      {/* Image preview */}
      {imagePreview && (
        <div className="px-4 py-2 bg-base-200 border-t border-base-300 flex-shrink-0">
          <div className="relative inline-block">
            <img src={imagePreview} alt="preview" className="h-20 rounded-lg object-cover" />
            <button onClick={() => setImagePreview(null)} className="absolute -top-2 -right-2 btn btn-circle btn-xs btn-error"><X size={10} /></button>
          </div>
        </div>
      )}

      {/* File preview (non-image) */}
      {filePreview && (
        <div className="px-4 py-2 bg-base-200 border-t border-base-300 flex items-center gap-3 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-base-content truncate">{filePreview.name}</p>
            <p className="text-xs text-base-content/40">{filePreview.type} · {(filePreview.size / 1024 / 1024).toFixed(1)} MB</p>
          </div>
          <button onClick={() => setFilePreview(null)} className="btn btn-ghost btn-xs btn-circle"><X size={12} /></button>
        </div>
      )}

      {/* Input row */}
      <div className="px-4 py-3 border-t border-base-300 bg-base-200 flex-shrink-0">
        <div className="flex items-end gap-2">
          <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-ghost btn-circle btn-sm text-base-content/40 hover:text-primary flex-shrink-0" title="Attach file">
            <Paperclip size={18} />
          </button>
          <input ref={fileRef} type="file" className="hidden" onChange={handleFileSelect} />

          <div className="relative flex-shrink-0">
            <button type="button" onClick={() => setShowEmoji((v) => !v)} className="btn btn-ghost btn-circle btn-sm text-base-content/40 hover:text-primary" title="Emoji">
              <Smile size={18} />
            </button>
            {showEmoji && (
              <EmojiPickerPopup
                onSelect={(emoji) => { setText((t) => t + emoji); setShowEmoji(false); }}
                onClose={() => setShowEmoji(false)}
              />
            )}
          </div>

          <textarea
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={editingMessage ? "Edit message…" : "Type a message…"}
            rows={1}
            className="flex-1 resize-none bg-base-300 rounded-xl px-4 py-2.5 text-sm text-base-content placeholder:text-base-content/30 border border-transparent focus:border-primary focus:outline-none leading-snug"
            style={{ maxHeight: "120px", overflowY: "auto" }}
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={(!text.trim() && !imagePreview && !filePreview) || sending}
            className={`btn btn-circle btn-sm flex-shrink-0 ${editingMessage ? "btn-success" : "btn-primary"}`}
            title={editingMessage ? "Save edit" : "Send"}
          >
            {sending ? <span className="loading loading-spinner loading-xs" /> : <Send size={15} />}
          </button>
        </div>
      </div>

      {/* Profile modal */}
      <AnimatePresence>
        {showProfile && (
          <UserProfileModal
            user={activeUser}
            isOnline={isOnline}
            onClose={() => setShowProfile(false)}
          />
        )}
      </AnimatePresence>

      {/* Overlays */}
      <AnimatePresence>
        {imageModal.open && (
          <ImageModal src={imageModal.src} images={allImages} onClose={() => setImageModal({ open: false, src: "" })} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showClearChat && (
          <ClearChatModal userName={activeUser.fullName} onConfirm={handleClearChat} onClose={() => setShowClearChat(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
