import mongoose from "mongoose";

const albumSchema = new mongoose.Schema({
  coupleId: { type: mongoose.Schema.Types.ObjectId, ref: "Couple", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, default: "", maxlength: 300 },
  coverMemory: { type: mongoose.Schema.Types.ObjectId, ref: "Memory", default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

export default mongoose.model("Album", albumSchema);
