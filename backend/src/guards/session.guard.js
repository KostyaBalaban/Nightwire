import jwt from "jsonwebtoken";
import { User } from "../modules/auth/user.schema.js";
import { fail } from "../helpers/response.js";

export async function requireSession(req, res, next) {
  try {
    const token = req.cookies?.nightwire_token;

    if (!token) return fail(res, "Not authenticated", 401);

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) return fail(res, "User not found", 401);
    if (user.isBlocked) return fail(res, "Your account has been blocked", 403);

    req.user = user;
    next();
  } catch {
    return fail(res, "Invalid or expired session", 401);
  }
}
