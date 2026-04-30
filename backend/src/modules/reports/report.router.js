import { Router } from "express";
import { requireSession } from "../../guards/session.guard.js";
import { createReport } from "./report.handlers.js";

export const reportRouter = Router();
reportRouter.use(requireSession);

reportRouter.post("/", createReport);
