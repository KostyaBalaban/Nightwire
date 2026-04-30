import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, User, Zap } from "lucide-react";
import toast from "react-hot-toast";
import { useSessionStore } from "../../store/session.store.js";
import ThemeToggle from "../../widgets/ThemeToggle.jsx";

export default function SignupScreen() {
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const signup = useSessionStore((s) => s.signup);
  const navigate = useNavigate();

  const set = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await signup(form);
      toast.success("Account created — welcome!");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-base-100">
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-col justify-center items-center w-5/12 bg-base-200 relative overflow-hidden border-r border-base-300">
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 14 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-ember-500/10"
              style={{
                width:  `${(i + 1) * 80}px`,
                height: `${(i + 1) * 80}px`,
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}
        </div>

        <div className="relative z-10 px-14 text-center space-y-5">
          <div className="flex items-center gap-3 justify-center">
            <div className="w-12 h-12 bg-ember-500 rounded-2xl flex items-center justify-center shadow-lg shadow-ember-500/30">
              <Zap size={26} className="text-white" />
            </div>
            <span className="text-3xl font-bold tracking-tight text-base-content">
              NightWire
            </span>
          </div>

          <p className="text-base-content/50 text-base leading-relaxed max-w-xs">
            Join in seconds. Start a conversation with anyone on the platform
            right away.
          </p>
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

            <h1 className="text-2xl font-bold text-base-content mb-1">
              Create account
            </h1>
            <p className="text-base-content/50 text-sm mb-8">
              Free forever — takes 10 seconds
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-base-content/60 mb-1.5">
                  Full name
                </label>
                <div className="relative">
                  <User
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40"
                  />
                  <input
                    name="fullName"
                    type="text"
                    value={form.fullName}
                    onChange={set}
                    placeholder="Jane Doe"
                    required
                    className="input input-bordered w-full pl-9 bg-base-200 border-base-300 focus:border-primary focus:outline-none text-sm"
                  />
                </div>
              </div>

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
                  <span className="text-base-content/30 font-normal ml-1">
                    (min 6 chars)
                  </span>
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

              <button
                type="submit"
                className="btn btn-primary w-full mt-2"
                disabled={loading}
              >
                {loading ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  "Create account"
                )}
              </button>
            </form>

            <p className="text-center text-sm text-base-content/50 mt-6">
              Already have one?{" "}
              <Link
                to="/login"
                className="text-primary hover:text-ember-400 font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
