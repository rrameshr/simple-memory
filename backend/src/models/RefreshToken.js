import mongoose from "mongoose";

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
  userAgent: String,
  ip: String
}, { timestamps: true });

schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Mongo removes expired sessions automatically
export default mongoose.model("RefreshToken", schema);
