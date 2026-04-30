import { Router } from "express";
import { requireSession } from "../../guards/session.guard.js";
import { requireAdmin }   from "../../guards/admin.guard.js";
import {
  getDashboard,
  getUsers, updateUser, deleteUser,
  getGroupsAdmin, deleteGroupAdmin,
  getReports, updateReport,
} from "./admin.handlers.js";

export const adminRouter = Router();
adminRouter.use(requireSession, requireAdmin);

adminRouter.get("/dashboard",            getDashboard);

adminRouter.get("/users",                getUsers);
adminRouter.patch("/users/:id",          updateUser);
adminRouter.delete("/users/:id",         deleteUser);

adminRouter.get("/groups",               getGroupsAdmin);
adminRouter.delete("/groups/:id",        deleteGroupAdmin);

adminRouter.get("/reports",              getReports);
adminRouter.patch("/reports/:id",        updateReport);
