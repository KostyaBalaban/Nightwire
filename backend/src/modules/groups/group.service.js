import { randomUUID } from "crypto";
import { Group } from "./group.schema.js";
import { Message } from "../messaging/message.schema.js";
import { uploadToVault } from "../../vault/vault.js";

export async function createGroup({ name, description, avatar, ownerId }) {
  let avatarUrl = "";
  if (avatar) {
    const uploaded = await uploadToVault(avatar, {
      folder: "nightwire/groups",
      transformation: [{ width: 200, height: 200, crop: "fill" }],
    });
    avatarUrl = uploaded.secure_url;
  }

  const group = await Group.create({
    name,
    description: description || "",
    avatar: avatarUrl,
    ownerId,
    members: [{ userId: ownerId, role: "owner" }],
    inviteCode: randomUUID().slice(0, 8),
  });

  return Group.findById(group._id).populate("members.userId", MEMBER_FIELDS);
}

const MEMBER_FIELDS = "fullName profilePic bio email emailVerified createdAt isAdmin lastSeen";

export async function getGroupById(groupId) {
  return Group.findById(groupId)
    .populate("members.userId", MEMBER_FIELDS)
    .populate("ownerId", "fullName profilePic");
}

export async function getUserGroups(userId) {
  return Group.find({ "members.userId": userId })
    .populate("members.userId", MEMBER_FIELDS)
    .populate("ownerId", "fullName profilePic")
    .sort({ updatedAt: -1 });
}

export async function joinGroupByInvite(inviteCode, userId) {
  const group = await Group.findOne({ inviteCode });
  if (!group) throw { status: 404, message: "Invalid invite code" };

  const isMember = group.members.some((m) => String(m.userId) === String(userId));
  if (isMember) throw { status: 400, message: "Already a member" };

  group.members.push({ userId, role: "member" });
  await group.save();
  return Group.findById(group._id).populate("members.userId", MEMBER_FIELDS);
}

export async function leaveGroup(groupId, userId) {
  const group = await Group.findById(groupId);
  if (!group) throw { status: 404, message: "Group not found" };

  const idx = group.members.findIndex((m) => String(m.userId) === String(userId));
  if (idx === -1) throw { status: 400, message: "Not a member" };

  if (String(group.ownerId) === String(userId)) {
    const others = group.members.filter((m) => String(m.userId) !== String(userId));
    if (others.length === 0) {
      await Message.deleteMany({ groupId });
      await Group.findByIdAndDelete(groupId);
      return null;
    }
    const next = others[0];
    next.role = "owner";
    group.ownerId = next.userId;
  }

  group.members.splice(idx, 1);
  await group.save();
  return group;
}

export async function updateGroup(groupId, userId, updates) {
  const group = await Group.findById(groupId);
  if (!group) throw { status: 404, message: "Group not found" };

  const member = group.members.find((m) => String(m.userId) === String(userId));
  if (!member || !["owner", "admin"].includes(member.role))
    throw { status: 403, message: "Not authorized" };

  if (updates.name) group.name = updates.name;
  if (typeof updates.description !== "undefined") group.description = updates.description;
  if (updates.avatar) {
    const uploaded = await uploadToVault(updates.avatar, {
      folder: "nightwire/groups",
      transformation: [{ width: 200, height: 200, crop: "fill" }],
    });
    group.avatar = uploaded.secure_url;
  }

  await group.save();
  return Group.findById(group._id).populate("members.userId", MEMBER_FIELDS);
}

export async function deleteGroup(groupId, userId) {
  const group = await Group.findById(groupId);
  if (!group) throw { status: 404, message: "Group not found" };
  if (String(group.ownerId) !== String(userId))
    throw { status: 403, message: "Only owner can delete group" };

  await Message.deleteMany({ groupId });
  await Group.findByIdAndDelete(groupId);
}

export async function getGroupMessages(groupId, userId) {
  const group = await Group.findById(groupId);
  if (!group) throw { status: 404, message: "Group not found" };

  const isMember = group.members.some((m) => String(m.userId) === String(userId));
  if (!isMember) throw { status: 403, message: "Not a member" };

  return Message.find({ groupId })
    .populate("senderId", "fullName profilePic")
    .populate("replyTo", "text image senderId isEncrypted isDeletedForEveryone")
    .sort({ createdAt: 1 });
}

export async function sendGroupMessage({
  groupId,
  senderId,
  text,
  image,
  fileUrl,
  fileType,
  fileName,
  fileSize,
  replyTo,
  replyToSnippet,
}) {
  const group = await Group.findById(groupId);
  if (!group) throw { status: 404, message: "Group not found" };

  const isMember = group.members.some((m) => String(m.userId) === String(senderId));
  if (!isMember) throw { status: 403, message: "Not a member" };

  const msg = await Message.create({
    senderId,
    groupId,
    text: text || "",
    image: image || "",
    fileUrl: fileUrl || "",
    fileType: fileType || "image",
    fileName: fileName || "",
    fileSize: fileSize || 0,
    replyTo: replyTo || null,
    replyToSnippet: replyToSnippet || "",
  });

  return Message.findById(msg._id)
    .populate("senderId", "fullName profilePic")
    .populate("replyTo", "text image senderId isEncrypted isDeletedForEveryone");
}

export async function createSystemMessage(groupId, senderId, text) {
  try {
    const exists = await Group.findById(groupId).select("_id");
    if (!exists) return null;
    const msg = await Message.create({ senderId, groupId, text, isSystem: true });
    return Message.findById(msg._id).populate("senderId", "fullName profilePic");
  } catch {
    return null;
  }
}

export async function updateMemberRole(groupId, ownerId, targetUserId, newRole) {
  const group = await Group.findById(groupId);
  if (!group) throw { status: 404, message: "Group not found" };
  if (String(group.ownerId) !== String(ownerId))
    throw { status: 403, message: "Only owner can update roles" };
  if (String(targetUserId) === String(ownerId))
    throw { status: 400, message: "Cannot change owner role" };
  if (!["admin", "member"].includes(newRole))
    throw { status: 400, message: "Role must be admin or member" };

  const member = group.members.find((m) => String(m.userId) === String(targetUserId));
  if (!member) throw { status: 404, message: "Member not found" };

  member.role = newRole;
  await group.save();
  return Group.findById(group._id).populate("members.userId", MEMBER_FIELDS);
}

export async function kickMember(groupId, adminId, targetUserId) {
  const group = await Group.findById(groupId);
  if (!group) throw { status: 404, message: "Group not found" };

  const admin = group.members.find((m) => String(m.userId) === String(adminId));
  if (!admin || !["owner", "admin"].includes(admin.role))
    throw { status: 403, message: "Not authorized" };
  if (String(targetUserId) === String(group.ownerId))
    throw { status: 400, message: "Cannot kick owner" };

  group.members = group.members.filter((m) => String(m.userId) !== String(targetUserId));
  await group.save();
  return Group.findById(group._id).populate("members.userId", MEMBER_FIELDS);
}
