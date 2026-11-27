import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    lastSeenVisibility: { type: String, enum: ["all", "none"], default: "all" },
    readReceiptsEnabled: { type: Boolean, default: true },
    soundOnMessage: { type: Boolean, default: true },
    soundOnSend: { type: Boolean, default: true },
    fontSize: { type: String, enum: ["sm", "md", "lg"], default: "md" },
    minimalistMode: { type: Boolean, default: false },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    profilePic: { type: String, default: "" },
    bio: { type: String, default: "", maxlength: 150, trim: true },
    lastSeen: { type: Date, default: Date.now },
    settings: { type: settingsSchema, default: () => ({}) },

    isAdmin: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    emailVerificationCode: { type: String, select: false },
    emailVerificationExpiry: { type: Date, select: false },
    publicKey: { type: String, default: "" },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", userSchema);
