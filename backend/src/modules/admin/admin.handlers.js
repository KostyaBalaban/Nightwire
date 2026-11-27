import { ok, fail } from "../../helpers/response.js";
import { User } from "../auth/user.schema.js";
import { Message } from "../messaging/message.schema.js";
import { Group } from "../groups/group.schema.js";
import { Report } from "../reports/report.schema.js";
import { getIO } from "../../core/socket.js";

export async function getDashboard(req, res) {
  try {
    const now = new Date();
    const todayStart  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart   = new Date(todayStart.getTime() - 6 * 86_400_000);
    const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers, totalMessages,
      todayMessages, weekMessages, monthMessages,
      pendingReports, totalGroups,
    ] = await Promise.all([
      User.countDocuments(),
      Message.countDocuments(),
      Message.countDocuments({ createdAt: { $gte: todayStart } }),
      Message.countDocuments({ createdAt: { $gte: weekStart } }),
      Message.countDocuments({ createdAt: { $gte: monthStart } }),
      Report.countDocuments({ status: "pending" }),
      Group.countDocuments(),
    ]);

    const onlineCount = getIO().sockets.sockets.size;

    const topUsers = await Message.aggregate([
      { $group: { _id: "$senderId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      { $project: { count: 1, "user.fullName": 1, "user.profilePic": 1, "user.email": 1 } },
    ]);

    const hourlyStats = await Message.aggregate([
      { $match: { createdAt: { $gte: todayStart } } },
      { $group: { _id: { $hour: "$createdAt" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    return ok(res, {
      stats: { totalUsers, totalMessages, todayMessages, weekMessages, monthMessages, pendingReports, totalGroups, onlineCount },
      topUsers,
      hourlyStats,
    });
  } catch (err) {
    return fail(res, err.message);
  }
}

export async function getUsers(req, res) {
  try {
    const { search, page = "1", limit = "20" } = req.query;
    const filter = {};
    if (search) {
      const esc = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { fullName: { $regex: esc, $options: "i" } },
        { email:    { $regex: esc, $options: "i" } },
      ];
    }

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password -emailVerificationCode -emailVerificationExpiry")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(filter),
    ]);

    return ok(res, { users, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    return fail(res, err.message);
  }
}

export async function updateUser(req, res) {
  try {
    const { isBlocked, isAdmin } = req.body;
    const updates = {};
    if (typeof isBlocked !== "undefined") updates.isBlocked = isBlocked;
    if (typeof isAdmin   !== "undefined") updates.isAdmin   = isAdmin;

    if (Object.keys(updates).length === 0) return fail(res, "Nothing to update", 400);

    const updated = await User.findByIdAndUpdate(req.params.id, updates, { new: true })
      .select("-password");
    if (!updated) return fail(res, "User not found", 404);

    return ok(res, { user: updated });
  } catch (err) {
    return fail(res, err.message);
  }
}

export async function deleteUser(req, res) {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return fail(res, "User not found", 404);
    return ok(res, { deleted: true });
  } catch (err) {
    return fail(res, err.message);
  }
}

export async function getGroupsAdmin(req, res) {
  try {
    const groups = await Group.find()
      .populate("ownerId", "fullName email")
      .sort({ createdAt: -1 });
    return ok(res, { groups });
  } catch (err) {
    return fail(res, err.message);
  }
}

export async function deleteGroupAdmin(req, res) {
  try {
    await Group.findByIdAndDelete(req.params.id);
    await Message.deleteMany({ groupId: req.params.id });
    return ok(res, { deleted: true });
  } catch (err) {
    return fail(res, err.message);
  }
}

export async function getReports(req, res) {
  try {
    const { status = "pending" } = req.query;
    const reports = await Report.find({ status })
      .populate("reporterId", "fullName email profilePic")
      .sort({ createdAt: -1 });
    return ok(res, { reports });
  } catch (err) {
    return fail(res, err.message);
  }
}

export async function updateReport(req, res) {
  try {
    const { status, adminNote } = req.body;
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { status, adminNote },
      { new: true, runValidators: true }
    ).populate("reporterId", "fullName email");
    if (!report) return fail(res, "Report not found", 404);
    return ok(res, { report });
  } catch (err) {
    return fail(res, err.message);
  }
}
