import { jest, describe, test, expect, beforeEach } from "@jest/globals";

const MockMessage = {
  create: jest.fn(),
  findById: jest.fn(),
};

const mockUploadToVault = jest.fn();
const mockUploadFileToVault = jest.fn();

jest.unstable_mockModule("../modules/messaging/message.schema.js", () => ({
  Message: MockMessage,
}));
jest.unstable_mockModule("../modules/auth/user.schema.js", () => ({ User: {} }));
jest.unstable_mockModule("../vault/vault.js", () => ({
  uploadToVault: mockUploadToVault,
  uploadFileToVault: mockUploadFileToVault,
}));

const { createMessage, editMessage, toggleReaction } =
  await import("../modules/messaging/message.service.js");

function makeMsg(senderId, extraFields = {}) {
  return {
    _id: "m1",
    senderId,
    text: "original",
    isDeletedForEveryone: false,
    isEdited: false,
    reactions: [],
    save: jest.fn().mockResolvedValue(true),
    populate: jest.fn().mockResolvedValue({ _id: "m1", ...extraFields }),
    ...extraFields,
  };
}

describe("createMessage", () => {
  beforeEach(() => jest.clearAllMocks());

  test("shouldCreateMessage — saves the document with correct fields and returns it", async () => {
    const expected = { _id: "m1", senderId: "u1", receiverId: "u2", text: "hello" };
    const raw = { populate: jest.fn().mockResolvedValue(expected) };
    MockMessage.create.mockResolvedValue(raw);

    const result = await createMessage({ senderId: "u1", receiverId: "u2", text: "hello" });

    expect(MockMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({ senderId: "u1", receiverId: "u2", text: "hello" }),
    );
    expect(result).toEqual(expected);
  });
});

describe("editMessage", () => {
  beforeEach(() => jest.clearAllMocks());

  test("shouldEditMessage — owner can update message text", async () => {
    const msg = makeMsg("user1");
    MockMessage.findById.mockResolvedValue(msg);

    await editMessage("m1", "user1", "updated text");

    expect(msg.text).toBe("updated text");
    expect(msg.isEdited).toBe(true);
    expect(msg.save).toHaveBeenCalledTimes(1);
  });

  test("shouldRejectMessageEditByOtherUser — throws 403 when senderId does not match userId", async () => {
    MockMessage.findById.mockResolvedValue(makeMsg("user1"));

    await expect(editMessage("m1", "user2", "hacked")).rejects.toMatchObject({
      status: 403,
      message: "Not your message",
    });
  });
});

describe("toggleReaction", () => {
  beforeEach(() => jest.clearAllMocks());

  test("shouldAddReaction — pushes a new reaction when the user has none", async () => {
    const msg = makeMsg("user1");
    MockMessage.findById.mockResolvedValue(msg);

    await toggleReaction("m1", "user1", "👍");

    expect(msg.reactions).toEqual([{ userId: "user1", emoji: "👍" }]);
    expect(msg.save).toHaveBeenCalledTimes(1);
  });

  test("shouldToggleReaction — removes the reaction when the same emoji is sent again", async () => {
    const msg = {
      ...makeMsg("user1"),
      reactions: [{ userId: "user1", emoji: "👍" }],
    };
    MockMessage.findById.mockResolvedValue(msg);

    await toggleReaction("m1", "user1", "👍");

    expect(msg.reactions).toHaveLength(0);
    expect(msg.save).toHaveBeenCalledTimes(1);
  });
});
