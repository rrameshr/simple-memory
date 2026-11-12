import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  memoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Memory", required: true, index: true },
  coupleId: { type: mongoose.Schema.Types.ObjectId, ref: "Couple", required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true, trim: true, maxlength: 1000 }
}, { timestamps: true });

export default mongoose.model("Comment", commentSchema);
