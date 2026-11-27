import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import {
  decryptMessage,
  encryptMessage,
  loadPrivateKey,
  cacheSentPlaintext,
  loadSentPlaintext,
} from "../lib/crypto.js";
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

function currentUserId() {
  return String(useSessionStore.getState().user?._id ?? "");
}

// Own sent messages were encrypted with the recipient's key, so we can't decrypt
// them — their plaintext comes from the local cache filled when they were sent.
// Messages received from someone else are decrypted with our private key.
async function plaintextFor(m, privKey, myId) {
  const senderId = String(m.senderId?._id ?? m.senderId ?? "");
  if (senderId === myId) return loadSentPlaintext(m._id) ?? ENCRYPTED_PLACEHOLDER;
  return tryDecrypt(m.text, privKey);
}

// Returns a copy of a message with its text (and quoted message text) readable.
export async function decryptForDisplay(m, privKey = loadPrivateKey(), myId = currentUserId()) {
  let result = m;
  if (m.isEncrypted && m.text) {
    result = { ...result, text: await plaintextFor(m, privKey, myId) };
  }
  if (m.replyTo?.isEncrypted && m.replyTo?.text) {
    result = {
      ...result,
      replyTo: { ...m.replyTo, text: await plaintextFor(m.replyTo, privKey, myId) },
    };
  }
  return result;
}

async function decryptMessages(messages) {
  const privKey = loadPrivateKey();
  const myId = currentUserId();
  return Promise.all(messages.map((m) => decryptForDisplay(m, privKey, myId)));
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

      await Promise.all(
        data.previews.map(async (p) => {
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
        }),
      );

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
    set({
      activeUser: user,
      messages: [],
      isLoadingMessages: true,
      replyTo: null,
      editingMessage: null,
    });
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
    // Attach a plain-text snippet of the quoted message so the recipient can display it.
    // Never for encrypted messages: the snippet is stored on the server in plain text.
    // The recipient resolves encrypted quotes locally from the populated replyTo instead.
    if (replyTo?.text && !replyTo.isEncrypted) serverPayload.replyToSnippet = replyTo.text;
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
    const { activeUser, messages } = get();
    const original = messages.find((m) => String(m._id) === String(messageId));

    // An edit of an encrypted message must be encrypted too, otherwise the new
    // text would reach the server in plain text.
    let serverText = text;
    if (original?.isEncrypted) {
      if (!activeUser?.publicKey) throw new Error("Recipient has no public key");
      serverText = await encryptMessage(text, activeUser.publicKey);
    }

    const { data } = await axiosInstance.patch(`/messages/${messageId}`, { text: serverText });
    if (original?.isEncrypted) cacheSentPlaintext(messageId, text);

    set((s) => ({
      messages: s.messages.map((m) =>
        String(m._id) === String(messageId)
          ? { ...m, text, isEdited: data.message.isEdited, editedAt: data.message.editedAt }
          : m,
      ),
      editingMessage: null,
    }));
  },

  deleteMessage: async (messageId, forEveryone) => {
    const { data } = await axiosInstance.delete(
      `/messages/${messageId}?forEveryone=${forEveryone}`,
    );
    set((s) => ({
      messages: s.messages.map((m) => (String(m._id) === String(messageId) ? data.message : m)),
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
    const isActiveConvo = activeUser && String(activeUser._id) === fromId;

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

  // updatedMsg.text must already be decrypted (see useSocket). Only the edited
  // fields are applied so the already-decrypted reply quote is kept.
  applyMessageEdit: (updatedMsg) => {
    set((s) => ({
      messages: s.messages.map((m) =>
        String(m._id) === String(updatedMsg._id)
          ? {
              ...m,
              text: updatedMsg.text,
              isEdited: updatedMsg.isEdited,
              editedAt: updatedMsg.editedAt,
            }
          : m,
      ),
    }));
  },

  applyMessageDelete: ({ messageId, isDeletedForEveryone }) => {
    if (!isDeletedForEveryone) return;
    set((s) => ({
      messages: s.messages.map((m) =>
        String(m._id) === String(messageId)
          ? { ...m, isDeletedForEveryone: true, text: "", image: "" }
          : m,
      ),
    }));
  },

  applyMessagesRead: ({ senderId }) => {
    set((s) => ({
      messages: s.messages.map((m) =>
        String(m.receiverId) === String(senderId) && m.status !== "read"
          ? { ...m, status: "read" }
          : m,
      ),
    }));
  },

  applyReaction: ({ messageId, reactions }) => {
    set((s) => ({
      messages: s.messages.map((m) =>
        String(m._id) === String(messageId) ? { ...m, reactions } : m,
      ),
    }));
  },

  toggleReaction: async (messageId, emoji) => {
    const { data } = await axiosInstance.post(`/messages/${messageId}/react`, { emoji });
    // only update reactions — replacing the whole message would overwrite decrypted text
    set((s) => ({
      messages: s.messages.map((m) =>
        String(m._id) === String(messageId) ? { ...m, reactions: data.message.reactions } : m,
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

  setReplyTo: (msg) => set({ replyTo: msg }),
  clearReplyTo: () => set({ replyTo: null }),
  setEditingMessage: (msg) => set({ editingMessage: msg, replyTo: null }),
  clearEditingMessage: () => set({ editingMessage: null }),

  // ─── search ──────────────────────────────────────────────────────────────

  searchMessages: async (query) => {
    set({ isSearching: true });
    try {
      const { data } = await axiosInstance.get(`/messages/search?q=${encodeURIComponent(query)}`);
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
