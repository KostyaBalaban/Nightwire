import { Router } from "express";
import { requireSession } from "../../guards/session.guard.js";
import {
  listUsers,
  getPreviews,
  getHistory,
  sendMessage,
  editMsg,
  deleteMsg,
  searchMsgs,
  clearChatHistory,
  reactToMessage,
} from "./message.handlers.js";

export const messageRouter = Router();

messageRouter.use(requireSession);

// Specific paths before /:id
messageRouter.get("/users",      listUsers);
messageRouter.get("/previews",   getPreviews);
messageRouter.get("/search",     searchMsgs);
messageRouter.get("/:id",        getHistory);

messageRouter.post("/send/:id",     sendMessage);
messageRouter.patch("/:id",         editMsg);
messageRouter.post("/:id/react",    reactToMessage);

messageRouter.delete("/chat/:id",   clearChatHistory);
messageRouter.delete("/:id",        deleteMsg);
