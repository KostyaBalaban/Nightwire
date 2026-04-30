import { ok, fail } from "../../helpers/response.js";
import { Report } from "./report.schema.js";

export async function createReport(req, res) {
  try {
    const { targetType, targetId, reason, description } = req.body;
    if (!targetType || !targetId || !reason)
      return fail(res, "targetType, targetId and reason are required", 400);

    // Prevent duplicate pending reports from same user
    const existing = await Report.findOne({
      reporterId: req.user._id,
      targetId,
      status: "pending",
    });
    if (existing) return fail(res, "You already reported this", 409);

    const report = await Report.create({
      reporterId: req.user._id,
      targetType,
      targetId,
      reason,
      description: description || "",
    });

    return ok(res, { report }, 201);
  } catch (err) {
    return fail(res, err.message, err.status || 500);
  }
}
