import { ok, fail } from "../../helpers/response.js";
import { getIO, getSocketId, joinGroupRoom, leaveGroupRoom } from "../../core/socket.js";
import { uploadFileToVault } from "../../vault/vault.js";
import {
  createGroup,
  getGroupById,
  getUserGroups,
  joinGroupByInvite,
  leaveGroup,
  updateGroup,
  deleteGroup,
  getGroupMessages,
  sendGroupMessage,
  updateMemberRole,
  kickMember,
  createSystemMessage,
} from "./group.service.js";

export async function createGroupHandler(req, res) {
  try {
    const { name, description, avatar } = req.body;
    if (!name?.trim()) return fail(res, "Group name is required", 400);

    const group = await createGroup({ name: name.trim(), description, avatar, ownerId: req.user._id });
    joinGroupRoom(String(req.user._id), group._id);
    return ok(res, { group }, 201);
  } catch (err) {
    return fail(res, err.message, err.status || 500);
  }
}

export async function getGroupHandler(req, res) {
  try {
    const group = await getGroupById(req.params.id);
    if (!group) return fail(res, "Group not found", 404);
    return ok(res, { group });
  } catch (err) {
    return fail(res, err.message, err.status || 500);
  }
}

export async function getUserGroupsHandler(req, res) {
  try {
    const groups = await getUserGroups(req.user._id);
    return ok(res, { groups });
  } catch (err) {
    return fail(res, err.message);
  }
}

export async function joinGroupHandler(req, res) {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) return fail(res, "Invite code is required", 400);

    const group = await joinGroupByInvite(inviteCode, req.user._id);

    // Add joiner to socket room immediately (before broadcast)
    joinGroupRoom(String(req.user._id), group._id);

    // System message: broadcast to everyone including the new joiner
    const sysMsg = await createSystemMessage(group._id, req.user._id, "joined the group");
    if (sysMsg) getIO().to(`group:${group._id}`).emit("group:newMessage", sysMsg);

    getIO().to(`group:${group._id}`).emit("group:memberJoined", { groupId: group._id, group });

    return ok(res, { group });
  } catch (err) {
    return fail(res, err.message, err.status || 500);
  }
}

export async function leaveGroupHandler(req, res) {
  try {
    // System message before leave (group may be deleted if owner leaves alone)
    const sysMsg = await createSystemMessage(req.params.id, req.user._id, "left the group");
    await leaveGroup(req.params.id, req.user._id);
    leaveGroupRoom(String(req.user._id), req.params.id);
    if (sysMsg) getIO().to(`group:${req.params.id}`).emit("group:newMessage", sysMsg);
    return ok(res, { left: true });
  } catch (err) {
    return fail(res, err.message, err.status || 500);
  }
}

export async function updateGroupHandler(req, res) {
  try {
    const group = await updateGroup(req.params.id, req.user._id, req.body);
    // Broadcast updated group to all room members so their UI refreshes
    getIO().to(`group:${req.params.id}`).emit("group:updated", { group });
    return ok(res, { group });
  } catch (err) {
    return fail(res, err.message, err.status || 500);
  }
}

export async function deleteGroupHandler(req, res) {
  try {
    await deleteGroup(req.params.id, req.user._id);
    return ok(res, { deleted: true });
  } catch (err) {
    return fail(res, err.message, err.status || 500);
  }
}

export async function getGroupMessagesHandler(req, res) {
  try {
    const messages = await getGroupMessages(req.params.id, req.user._id);
    return ok(res, { messages });
  } catch (err) {
    return fail(res, err.message, err.status || 500);
  }
}

export async function sendGroupMessageHandler(req, res) {
  try {
    const { text, image, fileData, fileType, fileName, fileSize, replyTo, replyToSnippet } = req.body;
    const groupId = req.params.id;

    let resolvedFileUrl = "";
    let resolvedImage = image || "";

    if (fileData && fileType && fileType !== "image") {
      const uploaded = await uploadFileToVault(fileData, fileType, { folder: "nightwire/files" });
      resolvedFileUrl = uploaded.secure_url;
    } else if (fileData && fileType === "image") {
      const { uploadToVault } = await import("../../vault/vault.js");
      const uploaded = await uploadToVault(fileData, { folder: "nightwire/messages" });
      resolvedImage = uploaded.secure_url;
    }

    const msg = await sendGroupMessage({
      groupId,
      senderId: req.user._id,
      text,
      image: resolvedImage,
      fileUrl: resolvedFileUrl,
      fileType,
      fileName,
      fileSize,
      replyTo,
      replyToSnippet,
    });

    // Broadcast to all group members via socket
    getIO().to(`group:${groupId}`).emit("group:newMessage", msg);

    return ok(res, { message: msg }, 201);
  } catch (err) {
    return fail(res, err.message, err.status || 500);
  }
}

export async function updateMemberRoleHandler(req, res) {
  try {
    const { targetUserId, role } = req.body;
    const group = await updateMemberRole(req.params.id, req.user._id, targetUserId, role);
    return ok(res, { group });
  } catch (err) {
    return fail(res, err.message, err.status || 500);
  }
}

export async function kickMemberHandler(req, res) {
  try {
    const group = await kickMember(req.params.id, req.user._id, req.params.userId);

    // System message before removing from room so the kicked user sees it too
    const sysMsg = await createSystemMessage(req.params.id, req.params.userId, "was removed from the group");
    if (sysMsg) getIO().to(`group:${req.params.id}`).emit("group:newMessage", sysMsg);

    // Remove kicked user from socket room and notify them
    leaveGroupRoom(String(req.params.userId), req.params.id);
    const sid = getSocketId(String(req.params.userId));
    if (sid) getIO().to(sid).emit("group:kicked", { groupId: req.params.id });

    // Broadcast updated member list to remaining members
    getIO().to(`group:${req.params.id}`).emit("group:updated", { group });

    return ok(res, { group });
  } catch (err) {
    return fail(res, err.message, err.status || 500);
  }
}
