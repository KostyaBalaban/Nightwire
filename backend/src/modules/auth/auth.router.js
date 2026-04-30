import { Router } from "express";
import { requireSession } from "../../guards/session.guard.js";
import {
  signup,
  login,
  logout,
  checkSession,
  updateProfile,
  verifyEmail,
  resendVerification,
} from "./auth.handlers.js";

export const authRouter = Router();

authRouter.post("/signup",  signup);
authRouter.post("/login",   login);
authRouter.post("/logout",  logout);

authRouter.get("/check",             requireSession, checkSession);
authRouter.put("/update-profile",    requireSession, updateProfile);
authRouter.post("/verify-email",     requireSession, verifyEmail);
authRouter.post("/resend-verify",    requireSession, resendVerification);
