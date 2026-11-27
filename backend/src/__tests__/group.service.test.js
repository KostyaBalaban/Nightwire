import { jest, describe, test, expect, beforeEach } from "@jest/globals";

const MockGroup = {
  create: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
};

const MockMessage = { deleteMany: jest.fn() };
const mockUploadToVault = jest.fn();

jest.unstable_mockModule("../modules/groups/group.schema.js", () => ({
  Group: MockGroup,
}));
jest.unstable_mockModule("../modules/messaging/message.schema.js", () => ({
  Message: MockMessage,
}));
jest.unstable_mockModule("../vault/vault.js", () => ({
  uploadToVault: mockUploadToVault,
}));

const { createGroup, joinGroupByInvite, updateMemberRole } =
  await import("../modules/groups/group.service.js");

function mockQuery(value) {
  const q = {
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
  };
  q.then = (res, rej) => Promise.resolve(value).then(res, rej);
  return q;
}

const POPULATED_GROUP = {
  _id: "g1",
  name: "Dev Chat",
  ownerId: "owner1",
  members: [{ userId: { _id: "owner1", fullName: "Owner" }, role: "owner" }],
};

describe("createGroup", () => {
  beforeEach(() => jest.clearAllMocks());

  test("shouldCreateGroup — creates a group with the owner as first member and returns the populated document", async () => {
    MockGroup.create.mockResolvedValue({ _id: "g1" });
    MockGroup.findById.mockReturnValue(mockQuery(POPULATED_GROUP));

    const result = await createGroup({ name: "Dev Chat", ownerId: "owner1" });

    expect(MockGroup.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Dev Chat",
        ownerId: "owner1",
        members: [{ userId: "owner1", role: "owner" }],
      }),
    );
    expect(result).toEqual(POPULATED_GROUP);
  });
});

describe("joinGroupByInvite", () => {
  beforeEach(() => jest.clearAllMocks());

  test("shouldAddMemberByInvite — adds a new member and returns the populated group", async () => {
    const groupDoc = {
      _id: "g1",
      inviteCode: "abc12345",
      members: [],
      save: jest.fn().mockResolvedValue(true),
    };
    MockGroup.findOne.mockResolvedValue(groupDoc);
    MockGroup.findById.mockReturnValue(mockQuery(POPULATED_GROUP));

    const result = await joinGroupByInvite("abc12345", "newuser1");

    expect(groupDoc.members).toContainEqual(
      expect.objectContaining({ userId: "newuser1", role: "member" }),
    );
    expect(groupDoc.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual(POPULATED_GROUP);
  });

  test("shouldRejectInvalidInvite — throws 404 when the invite code is not found", async () => {
    MockGroup.findOne.mockResolvedValue(null);

    await expect(joinGroupByInvite("badcode", "user1")).rejects.toMatchObject({
      status: 404,
      message: "Invalid invite code",
    });
  });
});

describe("updateMemberRole", () => {
  beforeEach(() => jest.clearAllMocks());

  test("shouldRejectOwnerRole — a second owner cannot be created through role updates", async () => {
    MockGroup.findById.mockReturnValueOnce(
      mockQuery({
        _id: "g1",
        ownerId: "owner1",
        members: [
          { userId: "owner1", role: "owner" },
          { userId: "u2", role: "member" },
        ],
        save: jest.fn(),
      }),
    );

    await expect(updateMemberRole("g1", "owner1", "u2", "owner")).rejects.toMatchObject({
      status: 400,
    });
  });
});
