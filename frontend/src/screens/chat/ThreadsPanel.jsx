import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Settings, LogOut, UserCircle, Zap, SearchIcon } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

import { useChatStore }   from "../../store/chat.store.js";
import { useSessionStore } from "../../store/session.store.js";
import AvatarWithStatus   from "../../widgets/AvatarWithStatus.jsx";
import ThemeToggle        from "../../widgets/ThemeToggle.jsx";
import SearchModal        from "../../widgets/SearchModal.jsx";
import { UserSkeleton }   from "../../widgets/SkeletonLoader.jsx";

function formatPreviewTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86_400_000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function ThreadCard({ user, isActive, isOnline, unread, preview, onClick }) {
  const lastMsg = preview?.lastMessage;
  const previewText = lastMsg
    ? lastMsg.isDeletedForEveryone
      ? "Message deleted"
      : lastMsg.image && !lastMsg.text
        ? "📷 Photo"
        : lastMsg.text?.slice(0, 42) ?? ""
    : isOnline
      ? "Online"
      : "";

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${
        isActive
          ? "bg-ember-500/15 border border-ember-500/30"
          : "hover:bg-base-300/60 border border-transparent"
      }`}
    >
      <AvatarWithStatus src={user.profilePic} name={user.fullName} online={isOnline} />

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-1">
          <p className={`font-medium text-sm truncate ${isActive ? "text-primary" : "text-base-content"}`}>
            {user.fullName}
          </p>
          {lastMsg && (
            <span className="text-[11px] text-base-content/35 flex-shrink-0">
              {formatPreviewTime(lastMsg.createdAt)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <p className={`text-xs truncate ${
            lastMsg?.isDeletedForEveryone
              ? "italic text-base-content/30"
              : "text-base-content/50"
          }`}>
            {previewText}
          </p>
          {unread > 0 && (
            <span className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-content text-[10px] font-bold flex items-center justify-center px-1">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function ThreadsPanel() {
  const [query, setQuery]           = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const users          = useChatStore((s) => s.users);
  const activeUser     = useChatStore((s) => s.activeUser);
  const onlineUsers    = useChatStore((s) => s.onlineUsers);
  const setActiveUser  = useChatStore((s) => s.setActiveUser);
  const unreadCounts   = useChatStore((s) => s.unreadCounts);
  const previews       = useChatStore((s) => s.previews);
  const isLoadingUsers = useChatStore((s) => s.isLoadingUsers);

  const currentUser = useSessionStore((s) => s.user);
  const logout      = useSessionStore((s) => s.logout);
  const navigate    = useNavigate();

  const filtered = users.filter((u) =>
    u.fullName.toLowerCase().includes(query.toLowerCase())
  );

  // Sort: unread first, then by last message time, then online, then alpha
  const sorted = [...filtered].sort((a, b) => {
    const uA = unreadCounts[String(a._id)] ?? 0;
    const uB = unreadCounts[String(b._id)] ?? 0;
    if (uA !== uB) return uB - uA;

    const tA = previews[String(a._id)]?.lastMessage?.createdAt;
    const tB = previews[String(b._id)]?.lastMessage?.createdAt;
    if (tA && tB) return new Date(tB) - new Date(tA);
    if (tA) return -1;
    if (tB) return 1;

    const oA = onlineUsers.includes(a._id) ? 1 : 0;
    const oB = onlineUsers.includes(b._id) ? 1 : 0;
    if (oA !== oB) return oB - oA;

    return a.fullName.localeCompare(b.fullName);
  });

  // Sections: "Chats" (with preview) and "All people"
  const withHistory = sorted.filter((u) => previews[String(u._id)]);
  const withoutHistory = sorted.filter((u) => !previews[String(u._id)]);

  const handleLogout = async () => {
    try { await logout(); }
    catch { toast.error("Logout failed"); }
  };

  const handleSearchNavigate = (msg) => {
    const partnerId =
      String(msg.senderId?._id ?? msg.senderId) === String(currentUser?._id)
        ? msg.receiverId
        : msg.senderId;
    const partner = users.find(
      (u) => String(u._id) === String(partnerId?._id ?? partnerId)
    );
    if (partner) setActiveUser(partner);
  };

  return (
    <div className="w-full flex flex-col bg-base-200 border-r border-base-300 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-base-300 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-ember-500 rounded-lg flex items-center justify-center shadow shadow-ember-500/30">
            <Zap size={14} className="text-white" />
          </div>
          <span className="font-bold text-base-content tracking-tight">NightWire</span>
        </div>

        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setShowSearch(true)}
            className="btn btn-ghost btn-sm btn-circle"
            title="Search messages"
          >
            <SearchIcon size={16} className="text-base-content/60" />
          </button>
          <ThemeToggle />
          <button
            onClick={() => navigate("/settings")}
            className="btn btn-ghost btn-sm btn-circle"
            title="Settings"
          >
            <Settings size={16} className="text-base-content/60" />
          </button>
          <button
            onClick={() => navigate("/profile")}
            className="btn btn-ghost btn-sm btn-circle"
            title="Profile"
          >
            <UserCircle size={16} className="text-base-content/60" />
          </button>
          <button
            onClick={handleLogout}
            className="btn btn-ghost btn-sm btn-circle hover:text-error"
            title="Log out"
          >
            <LogOut size={16} className="text-base-content/60" />
          </button>
        </div>
      </div>

      {/* Self strip */}
      <div
        className="px-4 py-2.5 flex items-center gap-3 border-b border-base-300 cursor-pointer hover:bg-base-300/40 transition-colors flex-shrink-0"
        onClick={() => navigate("/profile")}
      >
        <AvatarWithStatus src={currentUser?.profilePic} name={currentUser?.fullName} size="sm" online />
        <div className="min-w-0">
          <p className="text-sm font-medium text-base-content truncate">{currentUser?.fullName}</p>
          <p className="text-xs text-green-400">Active now</p>
        </div>
      </div>

      {/* Local search */}
      <div className="px-3 py-3 flex-shrink-0">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name…"
            className="input input-sm w-full pl-8 bg-base-300 border-transparent focus:border-primary focus:outline-none text-sm rounded-xl"
          />
        </div>
      </div>

      {/* Lists */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
        {isLoadingUsers ? (
          <UserSkeleton />
        ) : (
          <>
            {withHistory.length > 0 && (
              <>
                <p className="px-3 py-1 text-[11px] font-medium text-base-content/40 uppercase tracking-wider">
                  Chats
                </p>
                {withHistory.map((u) => (
                  <ThreadCard
                    key={u._id}
                    user={u}
                    isActive={activeUser?._id === u._id}
                    isOnline={onlineUsers.includes(u._id)}
                    unread={unreadCounts[String(u._id)] ?? 0}
                    preview={previews[String(u._id)]}
                    onClick={() => setActiveUser(u)}
                  />
                ))}
              </>
            )}

            {withoutHistory.length > 0 && (
              <>
                <p className="px-3 py-1 text-[11px] font-medium text-base-content/40 uppercase tracking-wider mt-2">
                  All people
                </p>
                {withoutHistory.map((u) => (
                  <ThreadCard
                    key={u._id}
                    user={u}
                    isActive={activeUser?._id === u._id}
                    isOnline={onlineUsers.includes(u._id)}
                    unread={0}
                    preview={null}
                    onClick={() => setActiveUser(u)}
                  />
                ))}
              </>
            )}

            {sorted.length === 0 && (
              <p className="text-center text-base-content/40 text-sm py-10">
                No users found
              </p>
            )}
          </>
        )}
      </div>

      {/* Global search modal */}
      <AnimatePresence>
        {showSearch && (
          <SearchModal
            onClose={() => setShowSearch(false)}
            onNavigate={handleSearchNavigate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
