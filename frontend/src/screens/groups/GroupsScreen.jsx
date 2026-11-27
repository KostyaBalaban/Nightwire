import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Send,
  Plus,
  Users,
  LogOut,
  UserPlus,
  Smile,
  Paperclip,
  X,
  CornerUpLeft,
} from "lucide-react";
import toast from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";

import { useGroupStore } from "../../store/group.store.js";
import { useSessionStore } from "../../store/session.store.js";
import { socket } from "../../lib/socket.js";
import EmojiPickerPopup from "../../widgets/EmojiPickerPopup.jsx";
import FileCard from "../../widgets/FileCard.jsx";
import ReactionBar from "../../widgets/ReactionBar.jsx";
import GroupInfoModal from "../../widgets/GroupInfoModal.jsx";

const FILE_MAX = 50 * 1024 * 1024;
const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

// ── Modals ────────────────────────────────────────────────────────────────────

function CreateGroupModal({ onClose }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const createGroup = useGroupStore((s) => s.createGroup);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name is required");
    setLoading(true);
    try {
      const g = await createGroup({ name: name.trim(), description: desc });
      toast.success(`Group "${g.name}" created`);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.93 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.93 }}
          className="pointer-events-auto w-full max-w-sm mx-4 bg-base-200 border border-base-300 rounded-2xl shadow-2xl p-6"
        >
          <h2 className="font-bold text-base-content mb-4">Create Group</h2>
          <form onSubmit={submit} className="space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Group name"
              className="input input-bordered w-full bg-base-300 border-base-300 focus:border-primary focus:outline-none text-sm"
              required
            />
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="textarea textarea-bordered w-full bg-base-300 border-base-300 text-sm resize-none focus:border-primary focus:outline-none"
            />
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="btn btn-ghost flex-1">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn btn-primary flex-1">
                {loading ? <span className="loading loading-spinner loading-xs" /> : "Create"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </>
  );
}

function JoinGroupModal({ onClose }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const joinGroup = useGroupStore((s) => s.joinGroup);

  const submit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    try {
      const g = await joinGroup(code.trim());
      toast.success(`Joined "${g.name}"`);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid invite code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.93 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.93 }}
          className="pointer-events-auto w-full max-w-xs mx-4 bg-base-200 border border-base-300 rounded-2xl shadow-2xl p-6"
        >
          <h2 className="font-bold text-base-content mb-4">Join Group</h2>
          <form onSubmit={submit} className="space-y-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Invite code"
              className="input input-bordered w-full bg-base-300 border-base-300 focus:border-primary focus:outline-none text-sm font-mono"
              required
            />
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn btn-ghost flex-1">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn btn-primary flex-1">
                {loading ? <span className="loading loading-spinner loading-xs" /> : "Join"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </>
  );
}

// ── Context menu ──────────────────────────────────────────────────────────────

