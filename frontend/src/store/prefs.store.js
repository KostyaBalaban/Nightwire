import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import { socket } from "../lib/socket.js";

function readLocal(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}

function applyFont(size) {
  document.body.classList.remove("font-sm", "font-md", "font-lg");
  document.body.classList.add(`font-${size}`);
}

export const usePrefsStore = create((set) => ({
  theme: readLocal("nw_theme", "nightwire"),
  soundOnMessage: readLocal("nw_snd_msg", true),
  soundOnSend: readLocal("nw_snd_send", true),
  fontSize: readLocal("nw_font", "md"),
  pushEnabled: readLocal("nw_push", false),
  minimalistMode: readLocal("nw_minimalist", false),

  // privacy (server-side, seeded after login)
  lastSeenVisibility: "all",
  readReceiptsEnabled: true,

  // ─── appearance ──────────────────────────────────────────────────────────

  setTheme: (theme) => {
    localStorage.setItem("nw_theme", JSON.stringify(theme));
    document.documentElement.setAttribute("data-theme", theme);
    set({ theme });
  },

  setFontSize: (size) => {
    localStorage.setItem("nw_font", JSON.stringify(size));
    applyFont(size);
    set({ fontSize: size });
  },

  setMinimalistMode: (val) => {
    localStorage.setItem("nw_minimalist", JSON.stringify(val));
    if (val) document.body.classList.add("minimalist");
    else document.body.classList.remove("minimalist");
    set({ minimalistMode: val });
  },

  // ─── sounds ──────────────────────────────────────────────────────────────

  setSoundOnMessage: (val) => {
    localStorage.setItem("nw_snd_msg", JSON.stringify(val));
    set({ soundOnMessage: val });
  },

  setSoundOnSend: (val) => {
    localStorage.setItem("nw_snd_send", JSON.stringify(val));
    set({ soundOnSend: val });
  },

  // ─── push notifications ──────────────────────────────────────────────────

  requestPush: async () => {
    if (!("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    const enabled = perm === "granted";
    localStorage.setItem("nw_push", JSON.stringify(enabled));
    set({ pushEnabled: enabled });
  },

  // ─── privacy (synced to server) ──────────────────────────────────────────

  updatePrivacy: async (patch) => {
    await axiosInstance.put("/auth/update-profile", { settings: patch });
    set(patch);
    if ("lastSeenVisibility" in patch) {
      socket.emit("privacy:online", { hide: patch.lastSeenVisibility === "none" });
    }
  },

  // ─── bootstrap ───────────────────────────────────────────────────────────

  syncFromUser: (userSettings) => {
    if (!userSettings) return;
    const s = userSettings;
    applyFont(s.fontSize ?? readLocal("nw_font", "md"));
    set({
      lastSeenVisibility: s.lastSeenVisibility ?? "all",
      readReceiptsEnabled: s.readReceiptsEnabled ?? true,
      soundOnMessage: s.soundOnMessage ?? readLocal("nw_snd_msg", true),
      soundOnSend: s.soundOnSend ?? readLocal("nw_snd_send", true),
      fontSize: s.fontSize ?? readLocal("nw_font", "md"),
    });
  },
}));
