import mongoose from "mongoose";

const coupleSchema = new mongoose.Schema({
  name: { type: String, default: "Our Memories", trim: true, maxlength: 80 },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  inviteCode: { type: String, unique: true, sparse: true },
  status: { type: String, enum: ["pending", "active"], default: "pending" },
  anniversary: { type: Date, default: null }
}, { timestamps: true });

coupleSchema.index({ members: 1 });
export default mongoose.model("Couple", coupleSchema);
