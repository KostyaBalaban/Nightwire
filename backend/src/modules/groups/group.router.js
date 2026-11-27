import { Router } from "express";
import { requireSession } from "../../guards/session.guard.js";
import {
  createGroupHandler,
  getGroupHandler,
  getUserGroupsHandler,
  joinGroupHandler,
  leaveGroupHandler,
  updateGroupHandler,
  deleteGroupHandler,
  getGroupMessagesHandler,
  sendGroupMessageHandler,
  updateMemberRoleHandler,
  kickMemberHandler,
} from "./group.handlers.js";

export const groupRouter = Router();
groupRouter.use(requireSession);

groupRouter.get("/", getUserGroupsHandler);
groupRouter.post("/", createGroupHandler);
groupRouter.post("/join", joinGroupHandler);

groupRouter.get("/:id", getGroupHandler);
groupRouter.put("/:id", updateGroupHandler);
groupRouter.delete("/:id", deleteGroupHandler);
groupRouter.post("/:id/leave", leaveGroupHandler);

groupRouter.get("/:id/messages", getGroupMessagesHandler);
groupRouter.post("/:id/messages", sendGroupMessageHandler);

groupRouter.patch("/:id/members/role", updateMemberRoleHandler);
groupRouter.delete("/:id/members/:userId", kickMemberHandler);
