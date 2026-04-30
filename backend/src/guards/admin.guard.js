import { fail } from "../helpers/response.js";

export function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) return fail(res, "Admin access required", 403);
  next();
}
