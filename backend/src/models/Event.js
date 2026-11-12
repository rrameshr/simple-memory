import mongoose from "mongoose";

export const EVENT_TYPES = ["anniversary", "birthday", "trip", "milestone", "date-night", "other"];

const eventSchema = new mongoose.Schema({
  coupleId: { type: mongoose.Schema.Types.ObjectId, ref: "Couple", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  date: { type: Date, required: true },
  type: { type: String, enum: EVENT_TYPES, default: "other" },
  recurring: { type: Boolean, default: false },
  notes: { type: String, default: "", maxlength: 500 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

export default mongoose.model("Event", eventSchema);
