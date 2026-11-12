import { Router } from "express";
import Event from "../models/Event.js";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { requireCouple } from "../middleware/requireCouple.js";
import { validate, idParams } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/httpError.js";
import { nextOccurrence, daysBetween } from "../utils/dates.js";
import { notifyPartner } from "../services/notify.js";
import { eventSchema, eventUpdateSchema } from "../validators/schemas.js";

const router = Router();
router.use(requireAuth);
const eid = idParams("eventId");

router.get("/:coupleId", requireCouple, asyncHandler(async (req, res) => {
  const events = await Event.find({ coupleId: req.couple._id }).sort({ date: 1 });
  res.json({ events });
}));

// Next N days of dates: saved events + the anniversary + each partner's birthday (computed, not stored as events).
router.get("/:coupleId/upcoming", requireCouple, asyncHandler(async (req, res) => {
  const horizon = Math.min(Math.max(Number(req.query.days) || 60, 1), 366);
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const [events, members] = await Promise.all([Event.find({ coupleId: req.couple._id }), User.find({ _id: { $in: req.couple.members } }).select("name birthday")]);
  const candidates = [
    ...events.map((e) => ({ id: String(e._id), title: e.title, type: e.type, notes: e.notes, recurring: e.recurring, date: e.date, editable: true })),
    ...(req.couple.anniversary ? [{ id: "anniversary", title: "Our anniversary", type: "anniversary", recurring: true, date: req.couple.anniversary, editable: false }] : []),
    ...members.filter((m) => m.birthday).map((m) => ({ id: `birthday-${m._id}`, title: `${m.name}'s birthday`, type: "birthday", recurring: true, date: m.birthday, editable: false }))
  ];
  const upcoming = candidates.map((c) => {
    const next = nextOccurrence(c.date, c.recurring, now);
    if (!next) return null;
    const yearsAgo = next.getUTCFullYear() - new Date(c.date).getUTCFullYear();
    return { ...c, nextDate: next, daysAway: daysBetween(today, next), years: c.recurring && yearsAgo > 0 ? yearsAgo : null };
  }).filter((c) => c && c.daysAway <= horizon).sort((a, b) => a.daysAway - b.daysAway);
  res.json({ upcoming });
}));

router.post("/:coupleId", requireCouple, validate(eventSchema), asyncHandler(async (req, res) => {
  const event = await Event.create({ ...req.body, coupleId: req.couple._id, createdBy: req.user.id });
  await notifyPartner({ couple: req.couple, actorId: req.user.id, type: "event", message: `{actor} added a date: ${event.title}`, link: "/dates" });
  res.status(201).json({ event });
}));

router.patch("/:coupleId/:eventId", requireCouple, eid, validate(eventUpdateSchema), asyncHandler(async (req, res) => {
  const event = await Event.findOneAndUpdate({ _id: req.params.eventId, coupleId: req.couple._id }, req.body, { new: true, runValidators: true });
  if (!event) throw new HttpError(404, "Date not found.");
  res.json({ event });
}));

router.delete("/:coupleId/:eventId", requireCouple, eid, asyncHandler(async (req, res) => {
  const event = await Event.findOneAndDelete({ _id: req.params.eventId, coupleId: req.couple._id });
  if (!event) throw new HttpError(404, "Date not found.");
  res.json({ message: "Date removed." });
}));

export default router;
