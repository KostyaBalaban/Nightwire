import { Moon, Sun } from "lucide-react";
import { usePrefsStore } from "../store/prefs.store.js";

export default function ThemeToggle({ className = "" }) {
  const theme = usePrefsStore((s) => s.theme);
  const setTheme = usePrefsStore((s) => s.setTheme);
  const isDark = theme === "nightwire";

  return (
    <button
      onClick={() => setTheme(isDark ? "nightwire_light" : "nightwire")}
      className={`btn btn-ghost btn-circle btn-sm ${className}`}
      title="Toggle theme"
    >
      {isDark ? (
        <Sun size={16} className="text-amber-400" />
      ) : (
        <Moon size={16} className="text-base-content/60" />
      )}
    </button>
  );
}
