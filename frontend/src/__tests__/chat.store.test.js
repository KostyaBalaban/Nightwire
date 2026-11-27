import { vi, describe, test, expect, beforeEach } from "vitest";

vi.mock("../lib/axios.js", () => ({
  axiosInstance: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../lib/crypto.js", () => ({
  decryptMessage: vi.fn(),
  encryptMessage: vi.fn().mockResolvedValue("CIPHERTEXT"),
  loadPrivateKey: vi.fn().mockReturnValue(null),
  cacheSentPlaintext: vi.fn(),
  loadSentPlaintext: vi.fn().mockReturnValue(null),
}));

vi.mock("../store/session.store.js", () => ({
  useSessionStore: {
    getState: () => ({ user: { _id: "user1" } }),
  },
}));

import { useChatStore, decryptForDisplay } from "../store/chat.store.js";
import { axiosInstance } from "../lib/axios.js";
import { encryptMessage, cacheSentPlaintext, loadSentPlaintext } from "../lib/crypto.js";

const INITIAL = {
  messages: [],
  activeUser: null,
  unreadCounts: {},
  previews: {},
  typingUsers: new Set(),
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

describe("E2E: no plaintext leaks to the server", () => {
  test("editMessage — encrypts the new text when the original message was encrypted", async () => {
    useChatStore.setState({
      activeUser: { _id: "user2", publicKey: "PUB" },
      messages: [{ _id: "m1", senderId: "user1", text: "old", isEncrypted: true }],
    });
    axiosInstance.patch.mockResolvedValueOnce({
      data: { message: { _id: "m1", isEdited: true, editedAt: "t" } },
    });

    await useChatStore.getState().editMessage("m1", "new secret");

    expect(encryptMessage).toHaveBeenCalledWith("new secret", "PUB");
    expect(axiosInstance.patch).toHaveBeenCalledWith("/messages/m1", { text: "CIPHERTEXT" });
    expect(cacheSentPlaintext).toHaveBeenCalledWith("m1", "new secret");
    expect(useChatStore.getState().messages[0].text).toBe("new secret");
  });

  test("editMessage — keeps plain text for messages that were not encrypted", async () => {
    encryptMessage.mockClear();
    useChatStore.setState({
      activeUser: { _id: "user2", publicKey: "PUB" },
      messages: [{ _id: "m2", senderId: "user1", text: "old", isEncrypted: false }],
    });
    axiosInstance.patch.mockResolvedValueOnce({ data: { message: { _id: "m2", isEdited: true } } });

    await useChatStore.getState().editMessage("m2", "plain");

    expect(encryptMessage).not.toHaveBeenCalled();
    expect(axiosInstance.patch).toHaveBeenCalledWith("/messages/m2", { text: "plain" });
  });

  test("sendMessage — does not send a plain-text snippet when quoting an encrypted message", async () => {
    useChatStore.setState({
      activeUser: { _id: "user2" },
      messages: [],
      replyTo: { _id: "q1", text: "quoted secret", isEncrypted: true },
    });
    axiosInstance.post.mockResolvedValueOnce({
      data: { message: { _id: "m3", isEncrypted: true, replyTo: { _id: "q1" } } },
    });

    await useChatStore
      .getState()
      .sendMessage({ text: "CIPHERTEXT", isEncrypted: true, _localText: "reply" });

    const body = axiosInstance.post.mock.calls.at(-1)[1];
    expect(body.replyToSnippet).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain("quoted secret");
  });

  test("decryptForDisplay — resolves a quote of my own encrypted message from the local cache", async () => {
    loadSentPlaintext.mockReturnValueOnce("my original text");
    const msg = {
      _id: "m4",
      senderId: "user2",
      text: "",
      isEncrypted: false,
      replyTo: { _id: "q2", senderId: "user1", text: "CIPHERTEXT", isEncrypted: true },
    };

    const result = await decryptForDisplay(msg, null, "user1");

    expect(loadSentPlaintext).toHaveBeenCalledWith("q2");
    expect(result.replyTo.text).toBe("my original text");
  });
});
