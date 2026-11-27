import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";

export const useGroupStore = create((set, get) => ({
  groups: [],
  activeGroup: null,
  messages: [],
  isLoading: false,
  isLoadingMsgs: false,
  typingUsers: new Set(),

  fetchGroups: async () => {
    set({ isLoading: true });
    try {
      const { data } = await axiosInstance.get("/groups");
      set({ groups: data.groups });
    } catch {
      /* silent */
    } finally {
      set({ isLoading: false });
    }
  },

  createGroup: async (payload) => {
    const { data } = await axiosInstance.post("/groups", payload);
    set((s) => ({ groups: [data.group, ...s.groups] }));
    return data.group;
  },

  joinGroup: async (inviteCode) => {
    const { data } = await axiosInstance.post("/groups/join", { inviteCode });
    set((s) => ({ groups: [data.group, ...s.groups] }));
    return data.group;
  },

  setActiveGroup: async (group) => {
    set({ activeGroup: group, messages: [], isLoadingMsgs: true });
    try {
      const [msgsRes, groupRes] = await Promise.all([
        axiosInstance.get(`/groups/${group._id}/messages`),
        axiosInstance.get(`/groups/${group._id}`),
      ]);
      set({ messages: msgsRes.data.messages, activeGroup: groupRes.data.group });
    } finally {
      set({ isLoadingMsgs: false });
    }
  },

  clearActiveGroup: () => set({ activeGroup: null, messages: [] }),

  sendMessage: async (payload) => {
    const { activeGroup } = get();
    // Don't add locally — server broadcasts group:newMessage back to sender via socket room
    await axiosInstance.post(`/groups/${activeGroup._id}/messages`, payload);
  },

  receiveMessage: (msg) => {
    const { activeGroup, messages } = get();
    if (!activeGroup || String(msg.groupId) !== String(activeGroup._id)) return;
    // skip if already added locally after API send
    if (messages.some((m) => String(m._id) === String(msg._id))) return;
    set((s) => ({ messages: [...s.messages, msg] }));
  },

  leaveGroup: async (groupId) => {
    await axiosInstance.post(`/groups/${groupId}/leave`);
    set((s) => ({
      groups: s.groups.filter((g) => String(g._id) !== String(groupId)),
      activeGroup:
        s.activeGroup && String(s.activeGroup._id) === String(groupId) ? null : s.activeGroup,
      messages: s.activeGroup && String(s.activeGroup._id) === String(groupId) ? [] : s.messages,
    }));
  },

  updateGroup: async (groupId, updates) => {
    const { data } = await axiosInstance.put(`/groups/${groupId}`, updates);
    set((s) => ({
      groups: s.groups.map((g) => (String(g._id) === String(groupId) ? data.group : g)),
      activeGroup:
        s.activeGroup && String(s.activeGroup._id) === String(groupId) ? data.group : s.activeGroup,
    }));
    return data.group;
  },

  kickMember: async (groupId, userId) => {
    const { data } = await axiosInstance.delete(`/groups/${groupId}/members/${userId}`);
    set((s) => ({
      groups: s.groups.map((g) => (String(g._id) === String(groupId) ? data.group : g)),
      activeGroup:
        s.activeGroup && String(s.activeGroup._id) === String(groupId) ? data.group : s.activeGroup,
    }));
    return data.group;
  },

  toggleReaction: async (messageId, emoji) => {
    const { data } = await axiosInstance.post(`/messages/${messageId}/react`, { emoji });
    set((s) => ({
      messages: s.messages.map((m) =>
        String(m._id) === String(messageId) ? { ...m, reactions: data.message.reactions } : m,
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

  removeGroup: (groupId) => {
    set((s) => ({
      groups: s.groups.filter((g) => String(g._id) !== String(groupId)),
      activeGroup:
        s.activeGroup && String(s.activeGroup._id) === String(groupId) ? null : s.activeGroup,
      messages: s.activeGroup && String(s.activeGroup._id) === String(groupId) ? [] : s.messages,
    }));
  },

  applyGroupUpdate: (updatedGroup) => {
    set((s) => ({
      groups: s.groups.map((g) => (String(g._id) === String(updatedGroup._id) ? updatedGroup : g)),
      activeGroup:
        s.activeGroup && String(s.activeGroup._id) === String(updatedGroup._id)
          ? updatedGroup
          : s.activeGroup,
    }));
  },

  applyMemberJoined: (updatedGroup) => {
    set((s) => ({
      groups: s.groups.map((g) => (String(g._id) === String(updatedGroup._id) ? updatedGroup : g)),
      activeGroup:
        s.activeGroup && String(s.activeGroup._id) === String(updatedGroup._id)
          ? updatedGroup
          : s.activeGroup,
    }));
  },

  setTyping: (userId, active) => {
    set((s) => {
      const next = new Set(s.typingUsers);
      active ? next.add(String(userId)) : next.delete(String(userId));
      return { typingUsers: next };
    });
  },
}));
