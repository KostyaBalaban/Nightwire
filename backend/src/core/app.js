import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { authRouter } from "../modules/auth/auth.router.js";
import { messageRouter } from "../modules/messaging/message.router.js";
import { groupRouter } from "../modules/groups/group.router.js";
import { reportRouter } from "../modules/reports/report.router.js";
import { adminRouter } from "../modules/admin/admin.router.js";
import { rateLimitGuard } from "../guards/shield.js";

export function buildApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CLIENT_URL,
      credentials: true,
    }),
  );

  // 75 MB limit to accommodate base64-encoded 50 MB files
  app.use(express.json({ limit: "75mb" }));
  app.use(express.urlencoded({ extended: true, limit: "75mb" }));
  app.use(cookieParser());
  app.use(rateLimitGuard);

  app.use("/api/auth", authRouter);
  app.use("/api/messages", messageRouter);
  app.use("/api/groups", groupRouter);
  app.use("/api/reports", reportRouter);
  app.use("/api/admin", adminRouter);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", ts: Date.now() });
  });

  // Unknown API routes return JSON instead of falling through to the SPA
  app.use("/api", (_req, res) => {
    res.status(404).json({ success: false, message: "Not found" });
  });

  // Serve the built frontend (frontend/dist) from the same origin when it exists,
  // so a single service hosts the API, Socket.io and the SPA (cookies stay first-party).
  const distDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../frontend/dist",
  );
  if (fs.existsSync(path.join(distDir, "index.html"))) {
    app.use(express.static(distDir, { index: false, maxAge: "1h" }));
    app.get("*", (_req, res) => res.sendFile(path.join(distDir, "index.html")));
  }

  return app;
}
