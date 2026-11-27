import mongoose from "mongoose";
import { randomUUID } from "crypto";

const memberSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role:     { type: String, enum: ["owner", "admin", "member"], default: "member" },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const groupSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true, maxlength: 64 },
    description: { type: String, default: "", maxlength: 300, trim: true },
    avatar:      { type: String, default: "" },
    ownerId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    members:     [memberSchema],
    inviteCode:  { type: String, unique: true, default: () => randomUUID().slice(0, 8) },
  },
  { timestamps: true }
);

export const Group = mongoose.model("Group", groupSchema);
