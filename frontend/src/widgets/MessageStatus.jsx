import { Check, CheckCheck } from "lucide-react";

export default function MessageStatus({ status, size = 13 }) {
  if (status === "read") {
    return <CheckCheck size={size} className="text-blue-400 flex-shrink-0" />;
  }
  if (status === "delivered") {
    return <CheckCheck size={size} className="text-white/40 flex-shrink-0" />;
  }
  return <Check size={size} className="text-white/30 flex-shrink-0" />;
}
