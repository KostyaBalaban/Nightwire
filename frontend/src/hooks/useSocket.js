import { useEffect } from "react";
import { socket } from "../lib/socket.js";
import { useChatStore, decryptForDisplay } from "../store/chat.store.js";
import { useSessionStore } from "../store/session.store.js";
import { useGroupStore } from "../store/group.store.js";
import { useSound } from "./useSound.js";

export function useSocket() {
  const user = useSessionStore((s) => s.user);
  const activeUser = useChatStore((s) => s.activeUser);
  const {
    receiveMessage,
    setOnlineUsers,
    setTyping,
    applyMessageEdit,
    applyMessageDelete,
    applyMessagesRead,
    applyReaction,
    markAsRead,
  } = useChatStore();
  const { playPing } = useSound();

  // Mark incoming messages as read when active conversation changes
  useEffect(() => {
    if (!activeUser || !socket.connected) return;
    socket.emit("messages:markAsRead", { senderId: activeUser._id });
    markAsRead(String(activeUser._id));
  }, [activeUser?._id]);

  useEffect(() => {
    if (!user) return;

    // The server identifies the user from the httpOnly session cookie.
    socket.connect();

    const onOnlineUsers = (ids) => setOnlineUsers(ids);

    const onNewMessage = async (incoming) => {
      const msg = await decryptForDisplay(incoming);
      receiveMessage(msg);

      const currentActive = useChatStore.getState().activeUser;
      const fromActive = currentActive && String(msg.senderId) === String(currentActive._id);

      if (fromActive) {
        socket.emit("messages:markAsRead", { senderId: msg.senderId });
      } else {
        playPing();
        if (document.hidden && Notification.permission === "granted") {
          const users = useChatStore.getState().users;
          const sender = users.find((u) => String(u._id) === String(msg.senderId));
          new Notification(sender?.fullName ?? "New message", {
            body: msg.text || "📎 Attachment",
            icon: "/favicon.svg",
          });
        }
      }
    };

    const onTypingStart = ({ senderId }) => setTyping(senderId, true);
    const onTypingStop = ({ senderId }) => setTyping(senderId, false);
    const onMsgsRead = (data) => applyMessagesRead(data);
    const onMsgEdit = async ({ message }) => applyMessageEdit(await decryptForDisplay(message));
    const onMsgDelete = (data) => applyMessageDelete(data);
    const onMsgReaction = (data) => applyReaction(data);

    // Group events
    const onGroupMsg = (msg) => useGroupStore.getState().receiveMessage(msg);
    const onGroupUpdated = ({ group }) => useGroupStore.getState().applyGroupUpdate(group);
    const onGroupMemberJoined = ({ group }) => {
      if (group) useGroupStore.getState().applyMemberJoined(group);
    };
    const onGroupTypingStart = ({ senderId, groupId }) => {
      const ag = useGroupStore.getState().activeGroup;
      if (ag && String(ag._id) === String(groupId))
        useGroupStore.getState().setTyping(senderId, true);
    };
    const onGroupTypingStop = ({ senderId, groupId }) => {
      const ag = useGroupStore.getState().activeGroup;
      if (ag && String(ag._id) === String(groupId))
        useGroupStore.getState().setTyping(senderId, false);
    };
    const onGroupKicked = ({ groupId }) => {
      useGroupStore.getState().removeGroup(groupId);
    };

    socket.on("getOnlineUsers", onOnlineUsers);
    socket.on("newMessage", onNewMessage);
    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop", onTypingStop);
    socket.on("messages:read", onMsgsRead);
    socket.on("message:edit", onMsgEdit);
    socket.on("message:delete", onMsgDelete);
    socket.on("message:reaction", onMsgReaction);
    socket.on("group:newMessage", onGroupMsg);
    socket.on("group:updated", onGroupUpdated);
    socket.on("group:memberJoined", onGroupMemberJoined);
    socket.on("group:typing:start", onGroupTypingStart);
    socket.on("group:typing:stop", onGroupTypingStop);
    socket.on("group:kicked", onGroupKicked);

    return () => {
      socket.off("getOnlineUsers", onOnlineUsers);
      socket.off("newMessage", onNewMessage);
      socket.off("typing:start", onTypingStart);
      socket.off("typing:stop", onTypingStop);
      socket.off("messages:read", onMsgsRead);
      socket.off("message:edit", onMsgEdit);
      socket.off("message:delete", onMsgDelete);
      socket.off("message:reaction", onMsgReaction);
      socket.off("group:newMessage", onGroupMsg);
      socket.off("group:updated", onGroupUpdated);
      socket.off("group:memberJoined", onGroupMemberJoined);
      socket.off("group:typing:start", onGroupTypingStart);
      socket.off("group:typing:stop", onGroupTypingStop);
      socket.off("group:kicked", onGroupKicked);
      socket.disconnect();
    };
  }, [user?._id]);
}
