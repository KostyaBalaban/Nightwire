import mongoose from "mongoose";
import { Message } from "./message.schema.js";
import { User } from "../auth/user.schema.js";
import { uploadToVault, uploadFileToVault } from "../../vault/vault.js";

export async function getAllUsers(currentUserId) {
  return User.find({ _id: { $ne: currentUserId } }).select("-password");
}

export async function getConversation(userId, partnerId) {
  return Message.find({
    $or: [
      { senderId: userId, receiverId: partnerId },
      { senderId: partnerId, receiverId: userId },
    ],
  })
    .populate("replyTo", "text image senderId isEncrypted isDeletedForEveryone")
    .sort({ createdAt: 1 });
}

export async function createMessage({
  senderId,
  receiverId,
  text,
  image,
  fileData,
  fileType,
  fileName,
  fileSize,
  replyTo,
  replyToSnippet,
  isEncrypted,
}) {
  let imageUrl = "";
  let fileUrl = "";

  if (image) {
    const uploaded = await uploadToVault(image, { folder: "nightwire/messages" });
    imageUrl = uploaded.secure_url;
  } else if (fileData) {
    const uploaded = await uploadFileToVault(fileData, fileType || "document", {
      folder: "nightwire/files",
    });
    fileUrl = uploaded.secure_url;
  }

  const msg = await Message.create({
    senderId,
    receiverId,
    text: text || "",
    image: imageUrl,
    fileUrl,
    fileType: fileType || "image",
    fileName: fileName || "",
    fileSize: fileSize || 0,
    isEncrypted: isEncrypted || false,
    replyTo: replyTo || null,
    replyToSnippet: replyToSnippet || "",
  });

  return msg.populate("replyTo", "text image senderId isEncrypted isDeletedForEveryone");
}

export async function editMessage(messageId, userId, newText) {
  const msg = await Message.findById(messageId);
  if (!msg) throw { status: 404, message: "Message not found" };
  if (String(msg.senderId) !== String(userId)) throw { status: 403, message: "Not your message" };
  if (msg.isDeletedForEveryone) throw { status: 400, message: "Cannot edit deleted message" };

  msg.text = newText;
  msg.isEdited = true;
  msg.editedAt = new Date();
  await msg.save();
  return msg.populate("replyTo", "text image senderId isEncrypted isDeletedForEveryone");
}

export async function deleteMessage(messageId, userId, forEveryone) {
  const msg = await Message.findById(messageId);
  if (!msg) throw { status: 404, message: "Message not found" };

  if (forEveryone) {
    if (String(msg.senderId) !== String(userId))
      throw { status: 403, message: "Only sender can delete for everyone" };
    msg.isDeletedForEveryone = true;
    msg.text = "";
    msg.image = "";
    await msg.save();
  } else {
    const uid = new mongoose.Types.ObjectId(String(userId));
    if (!msg.deletedFor.some((id) => String(id) === String(userId))) {
      msg.deletedFor.push(uid);
      await msg.save();
    }
  }
  return msg;
}

export async function searchMessages(userId, query) {
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return Message.find({
    $or: [{ senderId: userId }, { receiverId: userId }],
    text: { $regex: escaped, $options: "i" },
    isDeletedForEveryone: { $ne: true },
  })
    .populate("senderId", "fullName profilePic")
    .populate("receiverId", "fullName profilePic")
    .sort({ createdAt: -1 })
    .limit(50);
}

export async function toggleReaction(messageId, userId, emoji) {
  const msg = await Message.findById(messageId);
  if (!msg) throw { status: 404, message: "Message not found" };

  const idx = msg.reactions.findIndex((r) => String(r.userId) === String(userId));
  if (idx !== -1) {
    if (msg.reactions[idx].emoji === emoji) {
      msg.reactions.splice(idx, 1); // toggle off
    } else {
      msg.reactions[idx].emoji = emoji; // switch emoji
    }
  } else {
    msg.reactions.push({ userId, emoji });
  }

  await msg.save();
  return msg.populate("replyTo", "text image senderId isEncrypted isDeletedForEveryone");
}

export async function clearChat(userId, partnerId) {
  await Message.deleteMany({
    $or: [
      { senderId: userId, receiverId: partnerId },
      { senderId: partnerId, receiverId: userId },
    ],
  });
}

// Returns last message per conversation partner, sorted by recency
export async function getConversationPreviews(userId) {
  const uid = new mongoose.Types.ObjectId(String(userId));
  return Message.aggregate([
    {
      $match: {
        $or: [{ senderId: uid }, { receiverId: uid }],
      },
    },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: {
          $cond: [{ $eq: ["$senderId", uid] }, "$receiverId", "$senderId"],
        },
        lastMessage: { $first: "$$ROOT" },
        unread: {
          $sum: {
            $cond: [
              {
                $and: [{ $eq: ["$receiverId", uid] }, { $ne: ["$status", "read"] }],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    { $sort: { "lastMessage.createdAt": -1 } },
  ]);
}