function MsgContextMenu({ x, y, onReply, onReact, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [onClose]);

  const safeX = Math.min(x, window.innerWidth - 220);
  const safeY = Math.min(y, window.innerHeight - 180);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.88 }}
      transition={{ duration: 0.1 }}
      style={{ top: safeY, left: safeX, position: "fixed", zIndex: 9999 }}
      className="bg-base-200 border border-base-300 rounded-xl shadow-2xl overflow-hidden min-w-[180px]"
    >
      {/* Quick reactions */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-base-300">
        {QUICK_EMOJIS.map((e) => (
          <button
            key={e}
            onClick={() => {
              onReact(e);
              onClose();
            }}
            className="w-8 h-8 flex items-center justify-center text-base hover:bg-base-300 rounded-lg transition-colors"
          >
            {e}
          </button>
        ))}
      </div>
      <button
        onClick={() => {
          onReply();
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-base-300 text-base-content transition-colors text-left"
      >
        <CornerUpLeft size={14} /> Reply
      </button>
    </motion.div>
  );
}

// ── Group chat ────────────────────────────────────────────────────────────────

function GroupChat({ group, onBack }) {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [sending, setSending] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [ctx, setCtx] = useState(null); // { x, y, msg }
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  const bottomRef = useRef(null);
  const fileRef = useRef(null);
  const typingTimer = useRef(null);
  const isTypingRef = useRef(false);

  const messages = useGroupStore((s) => s.messages);
  const isLoadingMsgs = useGroupStore((s) => s.isLoadingMsgs);
  const sendMessage = useGroupStore((s) => s.sendMessage);
  const toggleReaction = useGroupStore((s) => s.toggleReaction);
  const typingUsers = useGroupStore((s) => s.typingUsers);
  const currentUser = useSessionStore((s) => s.user);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const isOwnerOrAdmin = group.members?.some(
    (m) =>
      String(m.userId?._id ?? m.userId) === String(currentUser?._id) &&
      ["owner", "admin"].includes(m.role),
  );

  const stopTyping = () => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      socket.emit("group:typing:stop", { groupId: group._id });
    }
    clearTimeout(typingTimer.current);
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("group:typing:start", { groupId: group._id });
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, 2500);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > FILE_MAX) {
      toast.error("Max 50 MB");
      return;
    }
    const ft = file.type.startsWith("image/")
      ? "image"
      : file.type.startsWith("video/")
        ? "video"
        : file.type.startsWith("audio/")
          ? "audio"
          : "document";
    const reader = new FileReader();
    reader.onload = () =>
      setFilePreview({ name: file.name, type: ft, size: file.size, data: reader.result });
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSend = async () => {
    if (!text.trim() && !filePreview) return;
    setSending(true);
    stopTyping();
    try {
      const payload = { text: text.trim() };
      if (replyTo) {
        payload.replyTo = replyTo._id;
        payload.replyToSnippet = replyTo.text || "";
      }
      if (filePreview) {
        if (filePreview.type === "image") payload.image = filePreview.data;
        else {
          payload.fileData = filePreview.data;
          payload.fileType = filePreview.type;
          payload.fileName = filePreview.name;
          payload.fileSize = filePreview.size;
        }
      }
      await sendMessage(payload);
      setText("");
      setFilePreview(null);
      setReplyTo(null);
    } catch {
      toast.error("Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") setReplyTo(null);
  };

  const handleContextMenu = (e, msg) => {
    e.preventDefault();
    const safeX = Math.min(e.clientX, window.innerWidth - 220);
    const safeY = Math.min(e.clientY, window.innerHeight - 180);
    setCtx({ x: safeX, y: safeY, msg });
  };

  const handleReact = async (msg, emoji) => {
    try {
      await toggleReaction(msg._id, emoji);
    } catch {
      toast.error("Failed to react");
    }
  };

  const scrollToMsg = (id) => {
    const el = document.getElementById(`gmsg-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.querySelector(".msg-hl")?.classList.add("ring-2", "ring-primary");
    setTimeout(() => el.querySelector(".msg-hl")?.classList.remove("ring-2", "ring-primary"), 1500);
  };

  const typingList = Array.from(typingUsers)
    .map(
      (id) =>
        group.members?.find((m) => String(m.userId?._id ?? m.userId) === id)?.userId?.fullName,
    )
    .filter(Boolean);

  return (
    <div className="flex-1 flex flex-col bg-base-100 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 border-b border-base-300 bg-base-200 flex-shrink-0">
        <button onClick={onBack} className="btn btn-ghost btn-sm btn-circle md:hidden">
          <ArrowLeft size={18} />
        </button>
        <button
          onClick={() => setShowGroupInfo(true)}
          className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity text-left"
        >
          <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
            {group.avatar ? (
              <img src={group.avatar} className="w-full h-full rounded-xl object-cover" />
            ) : (
              <Users size={18} className="text-primary" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-base-content truncate">{group.name}</p>
            <p className="text-xs text-base-content/40">{group.members?.length ?? 0} members</p>
          </div>
        </button>
        {isOwnerOrAdmin && (
          <div className="text-xs text-base-content/40 bg-base-300 px-2 py-0.5 rounded-full shrink-0">
            Invite: <span className="font-mono font-medium text-primary">{group.inviteCode}</span>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 min-h-0">
        {isLoadingMsgs && (
          <div className="flex justify-center pt-10">
            <span className="loading loading-ring loading-md text-primary" />
          </div>
        )}
        {!isLoadingMsgs && messages.length === 0 && (
          <div className="h-full flex items-center justify-center text-base-content/40 text-sm">
            No messages yet — start the conversation!
          </div>
        )}
        {messages.map((msg) => {
          if (msg.isSystem) {
            return (
              <div key={msg._id} className="flex justify-center my-1">
                <p className="text-xs text-base-content/40 bg-base-300 px-3 py-1 rounded-full">
                  {msg.senderId?.fullName ?? "Someone"} {msg.text}
                </p>
              </div>
            );
          }

          const mine = String(msg.senderId?._id ?? msg.senderId) === String(currentUser?._id);
          return (
            <div
              key={msg._id}
              id={`gmsg-${msg._id}`}
              className={`flex group gap-2 animate-msg-in ${mine ? "justify-end" : "justify-start"}`}
              onContextMenu={(e) => handleContextMenu(e, msg)}
            >
              {!mine && (
                <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mt-auto">
                  {msg.senderId?.profilePic ? (
                    <img src={msg.senderId.profilePic} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary flex items-center justify-center text-primary-content text-xs font-bold">
                      {msg.senderId?.fullName?.[0]}
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-col max-w-[70%]">
                {!mine && (
                  <p className="text-xs text-primary font-medium mb-0.5 ml-1">
                    {msg.senderId?.fullName}
                  </p>
                )}
                <div
                  className={`msg-hl px-4 py-2.5 shadow-sm rounded-2xl ${
                    mine
                      ? "bg-gradient-to-br from-ember-500 to-ember-600 text-white rounded-br-sm"
                      : "bg-neutral text-neutral-content rounded-bl-sm"
                  }`}
                >
                  {/* Reply quote */}
                  {msg.replyTo && (
                    <div
                      onClick={() => scrollToMsg(msg.replyTo._id ?? msg.replyTo)}
                      className={`border-l-2 pl-2 mb-1.5 py-0.5 rounded-sm cursor-pointer hover:opacity-80 ${
                        mine ? "border-white/40 bg-white/10" : "border-primary/50 bg-primary/5"
                      }`}
                    >
                      <p className="text-[11px] opacity-70 truncate max-w-[200px]">
                        {msg.replyToSnippet || msg.replyTo?.text || "Message"}
                      </p>
                    </div>
                  )}

                  {msg.fileUrl && (
                    <FileCard
                      fileUrl={msg.fileUrl}
                      fileType={msg.fileType}
                      fileName={msg.fileName}
                      fileSize={msg.fileSize}
                      isMine={mine}
                    />
                  )}
                  {msg.image && (
                    <img
                      src={msg.image}
                      alt=""
                      className="max-w-xs rounded-xl mb-1.5 cursor-zoom-in"
                    />
                  )}
                  {msg.text && <p className="text-sm leading-relaxed break-words">{msg.text}</p>}
                  <div className="flex justify-end mt-1">
                    <span
                      className={`text-[11px] ${mine ? "text-white/55" : "text-base-content/35"}`}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                <ReactionBar
                  reactions={msg.reactions ?? []}
                  currentUserId={String(currentUser?._id)}
                  onReact={(emoji) => handleReact(msg, emoji)}
                  isMine={mine}
                />
              </div>
            </div>
          );
        })}
        {typingList.length > 0 && (
          <p className="text-xs text-base-content/40 italic pl-1">
            {typingList.join(", ")} {typingList.length === 1 ? "is" : "are"} typing…
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply bar */}
      {replyTo && (
        <div className="px-4 py-2 bg-base-200 border-t border-base-300 flex items-center gap-3 flex-shrink-0">
          <CornerUpLeft size={14} className="text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0 border-l-2 border-primary pl-2">
            <p className="text-xs text-primary font-medium">Reply</p>
            <p className="text-xs text-base-content/60 truncate">{replyTo.text || "Attachment"}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="btn btn-ghost btn-xs btn-circle">
            <X size={12} />
          </button>
        </div>
      )}

      {/* File preview */}
      {filePreview && (
        <div className="px-4 py-2 bg-base-200 border-t border-base-300 flex items-center gap-3 flex-shrink-0">
          <p className="text-sm text-base-content/70 truncate flex-1">{filePreview.name}</p>
          <button onClick={() => setFilePreview(null)} className="btn btn-ghost btn-xs btn-circle">
            <X size={12} />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-base-300 bg-base-200 flex-shrink-0">
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="btn btn-ghost btn-circle btn-sm text-base-content/40 hover:text-primary flex-shrink-0"
          >
            <Paperclip size={18} />
          </button>
          <input ref={fileRef} type="file" className="hidden" onChange={handleFileSelect} />

          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowEmoji((v) => !v)}
              className="btn btn-ghost btn-circle btn-sm text-base-content/40 hover:text-primary"
            >
              <Smile size={18} />
            </button>
            {showEmoji && (
              <EmojiPickerPopup
                onSelect={(e) => {
                  setText((t) => t + e);
                  setShowEmoji(false);
                }}
                onClose={() => setShowEmoji(false)}
              />
            )}
          </div>

          <textarea
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Message group…"
            rows={1}
            className="flex-1 resize-none bg-base-300 rounded-xl px-4 py-2.5 text-sm text-base-content placeholder:text-base-content/30 border border-transparent focus:border-primary focus:outline-none leading-snug"
            style={{ maxHeight: "120px", overflowY: "auto" }}
          />
          <button
            onClick={handleSend}
            disabled={(!text.trim() && !filePreview) || sending}
            className="btn btn-circle btn-sm btn-primary flex-shrink-0"
          >
            {sending ? <span className="loading loading-spinner loading-xs" /> : <Send size={15} />}
          </button>
        </div>
      </div>

      {/* Context menu */}
      <AnimatePresence>
        {ctx && (
          <MsgContextMenu
            x={ctx.x}
            y={ctx.y}
            onReply={() => {
              setReplyTo(ctx.msg);
              setCtx(null);
            }}
            onReact={(e) => {
              handleReact(ctx.msg, e);
              setCtx(null);
            }}
            onClose={() => setCtx(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGroupInfo && (
          <GroupInfoModal
            currentUserId={currentUser?._id}
            onClose={() => setShowGroupInfo(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function GroupsScreen() {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [query, setQuery] = useState("");

  const groups = useGroupStore((s) => s.groups);
  const activeGroup = useGroupStore((s) => s.activeGroup);
  const isLoading = useGroupStore((s) => s.isLoading);
  const setActive = useGroupStore((s) => s.setActiveGroup);
  const clearActive = useGroupStore((s) => s.clearActiveGroup);
  const leaveGroup = useGroupStore((s) => s.leaveGroup);

  const filtered = groups.filter((g) => g.name.toLowerCase().includes(query.toLowerCase()));

  const handleLeave = async (g, e) => {
    e.stopPropagation();
    try {
      await leaveGroup(g._id);
      toast.success(`Left "${g.name}"`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to leave");
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Groups list */}
      <div
        className={`${activeGroup ? "hidden md:flex" : "flex"} w-full md:w-80 lg:w-96 flex-col bg-base-200 border-r border-base-300 flex-shrink-0`}
      >
        <div className="px-4 py-3 flex items-center justify-between border-b border-base-300 flex-shrink-0">
          <h2 className="font-bold text-base-content">Groups</h2>
          <div className="flex gap-1">
            <button
              onClick={() => setShowJoin(true)}
              className="btn btn-ghost btn-circle btn-sm"
              title="Join by invite"
            >
              <UserPlus size={15} />
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="btn btn-primary btn-circle btn-sm"
              title="Create group"
            >
              <Plus size={15} />
            </button>
          </div>
        </div>

        <div className="px-3 py-2 flex-shrink-0">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search groups…"
            className="input input-sm w-full bg-base-300 border-transparent focus:border-primary focus:outline-none text-sm rounded-xl"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
          {isLoading ? (
            <div className="flex justify-center pt-10">
              <span className="loading loading-ring loading-md text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-base-content/40 text-sm py-10">
              {groups.length === 0 ? "No groups yet — create or join one!" : "No groups found"}
            </p>
          ) : (
            filtered.map((g) => (
              <button
                key={g._id}
                onClick={() => setActive(g)}
                className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                  activeGroup?._id === g._id
                    ? "bg-primary/15 border border-primary/30"
                    : "hover:bg-base-300/60 border border-transparent"
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                  {g.avatar ? (
                    <img src={g.avatar} className="w-full h-full rounded-xl object-cover" />
                  ) : (
                    <Users size={18} className="text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-base-content truncate">{g.name}</p>
                  <p className="text-xs text-base-content/40">{g.members?.length ?? 0} members</p>
                </div>
                <button
                  onClick={(e) => handleLeave(g, e)}
                  className="btn btn-ghost btn-xs text-error opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Leave group"
                >
                  <LogOut size={12} />
                </button>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat panel */}
      <div className={`${!activeGroup ? "hidden md:flex" : "flex"} flex-1 min-w-0`}>
        {activeGroup ? (
          <GroupChat group={activeGroup} onBack={clearActive} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-base-content/40">
            <Users size={40} className="mb-3 opacity-20" />
            <p className="text-sm">Select a group to start chatting</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} />}
        {showJoin && <JoinGroupModal onClose={() => setShowJoin(false)} />}
      </AnimatePresence>
    </div>
  );
}
