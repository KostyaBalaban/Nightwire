import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import AppRouter from "./router.jsx";
import { useSessionStore } from "../store/session.store.js";
import { usePrefsStore } from "../store/prefs.store.js";
import { useChatStore } from "../store/chat.store.js";
import { useGroupStore } from "../store/group.store.js";

export default function App() {
  const checkSession = useSessionStore((s) => s.checkSession);
  const isChecking = useSessionStore((s) => s.isChecking);
  const theme = usePrefsStore((s) => s.theme);
  const fontSize = usePrefsStore((s) => s.fontSize);

  useEffect(() => {
    // Apply saved theme + font before anything renders
    document.documentElement.setAttribute("data-theme", theme);
    document.body.classList.add(`font-${fontSize}`);

    // Check auth, then sync server-side settings to prefs store
    checkSession().then(() => {
      const user = useSessionStore.getState().user;
      if (user?.settings) {
        usePrefsStore.getState().syncFromUser(user.settings);
      }
    });

    // Request push permission if previously granted
    if ("Notification" in window && Notification.permission === "granted") {
      usePrefsStore.getState().setPushEnabled?.(true) ??
        usePrefsStore.setState({ pushEnabled: true });
    }
  }, []);

  // Fetch data once user is authenticated
  useEffect(() => {
    const user = useSessionStore.getState().user;
    if (!isChecking && user) {
      useChatStore.getState().fetchPreviews();
      useGroupStore.getState().fetchGroups();
    }
  }, [isChecking]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <span className="loading loading-ring loading-lg text-primary" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppRouter />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "var(--b2, #13131e)",
            color: "var(--bc, #f0ede8)",
            border: "1px solid var(--b3, #1c1b2a)",
            fontSize: "14px",
          },
        }}
      />
    </BrowserRouter>
  );
}
