import { motion } from "framer-motion";
import { X, BadgeCheck, Shield, MessageSquare } from "lucide-react";
import AvatarWithStatus from "./AvatarWithStatus.jsx";

export default function UserProfileModal({ user, isOnline, onClose, onStartChat, zBase = 40 }) {
  if (!user) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50" style={{ zIndex: zBase }} onClick={onClose} />
      <div
        className="fixed inset-0 flex items-center justify-center pointer-events-none"
        style={{ zIndex: zBase + 10 }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.93 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.93 }}
          transition={{ duration: 0.15 }}
          className="pointer-events-auto w-full max-w-sm mx-4 bg-base-200 border border-base-300 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Banner */}
          <div className="h-24 bg-gradient-to-br from-primary/30 to-primary/10 relative">
            <button
              onClick={onClose}
              className="absolute top-3 right-3 btn btn-ghost btn-circle btn-sm"
            >
              <X size={16} />
            </button>
          </div>

          {/* Avatar */}
          <div className="px-5 pb-5">
            <div className="-mt-10 mb-3">
              <AvatarWithStatus
                src={user.profilePic}
                name={user.fullName}
                size="lg"
                online={isOnline}
              />
            </div>

            <div className="space-y-1 mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-base-content">{user.fullName}</h2>
                {user.isAdmin && (
                  <span className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">
                    <Shield size={11} /> Admin
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {user.email && <p className="text-sm text-base-content/50">{user.email}</p>}
                {user.emailVerified && (
                  <BadgeCheck size={14} className="text-success flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-base-content/40">{isOnline ? "🟢 Online" : "Offline"}</p>
            </div>

            {user.bio && (
              <div className="bg-base-300 rounded-xl px-4 py-3 mb-4">
                <p className="text-xs text-base-content/40 mb-1 font-medium uppercase tracking-wider">
                  Bio
                </p>
                <p className="text-sm text-base-content/80 leading-relaxed">{user.bio}</p>
              </div>
            )}

            {user.createdAt && (
              <p className="text-xs text-base-content/30 text-center mb-4">
                Member since{" "}
                {new Date(user.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                })}
              </p>
            )}

            {onStartChat && (
              <button
                onClick={() => onStartChat(user)}
                className="btn btn-primary btn-sm w-full gap-2"
              >
                <MessageSquare size={14} /> Send message
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
}
