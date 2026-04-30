import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { authRouter }    from "../modules/auth/auth.router.js";
import { messageRouter } from "../modules/messaging/message.router.js";
import { groupRouter }   from "../modules/groups/group.router.js";
import { reportRouter }  from "../modules/reports/report.router.js";
import { adminRouter }   from "../modules/admin/admin.router.js";
import { rateLimitGuard } from "../guards/shield.js";

export function buildApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CLIENT_URL,
      credentials: true,
    })
  );

  // 75 MB limit to accommodate base64-encoded 50 MB files
  app.use(express.json({ limit: "75mb" }));
  app.use(express.urlencoded({ extended: true, limit: "75mb" }));
  app.use(cookieParser());
  app.use(rateLimitGuard);

  app.use("/api/auth",     authRouter);
  app.use("/api/messages", messageRouter);
  app.use("/api/groups",   groupRouter);
  app.use("/api/reports",  reportRouter);
  app.use("/api/admin",    adminRouter);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", ts: Date.now() });
  });

  return app;
}
