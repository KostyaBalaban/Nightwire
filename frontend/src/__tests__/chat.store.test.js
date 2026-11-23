import { vi, describe, test, expect, beforeEach } from "vitest";

vi.mock("../lib/axios.js", () => ({
  axiosInstance: {
    get:    vi.fn(),
    post:   vi.fn(),
    patch:  vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../lib/crypto.js", () => ({
  decryptMessage:      vi.fn(),
  loadPrivateKey:      vi.fn().mockReturnValue(null),
  cacheSentPlaintext:  vi.fn(),
  loadSentPlaintext:   vi.fn().mockReturnValue(null),
}));

vi.mock("../store/session.store.js", () => ({
  useSessionStore: {
    getState: () => ({ user: { _id: "user1" } }),
  },
}));

import { useChatStore } from "../store/chat.store.js";

const INITIAL = {
  messages:     [],
  activeUser:   null,
  unreadCounts: {},
  previews:     {},
  typingUsers:  new Set(),
};

beforeEach(() => {
  useChatStore.setState(INITIAL);
});

describe("receiveMessage", () => {
  test("shouldUpdateOnNewMessage — appends message when sender is the active conversation", () => {
    useChatStore.setState({ activeUser: { _id: "user2" }, messages: [] });

    const msg = { _id: "m1", senderId: "user2", text: "hi" };
    useChatStore.getState().receiveMessage(msg);

    const { messages, unreadCounts } = useChatStore.getState();
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual(msg);
    expect(unreadCounts["user2"]).toBeUndefined();
  });

  test("shouldUpdateOnNewMessage — increments unread count when sender is NOT the active conversation", () => {
    useChatStore.setState({ activeUser: null, unreadCounts: {} });

    const msg = { _id: "m1", senderId: "user2", text: "hi" };
    useChatStore.getState().receiveMessage(msg);

    expect(useChatStore.getState().unreadCounts["user2"]).toBe(1);
    expect(useChatStore.getState().messages).toHaveLength(0);
  });

  test("shouldUpdateOnNewMessage — accumulates unread count across multiple messages", () => {
    useChatStore.setState({ activeUser: null, unreadCounts: { user2: 2 } });

    useChatStore.getState().receiveMessage({ _id: "m2", senderId: "user2", text: "again" });

    expect(useChatStore.getState().unreadCounts["user2"]).toBe(3);
  });
});

describe("markAsRead", () => {
  test("shouldMarkMessagesAsRead — clears the unread count for the given user", () => {
    useChatStore.setState({ unreadCounts: { user2: 5, user3: 2 } });

    useChatStore.getState().markAsRead("user2");

    const { unreadCounts } = useChatStore.getState();
    expect(unreadCounts["user2"]).toBeUndefined();
    expect(unreadCounts["user3"]).toBe(2);
  });

  test("shouldMarkMessagesAsRead — marks all conversation messages as read via applyMessagesRead", () => {
    useChatStore.setState({
      messages: [
        { _id: "m1", senderId: "user1", receiverId: "user2", status: "sent" },
        { _id: "m2", senderId: "user1", receiverId: "user2", status: "delivered" },
        { _id: "m3", senderId: "user1", receiverId: "user2", status: "read" },
      ],
    });

    useChatStore.getState().applyMessagesRead({ senderId: "user2" });

    const { messages } = useChatStore.getState();
    expect(messages[0].status).toBe("read");
    expect(messages[1].status).toBe("read");
    expect(messages[2].status).toBe("read");
  });
});
