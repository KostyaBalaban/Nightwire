import { useState, useRef } from "react";
import { Shield, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { useSessionStore } from "../store/session.store.js";

export default function EmailVerifyScreen({ onVerified }) {
  const [code, setCode]     = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef([]);

  const verifyEmail     = useSessionStore((s) => s.verifyEmail);
  const resendVerify    = useSessionStore((s) => s.resendVerification);
  const user            = useSessionStore((s) => s.user);

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...code];
    next[i] = val;
    setCode(next);
    if (val && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !code[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fullCode = code.join("");
    if (fullCode.length !== 6) return toast.error("Enter all 6 digits");
    setLoading(true);
    try {
      await verifyEmail(fullCode);
      toast.success("Email verified!");
      onVerified?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid code");
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await resendVerify();
      toast.success("New code sent — check your email");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resend");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield size={28} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-base-content mb-2">Verify your email</h1>
          <p className="text-base-content/50 text-sm">
            Enter the 6-digit code sent to <br />
            <span className="text-base-content font-medium">{user?.email}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
            {code.map((digit, i) => (
              <input
                key={i}
                ref={(el) => (inputRefs.current[i] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-11 h-14 text-center text-xl font-bold bg-base-200 border-2 border-base-300 focus:border-primary rounded-xl outline-none transition-colors"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || code.join("").length !== 6}
            className="btn btn-primary w-full"
          >
            {loading ? <span className="loading loading-spinner loading-sm" /> : "Verify email"}
          </button>
        </form>

        <div className="text-center mt-4">
          <button
            onClick={handleResend}
            disabled={resending}
            className="btn btn-ghost btn-sm text-base-content/50 gap-1.5"
          >
            <RotateCcw size={13} />
            {resending ? "Sending…" : "Resend code"}
          </button>
        </div>
      </div>
    </div>
  );
}
