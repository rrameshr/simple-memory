import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  coupleId: { type: mongoose.Schema.Types.ObjectId, ref: "Couple" },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type: { type: String, enum: ["partner-joined", "memory-added", "comment", "reaction", "event"], required: true },
  message: { type: String, required: true, maxlength: 200 },
  link: { type: String, default: "" },
  read: { type: Boolean, default: false }
}, { timestamps: true });

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 }); // auto-clean after 90 days
export default mongoose.model("Notification", notificationSchema);
