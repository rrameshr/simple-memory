import { Router } from "express";
import Notification from "../models/Notification.js";
import { requireAuth } from "../middleware/auth.js";
import { idParams } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/httpError.js";

const router = Router();
router.use(requireAuth);

router.get("/", asyncHandler(async (req, res) => {
  const [notifications, unread] = await Promise.all([
    Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50),
    Notification.countDocuments({ userId: req.user.id, read: false })
  ]);
  res.json({ notifications, unread });
}));

router.get("/unread-count", asyncHandler(async (req, res) => {
  res.json({ unread: await Notification.countDocuments({ userId: req.user.id, read: false }) });
}));

router.post("/read-all", asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user.id, read: false }, { read: true });
  res.json({ message: "All caught up." });
}));

router.delete("/", asyncHandler(async (req, res) => {
  await Notification.deleteMany({ userId: req.user.id });
  res.json({ message: "Notifications cleared." });
}));

router.patch("/:id/read", idParams("id"), asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { read: true }, { new: true });
  if (!n) throw new HttpError(404, "Notification not found.");
  res.json({ notification: n });
}));

router.delete("/:id", idParams("id"), asyncHandler(async (req, res) => {
  await Notification.deleteOne({ _id: req.params.id, userId: req.user.id });
  res.json({ message: "Removed." });
}));

export default router;
