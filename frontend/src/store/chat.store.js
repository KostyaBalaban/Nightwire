import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import { decryptMessage, loadPrivateKey, cacheSentPlaintext, loadSentPlaintext } from "../lib/crypto.js";
import { useSessionStore } from "./session.store.js";

const ENCRYPTED_PLACEHOLDER = "🔒 Encrypted message";

function isBadDecrypt(text) {
  return !text || text.startsWith("[");
}

async function tryDecrypt(text, privKey) {
  if (!privKey || !text) return ENCRYPTED_PLACEHOLDER;
  const result = await decryptMessage(text, privKey);
  return isBadDecrypt(result) ? ENCRYPTED_PLACEHOLDER : result;
}

// Only decrypt messages received by currentUser (sent by someone else).
// Own sent messages were encrypted with the recipient's key — we can't decrypt them.
async function decryptMessages(messages) {
  const privKey = loadPrivateKey();
  const currentUserId = String(useSessionStore.getState().user?._id ?? "");

  return Promise.all(
    messages.map(async (m) => {
      let result = m;

      if (m.isEncrypted && m.text) {
        const senderId = String(m.senderId?._id ?? m.senderId ?? "");
        const isMine = senderId === currentUserId;
        if (isMine) {
          // own message — encrypted with recipient's key, can't decrypt
          // check local plaintext cache first (populated when message was sent)
          const cached = loadSentPlaintext(m._id);
          result = { ...result, text: cached ?? ENCRYPTED_PLACEHOLDER };
        } else {
          result = { ...result, text: await tryDecrypt(m.text, privKey) };
        }
      }

      if (m.replyTo?.isEncrypted && m.replyTo?.text) {
        result = {
          ...result,
          replyTo: { ...m.replyTo, text: await tryDecrypt(m.replyTo.text, privKey) },
        };
      }

      return result;
    })
  );
}

