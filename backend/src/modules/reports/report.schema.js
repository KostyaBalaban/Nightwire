import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reporterId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    targetType:  { type: String, enum: ["message", "user", "group"], required: true },
    targetId:    { type: mongoose.Schema.Types.ObjectId, required: true },
    reason:      { type: String, enum: ["spam", "harassment", "forbidden_content", "other"], required: true },
    description: { type: String, default: "", maxlength: 500, trim: true },
    status:      { type: String, enum: ["pending", "resolved", "dismissed"], default: "pending" },
    adminNote:   { type: String, default: "" },
  },
  { timestamps: true }
);

export const Report = mongoose.model("Report", reportSchema);
