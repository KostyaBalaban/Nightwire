import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Moon, Sun, Bell, BellOff, Eye, EyeOff,
  Monitor, Shield, User, Palette, Minimize2,
  BadgeCheck, KeyRound, AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import { usePrefsStore }  from "../store/prefs.store.js";
import { useSessionStore } from "../store/session.store.js";
import { loadPrivateKey }  from "../lib/crypto.js";
import AvatarWithStatus   from "../widgets/AvatarWithStatus.jsx";

const TABS = [
  { id: "profile",       label: "Profile",       icon: User    },
  { id: "appearance",    label: "Appearance",     icon: Palette },
  { id: "notifications", label: "Notifications",  icon: Bell    },
  { id: "privacy",       label: "Privacy",        icon: Shield  },
];

function Toggle({ checked, onChange }) {
  return (
    <input
      type="checkbox"
      className="toggle toggle-primary toggle-sm"
      checked={checked}
      onChange={onChange}
    />
  );
}

function Row({ icon: Icon, label, sub, right }) {
  return (
    <div className="px-5 py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {Icon && <Icon size={18} className="text-base-content/50 flex-shrink-0" />}
        <div>
          <p className="text-sm font-medium text-base-content">{label}</p>
          {sub && <p className="text-xs text-base-content/40">{sub}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

// ─── Tab: Profile ─────────────────────────────────────────────────────────────

function ProfileTab() {
  const user              = useSessionStore((s) => s.user);
  const updateProfile     = useSessionStore((s) => s.updateProfile);
  const verifyEmail       = useSessionStore((s) => s.verifyEmail);
  const resendVerification = useSessionStore((s) => s.resendVerification);

  const [bio, setBio]           = useState(user?.bio ?? "");
  const [saving, setSaving]     = useState(false);
  const [uploading, setUploading] = useState(false);

  const [showVerify, setShowVerify] = useState(false);
  const [code, setCode]             = useState("");
  const [sending, setSending]       = useState(false);
  const [verifying, setVerifying]   = useState(false);

  const handleOpenVerify = async () => {
    setSending(true);
    try {
      await resendVerification();
      setCode("");
      setShowVerify(true);
      toast.success("Verification code sent to your email");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send code");
    } finally {
      setSending(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) return toast.error("Enter the 6-digit code");
    setVerifying(true);
    try {
      await verifyEmail(code.trim());
      setShowVerify(false);
      setCode("");
      toast.success("Email verified!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid or expired code");
    } finally {
      setVerifying(false);
    }
  };

  const handleBioSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ bio });
      toast.success("Bio saved");
    } catch { toast.error("Failed to save bio"); }
    finally { setSaving(false); }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5 MB"); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      setUploading(true);
      try { await updateProfile({ profilePic: reader.result }); toast.success("Avatar updated"); }
      catch { toast.error("Upload failed"); }
      finally { setUploading(false); }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <div className="relative">
          <AvatarWithStatus src={user?.profilePic} name={user?.fullName} size="lg" online />
          <label className={`absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer shadow-md transition-colors ${uploading ? "bg-base-300" : "bg-ember-500 hover:bg-ember-400"}`}>
            {uploading
              ? <span className="loading loading-spinner loading-xs text-white" />
              : <span className="text-white text-sm">📷</span>
            }
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={uploading} />
          </label>
        </div>
        <p className="text-xs text-base-content/40">Click camera to update</p>
      </div>

      {/* Info */}
      <div className="bg-base-200 rounded-2xl divide-y divide-base-300 border border-base-300">
        <div className="px-5 py-4">
          <p className="text-xs text-base-content/40 mb-1">Full name</p>
          <p className="text-base-content font-medium">{user?.fullName}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-base-content/40 mb-1">Email</p>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <p className="text-base-content">{user?.email}</p>
              {user?.emailVerified
                ? <BadgeCheck size={14} className="text-success flex-shrink-0" title="Verified" />
                : <span className="text-xs text-warning font-medium">Not verified</span>
              }
            </div>
            {!user?.emailVerified && !showVerify && (
              <button
                onClick={handleOpenVerify}
                disabled={sending}
                className="btn btn-xs btn-outline btn-warning gap-1"
              >
                {sending
                  ? <span className="loading loading-spinner loading-xs" />
                  : "Verify email"
                }
              </button>
            )}
          </div>

          {/* Verification code input */}
          {showVerify && !user?.emailVerified && (
            <form onSubmit={handleVerifySubmit} className="mt-3 space-y-2">
              <p className="text-xs text-base-content/50">
                Enter the 6-digit code sent to <span className="text-base-content font-medium">{user?.email}</span>
              </p>
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="input input-sm flex-1 bg-base-300 border-base-300 focus:border-primary focus:outline-none font-mono tracking-widest text-center text-lg"
                  autoFocus
                  maxLength={6}
                  inputMode="numeric"
                />
                <button
                  type="submit"
                  disabled={verifying || code.length !== 6}
                  className="btn btn-sm btn-primary"
                >
                  {verifying ? <span className="loading loading-spinner loading-xs" /> : "Confirm"}
                </button>
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleOpenVerify}
                  disabled={sending}
                  className="text-xs text-base-content/40 hover:text-primary underline underline-offset-2 transition-colors"
                >
                  {sending ? "Sending…" : "Resend code"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowVerify(false); setCode(""); }}
                  className="text-xs text-base-content/30 hover:text-base-content transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-base-content/40 mb-2">Bio</p>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 150))}
            rows={2}
            placeholder="A short intro about yourself…"
            className="w-full bg-base-300 rounded-xl px-3 py-2 text-sm text-base-content placeholder:text-base-content/30 border border-transparent focus:border-primary focus:outline-none resize-none"
          />
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs text-base-content/30">{bio.length}/150</span>
            <button
              onClick={handleBioSave}
              disabled={saving || bio === (user?.bio ?? "")}
              className="btn btn-primary btn-xs"
            >
              {saving ? <span className="loading loading-spinner loading-xs" /> : "Save"}
            </button>
          </div>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-base-content/40 mb-1">Member since</p>
          <p className="text-base-content">
            {user?.createdAt
              ? new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
              : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Appearance ──────────────────────────────────────────────────────────

function AppearanceTab() {
  const theme           = usePrefsStore((s) => s.theme);
  const setTheme        = usePrefsStore((s) => s.setTheme);
  const fontSize        = usePrefsStore((s) => s.fontSize);
  const setFont         = usePrefsStore((s) => s.setFontSize);
  const minimalistMode  = usePrefsStore((s) => s.minimalistMode);
  const setMinimalist   = usePrefsStore((s) => s.setMinimalistMode);

  const isDark = theme === "nightwire";

  return (
    <div className="space-y-4">
      <div className="bg-base-200 rounded-2xl divide-y divide-base-300 border border-base-300">
        <Row
          icon={isDark ? Moon : Sun}
          label="Theme"
          sub={isDark ? "Dark — Ember Depths" : "Light — Dawn"}
          right={<Toggle checked={isDark} onChange={() => setTheme(isDark ? "nightwire_light" : "nightwire")} />}
        />
        <Row
          icon={Minimize2}
          label="Minimalist mode"
          sub="Clean UI — hides decorative elements"
          right={<Toggle checked={minimalistMode} onChange={() => setMinimalist(!minimalistMode)} />}
        />
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-base-content/40 px-1 mb-3">Font size</p>
        <div className="bg-base-200 rounded-2xl p-4 border border-base-300">
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "sm", label: "Compact",  sample: "Aa" },
              { id: "md", label: "Normal",   sample: "Aa" },
              { id: "lg", label: "Large",    sample: "Aa" },
            ].map(({ id, label, sample }) => (
              <button
                key={id}
                onClick={() => setFont(id)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all ${
                  fontSize === id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-base-300 hover:border-base-content/30"
                }`}
              >
                <span
                  className="font-semibold"
                  style={{ fontSize: id === "sm" ? 14 : id === "md" ? 18 : 22 }}
                >
                  {sample}
                </span>
                <span className="text-xs">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Notifications ───────────────────────────────────────────────────────

function NotificationsTab() {
  const soundOnMessage = usePrefsStore((s) => s.soundOnMessage);
  const setSoundMsg    = usePrefsStore((s) => s.setSoundOnMessage);
  const soundOnSend    = usePrefsStore((s) => s.soundOnSend);
  const setSoundSend   = usePrefsStore((s) => s.setSoundOnSend);
  const pushEnabled    = usePrefsStore((s) => s.pushEnabled);
  const requestPush    = usePrefsStore((s) => s.requestPush);

  const pushSupported = "Notification" in window;
  const pushBlocked   = Notification.permission === "denied";

  return (
    <div className="bg-base-200 rounded-2xl divide-y divide-base-300 border border-base-300">
      <Row
        icon={soundOnMessage ? Bell : BellOff}
        label="Sound on message"
        sub="Play a tone when a new message arrives"
        right={<Toggle checked={soundOnMessage} onChange={() => setSoundMsg(!soundOnMessage)} />}
      />
      <Row
        icon={soundOnMessage ? Bell : BellOff}
        label="Sound on send"
        sub="Play a tone when you send a message"
        right={<Toggle checked={soundOnSend} onChange={() => setSoundSend(!soundOnSend)} />}
      />
      {pushSupported && (
        <Row
          icon={Monitor}
          label="Browser notifications"
          sub={
            pushBlocked
              ? "Blocked in browser settings"
              : pushEnabled
                ? "Shown when tab is in background"
                : "Allow push notifications"
          }
          right={
            pushBlocked ? (
              <span className="text-xs text-error">Blocked</span>
            ) : (
              <Toggle
                checked={pushEnabled}
                onChange={requestPush}
              />
            )
          }
        />
      )}
    </div>
  );
}

// ─── Tab: Privacy ─────────────────────────────────────────────────────────────

function PrivacyTab() {
  const lastSeenVisibility    = usePrefsStore((s) => s.lastSeenVisibility);
  const readReceiptsEnabled   = usePrefsStore((s) => s.readReceiptsEnabled);
  const updatePrivacy         = usePrefsStore((s) => s.updatePrivacy);
  const resetEncryptionKeys   = useSessionStore((s) => s.resetEncryptionKeys);
  const [resetting, setResetting] = useState(false);
  const hasKey = !!loadPrivateKey();

  const handleChange = async (field, value) => {
    try {
      await updatePrivacy({ [field]: value });
    } catch { toast.error("Failed to save"); }
  };

  const handleResetKeys = async () => {
    if (!window.confirm(
      "This will generate new encryption keys and upload your new public key to the server.\n\n" +
      "All previously encrypted messages will become permanently unreadable.\n\n" +
      "Continue?"
    )) return;
    setResetting(true);
    try {
      await resetEncryptionKeys();
      toast.success("Encryption keys reset — new messages will be encrypted with your new key");
    } catch {
      toast.error("Failed to reset keys");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-4">
    <div className="bg-base-200 rounded-2xl divide-y divide-base-300 border border-base-300">
      <Row
        icon={lastSeenVisibility === "all" ? Eye : EyeOff}
        label="Last seen"
        sub={lastSeenVisibility === "all" ? "Visible to everyone" : "Hidden from everyone"}
        right={
          <Toggle
            checked={lastSeenVisibility === "all"}
            onChange={() =>
              handleChange(
                "lastSeenVisibility",
                lastSeenVisibility === "all" ? "none" : "all"
              )
            }
          />
        }
      />
      <Row
        icon={readReceiptsEnabled ? Eye : EyeOff}
        label="Read receipts"
        sub={readReceiptsEnabled ? "Others see when you read" : "Read receipts hidden"}
        right={
          <Toggle
            checked={readReceiptsEnabled}
            onChange={() => handleChange("readReceiptsEnabled", !readReceiptsEnabled)}
          />
        }
      />
    </div>

    {/* Encryption */}
    <div className="bg-base-200 rounded-2xl border border-base-300 overflow-hidden">
      <div className="px-5 py-4 flex items-center gap-3 border-b border-base-300">
        <KeyRound size={18} className="text-base-content/50 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-base-content">End-to-end encryption</p>
          <p className="text-xs text-base-content/40">
            {hasKey ? "Private key found on this device" : "No private key on this device — messages cannot be decrypted here"}
          </p>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${hasKey ? "text-success bg-success/10" : "text-warning bg-warning/10"}`}>
          {hasKey ? "Active" : "Missing"}
        </span>
      </div>
      {!hasKey && (
        <div className="px-5 py-3 flex items-start gap-2 bg-warning/5 border-b border-base-300">
          <AlertTriangle size={14} className="text-warning flex-shrink-0 mt-0.5" />
          <p className="text-xs text-base-content/60 leading-relaxed">
            Your private key is not available on this device (e.g. incognito mode or new browser). Existing messages cannot be decrypted. Use &quot;Reset keys&quot; to generate a new key pair so future messages work — this permanently clears old encrypted messages.
          </p>
        </div>
      )}
      <div className="px-5 py-4">
        <button
          onClick={handleResetKeys}
          disabled={resetting}
          className="btn btn-error btn-sm btn-outline gap-2"
        >
          {resetting
            ? <span className="loading loading-spinner loading-xs" />
            : <KeyRound size={13} />
          }
          Reset encryption keys
        </button>
      </div>
    </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const [activeTab, setActiveTab] = useState("profile");
  const navigate = useNavigate();

  const TAB_CONTENT = {
    profile:       <ProfileTab />,
    appearance:    <AppearanceTab />,
    notifications: <NotificationsTab />,
    privacy:       <PrivacyTab />,
  };

  return (
    <div className="min-h-screen bg-base-100 flex flex-col">
      {/* Top bar */}
      <div className="px-4 py-3.5 border-b border-base-300 bg-base-200 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-circle btn-sm">
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-bold text-base-content">Settings</h1>
      </div>

      {/* Tab bar */}
      <div className="border-b border-base-300 bg-base-200 flex-shrink-0 overflow-x-auto">
        <div className="flex">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === id
                  ? "border-primary text-primary"
                  : "border-transparent text-base-content/50 hover:text-base-content"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-6">
          {TAB_CONTENT[activeTab]}
        </div>
      </div>
    </div>
  );
}
