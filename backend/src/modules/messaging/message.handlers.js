import { ok, fail } from "../../helpers/response.js";
import {
  getAllUsers,
  getConversation,
  createMessage,
  editMessage,
  deleteMessage,
  searchMessages,
  clearChat,
  getConversationPreviews,
  toggleReaction,
} from "./message.service.js";
import { getIO, getSocketId } from "../../core/socket.js";

export async function listUsers(req, res) {
  try {
    const users = await getAllUsers(req.user._id);
    return ok(res, { users });
  } catch (err) {
    return fail(res, err.message);
  }
}

export async function getPreviews(req, res) {
  try {
    const previews = await getConversationPreviews(req.user._id);
    return ok(res, { previews });
  } catch (err) {
    return fail(res, err.message);
  }
}

export async function getHistory(req, res) {
  try {
    const messages = await getConversation(req.user._id, req.params.id);
    return ok(res, { messages });
  } catch (err) {
    return fail(res, err.message);
  }
}

export async function sendMessage(req, res) {
  try {
    const { text, image, fileData, fileType, fileName, fileSize, replyTo, replyToSnippet, isEncrypted } = req.body;
    const receiverId = req.params.id;

    const msg = await createMessage({
      senderId: req.user._id,
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
    });

    const receiverSocketId = getSocketId(String(receiverId));
    if (receiverSocketId) {
      getIO().to(receiverSocketId).emit("newMessage", msg);
    }

    return ok(res, { message: msg }, 201);
  } catch (err) {
    return fail(res, err.message);
  }
}

export async function editMsg(req, res) {
  try {
    const { text } = req.body;
    if (!text?.trim()) return fail(res, "Text is required", 400);

    const msg = await editMessage(req.params.id, req.user._id, text.trim());

    // Notify receiver in real-time
    const receiverSocketId = getSocketId(String(msg.receiverId));
    if (receiverSocketId) {
      getIO().to(receiverSocketId).emit("message:edit", { message: msg });
    }

    return ok(res, { message: msg });
  } catch (err) {
    return fail(res, err.message, err.status || 500);
  }
}

export async function deleteMsg(req, res) {
  try {
    const forEveryone = req.query.forEveryone === "true";
    const msg = await deleteMessage(req.params.id, req.user._id, forEveryone);

    if (forEveryone) {
      const receiverSocketId = getSocketId(String(msg.receiverId));
      if (receiverSocketId) {
        getIO()
          .to(receiverSocketId)
          .emit("message:delete", { messageId: msg._id, isDeletedForEveryone: true });
      }
    }

    return ok(res, { message: msg });
  } catch (err) {
    return fail(res, err.message, err.status || 500);
  }
}

export async function searchMsgs(req, res) {
  try {
    const { q } = req.query;
    if (!q?.trim()) return ok(res, { messages: [] });
    const messages = await searchMessages(req.user._id, q.trim());
    return ok(res, { messages });
  } catch (err) {
    return fail(res, err.message);
  }
}

export async function clearChatHistory(req, res) {
  try {
    await clearChat(req.user._id, req.params.id);
    return ok(res, { cleared: true });
  } catch (err) {
    return fail(res, err.message);
  }
}

export async function reactToMessage(req, res) {
  try {
    const { emoji } = req.body;
    const msg = await toggleReaction(req.params.id, req.user._id, emoji);

    // Notify the other party in real-time
    const otherId = String(msg.senderId) === String(req.user._id)
      ? String(msg.receiverId)
      : String(msg.senderId);
    const sid = getSocketId(otherId);
    if (sid) getIO().to(sid).emit("message:reaction", { messageId: msg._id, reactions: msg.reactions });

    return ok(res, { message: msg });
  } catch (err) {
    return fail(res, err.message, err.status || 500);
  }
}
