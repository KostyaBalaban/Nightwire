import { Lock } from "lucide-react";

export default function EncryptionBadge() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-base-content/40 select-none">
      <Lock size={11} />
      <span>End-to-end encrypted</span>
    </div>
  );
}
