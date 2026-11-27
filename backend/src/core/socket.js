import { Server } from "socket.io";
import { User } from "../modules/auth/user.schema.js";
import { Message } from "../modules/messaging/message.schema.js";
import { Group } from "../modules/groups/group.schema.js";
import { resolveSessionUser, SESSION_COOKIE } from "../guards/session.guard.js";

function readCookie(header, name) {
  for (const part of (header || "").split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

// userId (string) → socketId
const onlineMap = new Map();
// userIds who have lastSeenVisibility = "none"
const hiddenSet = new Set();

let io;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL, credentials: true },
  });

  // Authenticate every connection with the same httpOnly session cookie as the REST API.
  // The user id is taken from the verified JWT, never from client-supplied data.
  io.use(async (socket, next) => {
    try {
      const token = readCookie(socket.handshake.headers.cookie, SESSION_COOKIE);
      const user = await resolveSessionUser(token);
      socket.data.userId = String(user._id);
      next();
    } catch (err) {
      next(new Error(err.message || "Unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const userId = socket.data.userId;

    if (userId) {
      onlineMap.set(userId, socket.id);

      // Check privacy setting before first broadcast
      try {
        const u = await User.findById(userId).select("lastSeenVisibility");
        if (u?.lastSeenVisibility === "none") hiddenSet.add(userId);
        else hiddenSet.delete(userId);
      } catch {
        /* ignore */
      }

      broadcastOnlineUsers();

      // Mark previously-sent messages as delivered now that user is online
      Message.updateMany(
        { receiverId: userId, status: "sent" },
        { $set: { status: "delivered" } },
      ).catch(() => {});

      // Auto-join socket rooms for user's groups
      try {
        const groups = await Group.find({ "members.userId": userId }).select("_id");
        groups.forEach((g) => socket.join(`group:${g._id}`));
      } catch {
        /* ignore */
      }
    }

    // Real-time privacy update: client emits this when toggling lastSeenVisibility
    socket.on("privacy:online", ({ hide }) => {
      if (!userId) return;
      if (hide) hiddenSet.add(userId);
      else hiddenSet.delete(userId);
      broadcastOnlineUsers();
    });

    // --- typing ---
    socket.on("typing:start", ({ receiverId }) => {
      const sid = onlineMap.get(String(receiverId));
      if (sid) io.to(sid).emit("typing:start", { senderId: userId });
    });

    socket.on("typing:stop", ({ receiverId }) => {
      const sid = onlineMap.get(String(receiverId));
      if (sid) io.to(sid).emit("typing:stop", { senderId: userId });
    });

    // --- group typing ---
    socket.on("group:typing:start", ({ groupId }) => {
      if (!socket.rooms.has(`group:${groupId}`)) return;
      socket.to(`group:${groupId}`).emit("group:typing:start", { senderId: userId, groupId });
    });

    socket.on("group:typing:stop", ({ groupId }) => {
      if (!socket.rooms.has(`group:${groupId}`)) return;
      socket.to(`group:${groupId}`).emit("group:typing:stop", { senderId: userId, groupId });
    });

    // --- read receipts ---
    socket.on("messages:markAsRead", async ({ senderId }) => {
      try {
        const now = new Date();
        await Message.updateMany(
          { senderId, receiverId: userId, status: { $ne: "read" } },
          { $set: { status: "read", readAt: now } },
        );
        const senderSid = onlineMap.get(String(senderId));
        if (senderSid) {
          io.to(senderSid).emit("messages:read", { senderId: userId, readAt: now });
        }
      } catch (err) {
        console.error("[Socket] markAsRead:", err.message);
      }
    });

    socket.on("disconnect", async () => {
      if (userId) {
        onlineMap.delete(userId);
        hiddenSet.delete(userId);
        broadcastOnlineUsers();
        try {
          await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
        } catch {
          /* ignore */
        }
      }
    });
  });

  return io;
}

function broadcastOnlineUsers() {
  const visible = Array.from(onlineMap.keys()).filter((id) => !hiddenSet.has(id));
  io.emit("getOnlineUsers", visible);
}

export function getIO() {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

export function getSocketId(userId) {
  return onlineMap.get(String(userId));
}

export function joinGroupRoom(userId, groupId) {
  const sid = onlineMap.get(String(userId));
  if (!sid) return;
  const sock = io.sockets.sockets.get(sid);
  if (sock) sock.join(`group:${groupId}`);
}

export function leaveGroupRoom(userId, groupId) {
  const sid = onlineMap.get(String(userId));
  if (!sid) return;
  const sock = io.sockets.sockets.get(sid);
  if (sock) sock.leave(`group:${groupId}`);
}
