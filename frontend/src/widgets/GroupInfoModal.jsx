import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Users, Crown, Shield, Copy, Pencil, Check, UserMinus, Camera } from "lucide-react";
import toast from "react-hot-toast";
import AvatarWithStatus from "./AvatarWithStatus.jsx";
import UserProfileModal from "./UserProfileModal.jsx";
import { useGroupStore } from "../store/group.store.js";
import { useChatStore }  from "../store/chat.store.js";

const ROLE_BADGE = {
  owner: { label: "Owner", icon: Crown,  cls: "text-yellow-500 bg-yellow-500/10" },
  admin: { label: "Admin", icon: Shield, cls: "text-primary bg-primary/10" },
  member: null,
};

export default function GroupInfoModal({ currentUserId, onClose }) {
  const liveGroup = useGroupStore((s) => s.activeGroup);
  const [editMode, setEditMode]       = useState(false);
  const [name, setName]               = useState(liveGroup?.name ?? "");
  const [desc, setDesc]               = useState(liveGroup?.description ?? "");
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [saving, setSaving]           = useState(false);
  const [kicking, setKicking]         = useState(null);
  const [profileUser, setProfileUser] = useState(null);
  const avatarRef = useRef(null);

  const updateGroup  = useGroupStore((s) => s.updateGroup);
  const kickMember   = useGroupStore((s) => s.kickMember);
  const onlineUsers  = useChatStore((s) => s.onlineUsers);

  const group = liveGroup;
  if (!group) return null;

  const isOwnerOrAdmin = group.members?.some(
    (m) => String(m.userId?._id ?? m.userId) === String(currentUserId) &&
           ["owner", "admin"].includes(m.role)
  );

  const isOwner = group.members?.some(
    (m) => String(m.userId?._id ?? m.userId) === String(currentUserId) && m.role === "owner"
  );

  const copyCode = () => {
    navigator.clipboard.writeText(group.inviteCode ?? "");
    toast.success("Invite code copied!");
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Name is required");
    setSaving(true);
    try {
      const updates = { name: name.trim(), description: desc };
      if (avatarPreview) updates.avatar = avatarPreview;
      await updateGroup(group._id, updates);
      setAvatarPreview(null);
      setEditMode(false);
      toast.success("Group updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setName(group.name);
    setDesc(group.description ?? "");
    setAvatarPreview(null);
    setEditMode(false);
  };

  const handleKick = async (memberId) => {
    setKicking(memberId);
    try {
      await kickMember(group._id, memberId);
      toast.success("Member removed");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove member");
    } finally {
      setKicking(null);
    }
  };

  const displayAvatar = avatarPreview ?? group.avatar;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.93 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.93 }}
          transition={{ duration: 0.15 }}
          className="pointer-events-auto w-full max-w-sm mx-4 bg-base-200 border border-base-300 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Banner */}
          <div className="h-20 bg-gradient-to-br from-primary/30 to-primary/10 relative">
            <button onClick={onClose} className="absolute top-3 right-3 btn btn-ghost btn-circle btn-sm">
              <X size={16} />
            </button>
            {isOwnerOrAdmin && !editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="absolute top-3 left-3 btn btn-ghost btn-circle btn-sm"
                title="Edit group"
              >
                <Pencil size={15} />
              </button>
            )}
          </div>

          <div className="px-5 pb-5">
            {/* Avatar + name */}
            <div className="flex items-end gap-3 -mt-8 mb-4">
              <div className="relative flex-shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-primary/20 border-4 border-base-200 flex items-center justify-center overflow-hidden">
                  {displayAvatar
                    ? <img src={displayAvatar} className="w-full h-full object-cover" />
                    : <Users size={28} className="text-primary" />
                  }
                </div>
                {editMode && (
                  <>
                    <button
                      onClick={() => avatarRef.current?.click()}
                      className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center hover:bg-black/55 transition-colors"
                    >
                      <Camera size={18} className="text-white" />
                    </button>
                    <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  </>
                )}
              </div>

              <div className="mb-1 min-w-0 flex-1">
                {editMode ? (
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input input-sm w-full bg-base-300 border-base-300 focus:border-primary focus:outline-none text-sm font-semibold"
                    placeholder="Group name"
                  />
                ) : (
                  <>
                    <h2 className="text-lg font-bold text-base-content truncate">{group.name}</h2>
                    <p className="text-xs text-base-content/40">{group.members?.length ?? 0} members</p>
                  </>
                )}
              </div>
            </div>

            {/* Description */}
            {editMode ? (
              <div className="mb-4">
                <p className="text-xs text-base-content/40 mb-1 font-medium uppercase tracking-wider">Description</p>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={2}
                  placeholder="Group description"
                  className="textarea textarea-sm w-full bg-base-300 border-base-300 focus:border-primary focus:outline-none text-sm resize-none"
                />
              </div>
            ) : (
              group.description && (
                <div className="bg-base-300 rounded-xl px-4 py-3 mb-4">
                  <p className="text-xs text-base-content/40 mb-1 font-medium uppercase tracking-wider">About</p>
                  <p className="text-sm text-base-content/80 leading-relaxed">{group.description}</p>
                </div>
              )
            )}

            {/* Save / Cancel buttons */}
            {editMode && (
              <div className="flex gap-2 mb-4">
                <button onClick={handleCancelEdit} className="btn btn-ghost btn-sm flex-1">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm flex-1">
                  {saving ? <span className="loading loading-spinner loading-xs" /> : <><Check size={13} /> Save</>}
                </button>
              </div>
            )}

            {/* Invite code */}
            {isOwnerOrAdmin && group.inviteCode && (
              <div className="bg-base-300 rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-base-content/40 mb-0.5 font-medium uppercase tracking-wider">Invite code</p>
                  <p className="font-mono font-bold text-primary tracking-widest">{group.inviteCode}</p>
                </div>
                <button onClick={copyCode} className="btn btn-ghost btn-circle btn-sm" title="Copy">
                  <Copy size={14} />
                </button>
              </div>
            )}

            {/* Members */}
            <p className="text-xs text-base-content/40 font-medium uppercase tracking-wider mb-2">Members</p>
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {(group.members ?? []).map((m) => {
                const u = m.userId;
                if (!u || typeof u !== "object") return null;
                const badge = ROLE_BADGE[m.role];
                const isSelf  = String(u._id) === String(currentUserId);
                const isGroupOwner = m.role === "owner";
                const canKick = isOwnerOrAdmin && !isSelf && !isGroupOwner;

                return (
                  <div
                    key={String(u._id)}
                    onClick={() => setProfileUser(u)}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-base-300 transition-colors group cursor-pointer"
                  >
                    <AvatarWithStatus
                      src={u.profilePic}
                      name={u.fullName}
                      size="sm"
                      online={onlineUsers.includes(String(u._id))}
                    />
                    <p className="text-sm text-base-content flex-1 truncate">{u.fullName}</p>
                    {badge && (
                      <span className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badge.cls}`}>
                        <badge.icon size={9} /> {badge.label}
                      </span>
                    )}
                    {canKick && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleKick(String(u._id)); }}
                        disabled={kicking === String(u._id)}
                        className="btn btn-ghost btn-xs btn-circle text-error opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove member"
                      >
                        {kicking === String(u._id)
                          ? <span className="loading loading-spinner loading-xs" />
                          : <UserMinus size={13} />
                        }
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
      <AnimatePresence>
        {profileUser && (
          <UserProfileModal
            user={profileUser}
            isOnline={onlineUsers.includes(String(profileUser._id))}
            onClose={() => setProfileUser(null)}
            onStartChat={(u) => {
              useChatStore.getState().setChatSection("dms");
              useChatStore.getState().setActiveUser(u);
              onClose();
            }}
            zBase={60}
          />
        )}
      </AnimatePresence>
    </>
  );
}
