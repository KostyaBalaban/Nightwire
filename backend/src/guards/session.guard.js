import jwt from "jsonwebtoken";
import { User } from "../modules/auth/user.schema.js";
import { fail } from "../helpers/response.js";

export const SESSION_COOKIE = "nightwire_token";

/**
 * Verifies a session JWT and loads its user.
 * Throws { status, message } when the token is invalid or the user cannot use the app.
 * Shared by the HTTP guard below and the Socket.io handshake middleware.
 */
export async function resolveSessionUser(token) {
  if (!token) throw { status: 401, message: "Not authenticated" };

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw { status: 401, message: "Invalid or expired session" };
  }

  const user = await User.findById(decoded.userId).select("-password");
  if (!user) throw { status: 401, message: "User not found" };
  if (user.isBlocked) throw { status: 403, message: "Your account has been blocked" };

  return user;
}

export async function requireSession(req, res, next) {
  try {
    req.user = await resolveSessionUser(req.cookies?.[SESSION_COOKIE]);
    next();
  } catch (err) {
    return fail(res, err.message || "Invalid or expired session", err.status || 401);
  }
}
