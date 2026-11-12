import mongoose from "mongoose";
import Couple from "../models/Couple.js";

async function load(req, res, next, status) {
  try {
    if (!mongoose.isValidObjectId(req.params.coupleId)) return res.status(400).json({ message: "Invalid couple id." });
    const query = { _id: req.params.coupleId, members: req.user.id };
    if (status) query.status = status;
    const couple = await Couple.findOne(query);
    if (!couple) return res.status(403).json({ message: "You do not have access to this couple space." });
    req.couple = couple;
    next();
  } catch (error) { next(error); }
}

/** Member of an ACTIVE couple space (both partners connected). */
export const requireCouple = (req, res, next) => load(req, res, next, "active");
/** Member of a couple space in any state (e.g. creator waiting for partner). */
export const requireMember = (req, res, next) => load(req, res, next, null);
