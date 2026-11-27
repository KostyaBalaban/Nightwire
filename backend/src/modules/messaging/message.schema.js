import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    emoji: { type: String },
  },
  { _id: false },
);

const messageSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },

    text: { type: String, default: "" },
    image: { type: String, default: "" },

    // file attachments (non-image)
    fileUrl: { type: String, default: "" },
    fileType: {
      type: String,
      enum: ["image", "video", "audio", "document", "voice"],
      default: "image",
    },
    fileName: { type: String, default: "" },
    fileSize: { type: Number, default: 0 },

    // E2E encryption
    isEncrypted: { type: Boolean, default: false },

    // delivery / read receipts
    status: { type: String, enum: ["sent", "delivered", "read"], default: "sent" },
    readAt: { type: Date },

    // reply chain
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
    replyToSnippet: { type: String, default: "" },

    // reactions
    reactions: { type: [reactionSchema], default: [] },

    // system event (join / leave / kick)
    isSystem: { type: Boolean, default: false },

    // edit / delete
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
    isDeletedForEveryone: { type: Boolean, default: false },
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

export const Message = mongoose.model("Message", messageSchema);
