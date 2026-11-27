import { useState } from "react";
import { motion } from "framer-motion";
import { X, Flag } from "lucide-react";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios.js";

const REASONS = [
  { value: "spam", label: "Spam or unwanted messages" },
  { value: "harassment", label: "Harassment or threats" },
  { value: "forbidden_content", label: "Prohibited content" },
  { value: "other", label: "Other" },
];

export default function ReportModal({ targetType, targetId, onClose }) {
  const [reason, setReason] = useState("");
  const [description, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) return toast.error("Select a reason");
    setLoading(true);
    try {
      await axiosInstance.post("/reports", { targetType, targetId, reason, description });
      toast.success("Report submitted — thank you");
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-[9998]" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-full max-w-sm bg-base-200 border border-base-300 rounded-2xl shadow-2xl p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Flag size={16} className="text-error" />
            <h2 className="font-bold text-base-content">Report</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-circle btn-xs">
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            {REASONS.map((r) => (
              <label
                key={r.value}
                className="flex items-center gap-3 cursor-pointer p-2.5 rounded-xl hover:bg-base-300 transition-colors"
              >
                <input
                  type="radio"
                  name="reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={(e) => setReason(e.target.value)}
                  className="radio radio-sm radio-primary"
                />
                <span className="text-sm text-base-content">{r.label}</span>
              </label>
            ))}
          </div>

          <textarea
            value={description}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Additional details (optional)…"
            rows={3}
            maxLength={500}
            className="textarea textarea-bordered w-full bg-base-300 border-base-300 text-sm resize-none focus:border-primary focus:outline-none"
          />

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn btn-ghost flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading || !reason} className="btn btn-error flex-1">
              {loading ? <span className="loading loading-spinner loading-xs" /> : "Submit Report"}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}
