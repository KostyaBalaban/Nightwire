import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Zap } from "lucide-react";
import toast from "react-hot-toast";
import { useSessionStore } from "../../store/session.store.js";
import ThemeToggle from "../../widgets/ThemeToggle.jsx";

export default function LoginScreen() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const login = useSessionStore((s) => s.login);
  const navigate = useNavigate();

  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form);
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-base-100">
      {/* Left decorative panel — desktop only */}
      <div className="hidden lg:flex flex-col justify-center items-center w-5/12 bg-base-200 relative overflow-hidden border-r border-base-300">
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 14 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-ember-500/10"
              style={{
                width: `${(i + 1) * 80}px`,
                height: `${(i + 1) * 80}px`,
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}
        </div>

        <div className="relative z-10 px-14 text-center space-y-6">
          <div className="flex items-center gap-3 justify-center">
            <div className="w-12 h-12 bg-ember-500 rounded-2xl flex items-center justify-center shadow-lg shadow-ember-500/30">
              <Zap size={26} className="text-white" />
            </div>
            <span className="text-3xl font-bold tracking-tight text-base-content">NightWire</span>
          </div>

          <p className="text-base-content/50 text-base leading-relaxed max-w-xs">
            Real-time messaging with a warm, distinctive feel. No noise — just your conversations.
          </p>

          <div className="grid grid-cols-2 gap-3 mt-8">
            {["Instant delivery", "Online status", "Image sharing", "Dark & light"].map((f) => (
              <div
                key={f}
                className="bg-base-300/60 rounded-xl px-4 py-3 text-sm text-base-content/60 border border-base-300"
              >
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col bg-base-100">
        <div className="flex justify-end p-4">
          <ThemeToggle />
        </div>

        <div className="flex-1 flex flex-col justify-center items-center px-8 pb-16">
          <div className="w-full max-w-sm">
            {/* Mobile logo */}
            <div className="flex items-center gap-2 mb-8 lg:hidden">
              <div className="w-9 h-9 bg-ember-500 rounded-xl flex items-center justify-center">
                <Zap size={18} className="text-white" />
              </div>
              <span className="text-xl font-bold">NightWire</span>
            </div>

            <h1 className="text-2xl font-bold text-base-content mb-1">Welcome back</h1>
            <p className="text-base-content/50 text-sm mb-8">Sign in to continue</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-base-content/60 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40"
                  />
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={set}
                    placeholder="you@example.com"
                    required
                    className="input input-bordered w-full pl-9 bg-base-200 border-base-300 focus:border-primary focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-base-content/60 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40"
                  />
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={set}
                    placeholder="••••••••"
                    required
                    className="input input-bordered w-full pl-9 bg-base-200 border-base-300 focus:border-primary focus:outline-none text-sm"
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full mt-2" disabled={loading}>
                {loading ? <span className="loading loading-spinner loading-sm" /> : "Sign in"}
              </button>
            </form>

            <p className="text-center text-sm text-base-content/50 mt-6">
              No account?{" "}
              <Link
                to="/signup"
                className="text-primary hover:text-ember-400 font-medium transition-colors"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