export const useChatStore = create((set, get) => ({
  users: [],
  activeUser: null,
  messages: [],
  onlineUsers: [],
  isLoadingMessages: false,
  isLoadingUsers: false,

  // top-level section: "dms" | "groups"
  chatSection: "dms",
  setChatSection: (section) => set({ chatSection: section }),

  // typing
  typingUsers: new Set(),

  // unread counts per userId
  unreadCounts: {},

  // conversation previews { [userId]: { lastMessage, unread } }
  previews: {},

  // reply
  replyTo: null,

  // edit
  editingMessage: null,

  // search
  searchResults: [],
  isSearching: false,

  // ─── users ────────────────────────────────────────────────────────────────

  fetchUsers: async () => {
    set({ isLoadingUsers: true });
    try {
      const { data } = await axiosInstance.get("/messages/users");
      set({ users: data.users });
    } catch {
      /* silent */
    } finally {
      set({ isLoadingUsers: false });
    }
  },

  fetchPreviews: async () => {
    try {
      const { data } = await axiosInstance.get("/messages/previews");
      const privKey = loadPrivateKey();
      const currentUserId = String(useSessionStore.getState().user?._id ?? "");
      const map = {};

      await Promise.all(data.previews.map(async (p) => {
        let lastMessage = p.lastMessage;
        if (lastMessage?.isEncrypted && lastMessage?.text) {
          const senderId = String(lastMessage.senderId ?? "");
          const isMine = senderId === currentUserId;
          if (isMine) {
            const cached = loadSentPlaintext(lastMessage._id);
            lastMessage = { ...lastMessage, text: cached ?? ENCRYPTED_PLACEHOLDER };
          } else {
            lastMessage = { ...lastMessage, text: await tryDecrypt(lastMessage.text, privKey) };
          }
        }
        map[String(p._id)] = { lastMessage, unread: p.unread ?? 0 };
      }));

      const counts = {};
      data.previews.forEach((p) => {
        if (p.unread > 0) counts[String(p._id)] = p.unread;
      });
      set({ previews: map, unreadCounts: counts });
    } catch {
      /* silent */
    }
  },

  // ─── active conversation ──────────────────────────────────────────────────

  setActiveUser: async (user) => {
    set({ activeUser: user, messages: [], isLoadingMessages: true, replyTo: null, editingMessage: null });
    try {
      const { data } = await axiosInstance.get(`/messages/${user._id}`);
      const messages = await decryptMessages(data.messages);
      set({ messages });
    } finally {
      set({ isLoadingMessages: false });
    }
  },

  clearActiveUser: () =>
    set({ activeUser: null, messages: [], replyTo: null, editingMessage: null }),

  // ─── send / edit / delete ────────────────────────────────────────────────

  sendMessage: async (payload) => {
    const { activeUser, messages, replyTo } = get();
    // _localText is the original plaintext for sender's own display
    const { _localText, ...serverPayload } = payload;
    // attach plain-text snippet of the quoted message so the recipient can display it
    if (replyTo?.text) serverPayload.replyToSnippet = replyTo.text;
    const { data } = await axiosInstance.post(`/messages/send/${activeUser._id}`, {
      ...serverPayload,
      replyTo: replyTo?._id ?? null,
    });
    let localMsg = data.message;
    if (_localText && data.message.isEncrypted) {
      localMsg = { ...localMsg, text: _localText };
      // persist plaintext so it survives page reload
      cacheSentPlaintext(data.message._id, _localText);
    }
    // server returns replyTo with encrypted text — use the local decrypted object instead
    if (replyTo && localMsg.replyTo) {
      localMsg = { ...localMsg, replyTo };
    }
    set({ messages: [...messages, localMsg], replyTo: null });
    get()._updatePreview(String(activeUser._id), localMsg);
  },

  editMessage: async (messageId, text) => {
    const { data } = await axiosInstance.patch(`/messages/${messageId}`, { text });
    set((s) => ({
      messages: s.messages.map((m) =>
        String(m._id) === String(messageId) ? data.message : m
      ),
      editingMessage: null,
    }));
  },

  deleteMessage: async (messageId, forEveryone) => {
    const { data } = await axiosInstance.delete(
      `/messages/${messageId}?forEveryone=${forEveryone}`
    );
    set((s) => ({
      messages: s.messages.map((m) =>
        String(m._id) === String(messageId) ? data.message : m
      ),
    }));
  },

  clearChatHistory: async (userId) => {
    await axiosInstance.delete(`/messages/chat/${userId}`);
    set({ messages: [] });
    set((s) => {
      const next = { ...s.previews };
      delete next[String(userId)];
      return { previews: next };
    });
  },

  // ─── real-time incoming ──────────────────────────────────────────────────

  receiveMessage: (msg) => {
    const { activeUser, messages, unreadCounts } = get();
    const fromId = String(msg.senderId);
    const isActiveConvo =
      activeUser && String(activeUser._id) === fromId;

    if (isActiveConvo) {
      set({ messages: [...messages, msg] });
    } else {
      set({
        unreadCounts: {
          ...unreadCounts,
          [fromId]: (unreadCounts[fromId] ?? 0) + 1,
        },
      });
    }

    // update preview
    get()._updatePreview(fromId, msg);
  },

  applyMessageEdit: (updatedMsg) => {
    set((s) => ({
      messages: s.messages.map((m) =>
        String(m._id) === String(updatedMsg._id) ? updatedMsg : m
      ),
    }));
  },

  applyMessageDelete: ({ messageId, isDeletedForEveryone }) => {
    if (!isDeletedForEveryone) return;
    set((s) => ({
      messages: s.messages.map((m) =>
        String(m._id) === String(messageId)
          ? { ...m, isDeletedForEveryone: true, text: "", image: "" }
          : m
      ),
    }));
  },

  applyMessagesRead: ({ senderId }) => {
    set((s) => ({
      messages: s.messages.map((m) =>
        String(m.receiverId) === String(senderId) && m.status !== "read"
          ? { ...m, status: "read" }
          : m
      ),
    }));
  },

  applyReaction: ({ messageId, reactions }) => {
    set((s) => ({
      messages: s.messages.map((m) =>
        String(m._id) === String(messageId) ? { ...m, reactions } : m
      ),
    }));
  },

  toggleReaction: async (messageId, emoji) => {
    const { data } = await axiosInstance.post(`/messages/${messageId}/react`, { emoji });
    // only update reactions — replacing the whole message would overwrite decrypted text
    set((s) => ({
      messages: s.messages.map((m) =>
        String(m._id) === String(messageId)
          ? { ...m, reactions: data.message.reactions }
          : m
      ),
    }));
  },

  // ─── online / typing ─────────────────────────────────────────────────────

  setOnlineUsers: (ids) => set({ onlineUsers: ids }),

  setTyping: (senderId, active) => {
    set((s) => {
      const next = new Set(s.typingUsers);
      active ? next.add(String(senderId)) : next.delete(String(senderId));
      return { typingUsers: next };
    });
  },

  // ─── unread ──────────────────────────────────────────────────────────────

  markAsRead: (userId) => {
    set((s) => {
      const next = { ...s.unreadCounts };
      delete next[String(userId)];
      return { unreadCounts: next };
    });
  },

  // ─── reply / edit state ──────────────────────────────────────────────────

  setReplyTo:          (msg) => set({ replyTo: msg }),
  clearReplyTo:        ()    => set({ replyTo: null }),
  setEditingMessage:   (msg) => set({ editingMessage: msg, replyTo: null }),
  clearEditingMessage: ()    => set({ editingMessage: null }),

  // ─── search ──────────────────────────────────────────────────────────────

  searchMessages: async (query) => {
    set({ isSearching: true });
    try {
      const { data } = await axiosInstance.get(
        `/messages/search?q=${encodeURIComponent(query)}`
      );
      set({ searchResults: data.messages });
    } catch {
      set({ searchResults: [] });
    } finally {
      set({ isSearching: false });
    }
  },

  clearSearchResults: () => set({ searchResults: [], isSearching: false }),

  // ─── internal helpers ────────────────────────────────────────────────────

  _updatePreview: (userId, msg) => {
    set((s) => ({
      previews: {
        ...s.previews,
        [userId]: { ...(s.previews[userId] ?? {}), lastMessage: msg },
      },
    }));
  },
}));
