import { Router } from "express";
import bcrypt from "bcryptjs";
import Couple from "../models/Couple.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { requireMember } from "../middleware/requireCouple.js";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { inviteCode } from "../utils/tokens.js";
import { notifyPartner } from "../services/notify.js";
import { removeUserFromCouple, deleteCoupleData } from "../services/accountService.js";
import { coupleCreateSchema, joinSchema, coupleUpdateSchema, confirmPasswordSchema } from "../validators/schemas.js";

const router = Router();
router.use(requireAuth);

router.get("/mine", asyncHandler(async (req, res) => {
  const couples = await Couple.find({ members: req.user.id }).populate("members", "name email profileImage birthday");
  res.json({ couples });
}));

router.post("/", validate(coupleCreateSchema), asyncHandler(async (req, res) => {
  if (await Couple.findOne({ members: req.user.id })) return res.status(409).json({ message: "You already belong to a couple space." });
  const couple = await Couple.create({ name: req.body.name || "Our Memories", members: [req.user.id], createdBy: req.user.id, inviteCode: inviteCode(), status: "pending" });
  res.status(201).json({ couple });
}));

router.post("/join", validate(joinSchema), asyncHandler(async (req, res) => {
  const couple = await Couple.findOne({ inviteCode: req.body.inviteCode.toUpperCase() });
  if (!couple) return res.status(404).json({ message: "Invitation code not found." });
  if (couple.members.some((id) => id.toString() === req.user.id)) return res.status(409).json({ message: "You are already in this space." });
  if (couple.members.length >= 2) return res.status(409).json({ message: "This couple space is full." });
  if (await Couple.findOne({ members: req.user.id })) return res.status(409).json({ message: "You already belong to another couple space." });
  couple.members.push(req.user.id);
  couple.status = "active";
  couple.inviteCode = undefined;
  await couple.save();
  await notifyPartner({ couple, actorId: req.user.id, type: "partner-joined", message: "{actor} joined your space 💞", link: "/dashboard" });
  res.json({ couple });
}));

router.patch("/:coupleId", requireMember, validate(coupleUpdateSchema), asyncHandler(async (req, res) => {
  if (req.body.name !== undefined) req.couple.name = req.body.name;
  if (req.body.anniversary !== undefined) req.couple.anniversary = req.body.anniversary;
  await req.couple.save();
  res.json({ couple: await req.couple.populate("members", "name email profileImage birthday") });
}));

router.post("/:coupleId/invite", requireMember, asyncHandler(async (req, res) => {
  if (req.couple.status !== "pending") return res.status(409).json({ message: "This space already has two members." });
  req.couple.inviteCode = inviteCode();
  await req.couple.save();
  res.json({ couple: req.couple });
}));

// Leave: your own uploads are deleted, your partner keeps the space and can invite someone new.
router.post("/:coupleId/leave", requireMember, validate(confirmPasswordSchema), asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select("+passwordHash");
  if (!(await bcrypt.compare(req.body.password, user.passwordHash))) return res.status(400).json({ message: "Password is incorrect." });
  await removeUserFromCouple(req.user.id);
  res.json({ message: "You left the space." });
}));

router.delete("/:coupleId", requireMember, asyncHandler(async (req, res) => {
  if (req.couple.status !== "pending") return res.status(409).json({ message: "Only an unfinished space can be cancelled. Use “Leave space” instead." });
  await deleteCoupleData(req.couple);
  res.json({ message: "Space deleted." });
}));

export default router;
