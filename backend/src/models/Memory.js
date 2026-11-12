import mongoose from "mongoose";

const { ObjectId } = mongoose.Schema.Types;

const memorySchema = new mongoose.Schema({
  coupleId: { type: ObjectId, ref: "Couple", required: true, index: true },
  uploadedBy: { type: ObjectId, ref: "User", required: true },
  scope: { type: String, enum: ["personal", "shared"], required: true },
  mediaType: { type: String, enum: ["image", "video"], required: true },
  mediaUrl: { type: String, required: true },
  publicId: { type: String, required: true },
  deliveryType: { type: String, enum: ["upload", "authenticated"], default: "upload" },
  title: { type: String, default: "", trim: true, maxlength: 100 },
  caption: { type: String, default: "", maxlength: 500 },
  location: { type: String, default: "", trim: true, maxlength: 100 },
  tags: [{ type: String, maxlength: 30 }],
  takenAt: { type: Date, default: Date.now },
  format: String,
  size: Number,
  width: Number,
  height: Number,
  duration: Number,
  albumIds: [{ type: ObjectId, ref: "Album" }],
  favoritedBy: [{ type: ObjectId, ref: "User" }],
  reactions: [{ _id: false, user: { type: ObjectId, ref: "User" }, emoji: String }],
  deletedAt: { type: Date, default: null },
  deletedBy: { type: ObjectId, ref: "User" }
}, { timestamps: true });

memorySchema.index({ coupleId: 1, deletedAt: 1, takenAt: -1 });
memorySchema.index({ coupleId: 1, deletedAt: 1, scope: 1, createdAt: -1 });
memorySchema.index({ coupleId: 1, albumIds: 1 });
memorySchema.index({ deletedAt: 1 }, { partialFilterExpression: { deletedAt: { $type: "date" } } });
export default mongoose.model("Memory", memorySchema);
