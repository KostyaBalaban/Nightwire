import AvatarWithStatus from "./AvatarWithStatus.jsx";

export default function ThreadCard({ user, isActive, isOnline, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group ${
        isActive
          ? "bg-ember-500/15 border border-ember-500/30"
          : "hover:bg-base-300/60 border border-transparent"
      }`}
    >
      <AvatarWithStatus
        src={user.profilePic}
        name={user.fullName}
        online={isOnline}
      />
      <div className="flex-1 min-w-0">
        <p
          className={`font-medium text-sm truncate ${
            isActive ? "text-primary" : "text-base-content"
          }`}
        >
          {user.fullName}
        </p>
        <p
          className={`text-xs mt-0.5 ${
            isOnline ? "text-green-400" : "text-base-content/40"
          }`}
        >
          {isOnline ? "Online" : "Offline"}
        </p>
      </div>
    </button>
  );
}
