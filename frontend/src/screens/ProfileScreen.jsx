import { useNavigate } from "react-router-dom";
import { ArrowLeft, Settings } from "lucide-react";
import { useSessionStore } from "../store/session.store.js";
import AvatarWithStatus from "../widgets/AvatarWithStatus.jsx";

export default function ProfileScreen() {
  const user     = useSessionStore((s) => s.user);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      <div className="px-4 py-3.5 border-b border-base-300 bg-base-200 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-circle btn-sm">
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-bold text-base-content flex-1">Profile</h1>
        <button
          onClick={() => navigate("/settings")}
          className="btn btn-ghost btn-circle btn-sm"
          title="Settings"
        >
          <Settings size={16} className="text-base-content/60" />
        </button>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-8 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <AvatarWithStatus src={user?.profilePic} name={user?.fullName} size="lg" online />
          <div className="text-center">
            <p className="text-lg font-bold text-base-content">{user?.fullName}</p>
            {user?.bio && (
              <p className="text-sm text-base-content/60 mt-1 max-w-xs">{user.bio}</p>
            )}
          </div>
        </div>

        <div className="bg-base-200 rounded-2xl divide-y divide-base-300 border border-base-300">
          <div className="px-5 py-4">
            <p className="text-xs text-base-content/40 mb-1">Email</p>
            <p className="text-base-content">{user?.email}</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-xs text-base-content/40 mb-1">Member since</p>
            <p className="text-base-content">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString("en-US", {
                    year: "numeric", month: "long", day: "numeric",
                  })
                : "—"}
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate("/settings")}
          className="btn btn-primary w-full"
        >
          Edit profile & settings
        </button>
      </div>
    </div>
  );
}
