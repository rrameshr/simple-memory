import { Router } from "express";
import bcrypt from "bcryptjs";
import multer from "multer";
import User, { publicUser } from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";
import Notification from "../models/Notification.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/httpError.js";
import { cloudinary, configured } from "../config/cloudinary.js";
import { removeUserFromCouple } from "../services/accountService.js";
import { profileSchema, changePasswordSchema, confirmPasswordSchema } from "../validators/schemas.js";

const router = Router();
router.use(requireAuth);

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => cb(/^image\/(jpeg|png|webp)$/.test(file.mimetype) ? null : new HttpError(400, "Avatar must be a JPG, PNG or WebP image."), true)
});

router.patch("/me", validate(profileSchema), asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user.id, req.body, { new: true, runValidators: true });
  res.json({ user: publicUser(user) });
}));

router.put("/me/password", validate(changePasswordSchema), asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("+passwordHash");
  if (!(await bcrypt.compare(req.body.currentPassword, user.passwordHash))) return res.status(400).json({ message: "Current password is incorrect." });
  user.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
  await user.save();
  await RefreshToken.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date() });
  res.clearCookie("refreshToken", { path: "/api/auth" });
  res.json({ message: "Password changed. Other devices have been signed out." });
}));

router.post("/me/avatar", avatarUpload.single("avatar"), asyncHandler(async (req, res) => {
  if (!configured) throw new HttpError(503, "Configure Cloudinary credentials in .env before uploading.");
  if (!req.file) throw new HttpError(400, "Choose an image.");
  const result = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream({
      folder: "couple-memories/avatars", resource_type: "image",
      transformation: [{ width: 256, height: 256, crop: "fill", gravity: "face" }]
    }, (e, r) => (e ? reject(e) : resolve(r))).end(req.file.buffer);
  });
  const user = await User.findById(req.user.id).select("+avatarPublicId");
  if (user.avatarPublicId) cloudinary.uploader.destroy(user.avatarPublicId).catch(() => {});
  user.profileImage = result.secure_url; user.avatarPublicId = result.public_id;
  await user.save();
  res.json({ user: publicUser(user) });
}));

router.delete("/me", validate(confirmPasswordSchema), asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("+passwordHash +avatarPublicId");
  if (!(await bcrypt.compare(req.body.password, user.passwordHash))) return res.status(400).json({ message: "Password is incorrect." });
  await removeUserFromCouple(user._id);
  if (configured && user.avatarPublicId) await cloudinary.uploader.destroy(user.avatarPublicId).catch(() => {});
  await Promise.all([RefreshToken.deleteMany({ userId: user._id }), Notification.deleteMany({ userId: user._id })]);
  await user.deleteOne();
  res.clearCookie("accessToken", { path: "/" });
  res.clearCookie("refreshToken", { path: "/api/auth" });
  res.json({ message: "Your account and uploaded memories were deleted." });
}));

export default router;
