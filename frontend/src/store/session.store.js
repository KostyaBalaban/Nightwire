import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import { generateKeyPair, savePrivateKey, loadPrivateKey } from "../lib/crypto.js";

export const useSessionStore = create((set, get) => ({
  user: null,
  isChecking: true,

  checkSession: async () => {
    try {
      const { data } = await axiosInstance.get("/auth/check");
      set({ user: data.user });
      // Do NOT regenerate keys here — silently uploading a new public key would
      // overwrite the server key and break decryption on every other session/device.
    } catch {
      set({ user: null });
    } finally {
      set({ isChecking: false });
    }
  },

  signup: async (payload) => {
    const { publicKey, privateKey } = await generateKeyPair();
    const { data } = await axiosInstance.post("/auth/signup", { ...payload, publicKey });
    set({ user: data.user });
    savePrivateKey(privateKey); // save AFTER user is set so pkKey() gets the real userId
    return data.user;
  },

  login: async (payload) => {
    const { data } = await axiosInstance.post("/auth/login", payload);
    set({ user: data.user });
    // Do NOT regenerate keys on login — if the private key is missing (incognito,
    // new device, cleared storage) silently uploading a new public key would
    // overwrite the server key and break every other open session.
    return data.user;
  },

  resetEncryptionKeys: async () => {
    const { publicKey, privateKey } = await generateKeyPair();
    await axiosInstance.put("/auth/update-profile", { publicKey });
    savePrivateKey(privateKey);
  },

  logout: async () => {
    await axiosInstance.post("/auth/logout");
    set({ user: null });
  },

  updateProfile: async (payload) => {
    const { data } = await axiosInstance.put("/auth/update-profile", payload);
    set({ user: data.user });
    return data.user;
  },

  verifyEmail: async (code) => {
    const { data } = await axiosInstance.post("/auth/verify-email", { code });
    set({ user: data.user });
    return data.user;
  },

  resendVerification: async () => {
    await axiosInstance.post("/auth/resend-verify");
  },
}));
