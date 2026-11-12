import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import User, { publicUser } from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { hashToken, randomToken } from "../utils/tokens.js";
import { sendMail } from "../utils/mailer.js";
import { cookieSecure, clientOrigins } from "../config/env.js";
import { registerSchema, loginSchema, forgotSchema, resetSchema, tokenSchema } from "../validators/schemas.js";

const router = Router();
const ACCESS_MS = 15 * 60 * 1000;
const REFRESH_MS = 30 * 24 * 60 * 60 * 1000;
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12); // keeps login timing equal for unknown emails

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 25, standardHeaders: true, legacyHeaders: false,
  message: { message: "Too many attempts. Please try again in a few minutes." }
});

const baseCookie = () => ({ httpOnly: true, sameSite: "lax", secure: cookieSecure() });
const clientUrl = () => clientOrigins()[0];

async function issueSession(req, res, user) {
  const access = jwt.sign({ id: user._id.toString(), email: user.email }, process.env.JWT_ACCESS_SECRET, { expiresIn: "15m" });
  const refresh = randomToken(48);
  await RefreshToken.create({
    userId: user._id, tokenHash: hashToken(refresh), expiresAt: new Date(Date.now() + REFRESH_MS),
    userAgent: req.headers["user-agent"]?.slice(0, 200), ip: req.ip
  });
  res.cookie("accessToken", access, { ...baseCookie(), path: "/", maxAge: ACCESS_MS });
  res.cookie("refreshToken", refresh, { ...baseCookie(), path: "/api/auth", maxAge: REFRESH_MS });
}

function clearSession(res) {
  res.clearCookie("accessToken", { ...baseCookie(), path: "/" });
  res.clearCookie("refreshToken", { ...baseCookie(), path: "/api/auth" });
}

async function sendVerification(user) {
  const token = randomToken();
  await User.updateOne({ _id: user._id }, { emailVerifyTokenHash: hashToken(token), emailVerifyExpires: new Date(Date.now() + 24 * 3600 * 1000) });
  await sendMail({
    to: user.email, subject: "Verify your email for Couple Memories",
    text: `Hi ${user.name},\n\nConfirm your email address:\n${clientUrl()}/verify-email?token=${token}\n\nThis link expires in 24 hours.`
  });
}

router.post("/register", authLimiter, validate(registerSchema), asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.findOne({ email })) return res.status(409).json({ message: "An account with this email already exists." });
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
  await issueSession(req, res, user);
  sendVerification(user).catch((e) => console.error("Verification email failed:", e.message));
  res.status(201).json({ user: publicUser(user) });
}));

router.post("/login", authLimiter, validate(loginSchema), asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select("+passwordHash");
  const ok = await bcrypt.compare(req.body.password, user?.passwordHash || DUMMY_HASH);
  if (!user || !ok) return res.status(401).json({ message: "Invalid email or password." });
  await issueSession(req, res, user);
  res.json({ user: publicUser(user) });
}));

// Rotates the refresh token. Presenting an already-used token means it was stolen: revoke every session.
router.post("/refresh", asyncHandler(async (req, res) => {
  const raw = req.cookies?.refreshToken;
  if (!raw) return res.status(401).json({ message: "No session." });
  const record = await RefreshToken.findOne({ tokenHash: hashToken(raw) });
  if (!record || record.expiresAt < new Date()) { clearSession(res); return res.status(401).json({ message: "Session expired." }); }
  if (record.revokedAt) {
    await RefreshToken.updateMany({ userId: record.userId, revokedAt: null }, { revokedAt: new Date() });
    clearSession(res);
    return res.status(401).json({ message: "Session invalid. Please log in again." });
  }
  const user = await User.findById(record.userId);
  if (!user) { clearSession(res); return res.status(401).json({ message: "User not found." }); }
  record.revokedAt = new Date();
  await record.save();
  await issueSession(req, res, user);
  res.json({ user: publicUser(user) });
}));

router.post("/logout", asyncHandler(async (req, res) => {
  const raw = req.cookies?.refreshToken;
  if (raw) await RefreshToken.updateOne({ tokenHash: hashToken(raw) }, { revokedAt: new Date() });
  clearSession(res);
  res.json({ message: "Logged out" });
}));

router.post("/logout-all", requireAuth, asyncHandler(async (req, res) => {
  await RefreshToken.updateMany({ userId: req.user.id, revokedAt: null }, { revokedAt: new Date() });
  clearSession(res);
  res.json({ message: "Signed out of all devices." });
}));

router.get("/me", requireAuth, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(401).json({ message: "User not found" });
  res.json({ user: publicUser(user) });
}));

router.post("/forgot-password", authLimiter, validate(forgotSchema), asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (user) {
    const token = randomToken();
    await User.updateOne({ _id: user._id }, { resetTokenHash: hashToken(token), resetTokenExpires: new Date(Date.now() + 3600 * 1000) });
    await sendMail({ to: user.email, subject: "Reset your Couple Memories password", text: `Reset your password (valid for 1 hour):\n${clientUrl()}/reset-password?token=${token}\n\nIf you didn't ask for this, you can ignore this email.` });
  }
  res.json({ message: "If that email exists, a reset link is on its way." }); // same answer either way
}));

router.post("/reset-password", authLimiter, validate(resetSchema), asyncHandler(async (req, res) => {
  const user = await User.findOne({ resetTokenHash: hashToken(req.body.token), resetTokenExpires: { $gt: new Date() } }).select("+resetTokenHash");
  if (!user) return res.status(400).json({ message: "This reset link is invalid or has expired." });
  user.passwordHash = await bcrypt.hash(req.body.password, 12);
  user.resetTokenHash = undefined; user.resetTokenExpires = undefined;
  await user.save();
  await RefreshToken.updateMany({ userId: user._id, revokedAt: null }, { revokedAt: new Date() });
  res.json({ message: "Password updated. You can log in now." });
}));

router.post("/verify-email", validate(tokenSchema), asyncHandler(async (req, res) => {
  const user = await User.findOne({ emailVerifyTokenHash: hashToken(req.body.token), emailVerifyExpires: { $gt: new Date() } });
  if (!user) return res.status(400).json({ message: "This verification link is invalid or has expired." });
  await User.updateOne({ _id: user._id }, { emailVerified: true, $unset: { emailVerifyTokenHash: 1, emailVerifyExpires: 1 } });
  res.json({ message: "Email verified. Thank you!" });
}));

router.post("/resend-verification", requireAuth, authLimiter, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (user && !user.emailVerified) await sendVerification(user);
  res.json({ message: "Verification email sent." });
}));

export default router;
