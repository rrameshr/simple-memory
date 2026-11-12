import { Router } from "express";
import multer from "multer";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import Memory from "../models/Memory.js";
import Comment from "../models/Comment.js";
import { requireAuth } from "../middleware/auth.js";
import { requireCouple } from "../middleware/requireCouple.js";
import { validate, idParams } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/httpError.js";
import { escapeRegex, parseTags } from "../utils/text.js";
import { serializeMemory, REACTIONS } from "../utils/media.js";
import { cloudinary, configured } from "../config/cloudinary.js";
import { destroyMemories, TRASH_DAYS } from "../services/memoryService.js";
import { notifyPartner } from "../services/notify.js";
import { memoryUpdateSchema, uploadFieldsSchema, listQuerySchema, bulkSchema, reactSchema, commentSchema } from "../validators/schemas.js";

const router = Router();
router.use(requireAuth);

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif", "video/mp4", "video/quicktime", "video/webm"]);
const upload = multer({
  dest: path.join(os.tmpdir(), "couple-memories-uploads"), // streamed to disk, not held in RAM
  limits: { fileSize: 100 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => cb(ALLOWED.has(file.mimetype) ? null : new HttpError(400, `Unsupported file type: ${file.mimetype}. Use JPG, PNG, WebP, GIF, HEIC, MP4, MOV or WebM.`), true)
});

const mid = idParams("memoryId");
const uploaderFields = "name profileImage";

async function commentCounts(memories) {
  if (!memories.length) return new Map();
  const rows = await Comment.aggregate([{ $match: { memoryId: { $in: memories.map((m) => m._id) } } }, { $group: { _id: "$memoryId", n: { $sum: 1 } } }]);
  return new Map(rows.map((r) => [String(r._id), r.n]));
}
async function serializeList(memories, userId) {
  const counts = await commentCounts(memories);
  return memories.map((m) => serializeMemory(m, userId, { commentCount: counts.get(String(m._id)) || 0 }));
}
async function findOwn(req, { trashed = false } = {}) {
  const memory = await Memory.findOne({ _id: req.params.memoryId, coupleId: req.couple._id, deletedAt: trashed ? { $ne: null } : null });
  if (!memory) throw new HttpError(404, "Memory not found.");
  if (String(memory.uploadedBy) !== req.user.id) throw new HttpError(403, "Only the uploader can do this.");
  return memory;
}
async function findVisible(req) {
  const memory = await Memory.findOne({ _id: req.params.memoryId, coupleId: req.couple._id, deletedAt: null });
  if (!memory) throw new HttpError(404, "Memory not found.");
  return memory;
}
const cleanup = (files = []) => Promise.all(files.map((f) => fs.unlink(f.path).catch(() => {})));

function buildFilter(couple, userId, q) {
  const f = { coupleId: couple._id, deletedAt: null };
  if (q.owner === "mine") f.uploadedBy = userId;
  else if (q.owner === "partner") f.uploadedBy = { $ne: userId };
  if (q.scope) f.scope = q.scope;
  if (q.mediaType) f.mediaType = q.mediaType;
  if (q.favorite === "true") f.favoritedBy = userId;
  else if (q.favorite === "false") f.favoritedBy = { $ne: userId };
  if (q.tag) f.tags = q.tag;
  if (q.album) f.albumIds = q.album;
  if (q.from || q.to) {
    f.takenAt = {};
    if (q.from) f.takenAt.$gte = q.from;
    if (q.to) f.takenAt.$lte = new Date(q.to.getTime() + 86_400_000 - 1); // inclusive end day
  }
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), "i");
    f.$or = [{ title: rx }, { caption: rx }, { location: rx }, { tags: rx }];
  }
  return f;
}
const SORTS = { newest: { takenAt: -1, _id: -1 }, oldest: { takenAt: 1, _id: 1 }, uploaded: { createdAt: -1, _id: -1 } };

/* ---------- static routes first (must precede /:memoryId) ---------- */

router.get("/:coupleId/stats", requireCouple, asyncHandler(async (req, res) => {
  const base = { coupleId: req.couple._id, deletedAt: null };
  const since = new Date(); since.setUTCMonth(since.getUTCMonth() - 11, 1); since.setUTCHours(0, 0, 0, 0);
  const now = new Date();
  const [totals, byMonth, topTags, onThisDay, favorites, trash] = await Promise.all([
    Memory.aggregate([{ $match: base }, { $group: {
      _id: null, total: { $sum: 1 }, bytes: { $sum: { $ifNull: ["$size", 0] } },
      photos: { $sum: { $cond: [{ $eq: ["$mediaType", "image"] }, 1, 0] } },
      videos: { $sum: { $cond: [{ $eq: ["$mediaType", "video"] }, 1, 0] } },
      shared: { $sum: { $cond: [{ $eq: ["$scope", "shared"] }, 1, 0] } },
      personal: { $sum: { $cond: [{ $eq: ["$scope", "personal"] }, 1, 0] } }
    } }]),
    Memory.aggregate([{ $match: { ...base, takenAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$takenAt" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Memory.aggregate([{ $match: base }, { $unwind: "$tags" }, { $group: { _id: "$tags", count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }, { $limit: 12 }]),
    Memory.find({ ...base, $expr: { $and: [
      { $eq: [{ $dateToString: { format: "%m-%d", date: "$takenAt" } }, now.toISOString().slice(5, 10)] },
      { $lt: [{ $year: "$takenAt" }, now.getUTCFullYear()] }] } }).populate("uploadedBy", uploaderFields).limit(6),
    Memory.countDocuments({ ...base, favoritedBy: req.user.id }),
    Memory.countDocuments({ coupleId: req.couple._id, uploadedBy: req.user.id, deletedAt: { $ne: null } })
  ]);
  const t = totals[0] || { total: 0, bytes: 0, photos: 0, videos: 0, shared: 0, personal: 0 };
  res.json({
    totals: { total: t.total, photos: t.photos, videos: t.videos, shared: t.shared, personal: t.personal, storageBytes: t.bytes },
    uploadsByMonth: byMonth.map((r) => ({ month: r._id, count: r.count })),
    topTags: topTags.map((r) => ({ tag: r._id, count: r.count })),
    onThisDay: await serializeList(onThisDay, req.user.id),
    favorites, trash
  });
}));

router.get("/:coupleId/tags", requireCouple, asyncHandler(async (req, res) => {
  const rows = await Memory.aggregate([{ $match: { coupleId: req.couple._id, deletedAt: null } }, { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } }, { $sort: { count: -1, _id: 1 } }, { $limit: 50 }]);
  res.json({ tags: rows.map((r) => ({ tag: r._id, count: r.count })) });
}));

router.get("/:coupleId/trash", requireCouple, asyncHandler(async (req, res) => {
  const items = await Memory.find({ coupleId: req.couple._id, uploadedBy: req.user.id, deletedAt: { $ne: null } })
    .sort({ deletedAt: -1 }).populate("uploadedBy", uploaderFields);
  const memories = (await serializeList(items, req.user.id)).map((m) => ({ ...m, purgeAt: new Date(new Date(m.deletedAt).getTime() + TRASH_DAYS * 86_400_000) }));
  res.json({ memories, retentionDays: TRASH_DAYS });
}));

router.delete("/:coupleId/trash", requireCouple, asyncHandler(async (req, res) => {
  const items = await Memory.find({ coupleId: req.couple._id, uploadedBy: req.user.id, deletedAt: { $ne: null } });
  res.json({ deleted: await destroyMemories(items) });
}));

router.post("/:coupleId/bulk", requireCouple, validate(bulkSchema), asyncHandler(async (req, res) => {
  const { action, ids, scope } = req.body;
  const base = { _id: { $in: ids }, coupleId: req.couple._id, deletedAt: null };
  const own = { ...base, uploadedBy: req.user.id };
  let result;
  if (action === "delete") result = await Memory.updateMany(own, { deletedAt: new Date(), deletedBy: req.user.id });
  else if (action === "scope") {
    if (!scope) throw new HttpError(400, "Choose personal or shared.");
    result = await Memory.updateMany(own, { scope });
  } else if (action === "favorite") result = await Memory.updateMany(base, { $addToSet: { favoritedBy: req.user.id } });
  else result = await Memory.updateMany(base, { $pull: { favoritedBy: req.user.id } });
  res.json({ affected: result.modifiedCount, skipped: ids.length - result.modifiedCount });
}));

/* ---------- list + upload ---------- */

router.get("/:coupleId", requireCouple, validate(listQuerySchema, "query"), asyncHandler(async (req, res) => {
  const q = req.query;
  const filter = buildFilter(req.couple, req.user.id, q);
  const [items, total] = await Promise.all([
    Memory.find(filter).sort(SORTS[q.sort]).skip((q.page - 1) * q.limit).limit(q.limit).populate("uploadedBy", uploaderFields),
    Memory.countDocuments(filter)
  ]);
  res.json({ memories: await serializeList(items, req.user.id), page: q.page, pages: Math.max(1, Math.ceil(total / q.limit)), total });
}));

async function uploadToCloudinary(file, couple, scope) {
  const options = {
    folder: `couple-memories/${couple._id}/${scope}`,
    resource_type: file.mimetype.startsWith("video/") ? "video" : "image",
    type: "authenticated" // not publicly reachable; we hand out signed URLs
  };
  const fn = file.size > 20 * 1024 * 1024 ? cloudinary.uploader.upload_large : cloudinary.uploader.upload;
  return new Promise((resolve, reject) => fn.call(cloudinary.uploader, file.path, options, (err, result) => (err ? reject(err) : resolve(result))));
}

router.post("/:coupleId", requireCouple, upload.array("files", 10), asyncHandler(async (req, res) => {
  const files = req.files || [];
  try {
    if (!configured) throw new HttpError(503, "Configure Cloudinary credentials in .env before uploading.");
    if (!files.length) throw new HttpError(400, "Choose at least one image or video.");
    const fields = uploadFieldsSchema.parse(req.body);
    let modified = [];
    try { modified = JSON.parse(fields.lastModified || "[]"); } catch { /* ignore */ }
    const tags = parseTags(fields.tags);

    const settled = await Promise.allSettled(files.map((file) => uploadToCloudinary(file, req.couple, fields.scope)));
    const created = []; const failed = [];
    for (const [i, outcome] of settled.entries()) {
      if (outcome.status === "rejected") { failed.push({ name: files[i].originalname, message: outcome.reason?.message || "Upload failed" }); continue; }
      const up = outcome.value;
      const lm = Number(modified[i]);
      created.push(await Memory.create({
        coupleId: req.couple._id, uploadedBy: req.user.id, scope: fields.scope,
        mediaType: files[i].mimetype.startsWith("video/") ? "video" : "image",
        mediaUrl: up.secure_url, publicId: up.public_id, deliveryType: "authenticated",
        title: fields.title || "", caption: fields.caption || "", location: fields.location || "", tags,
        takenAt: fields.takenAt || (lm > 0 && lm <= Date.now() ? new Date(lm) : new Date()),
        format: up.format, size: up.bytes, width: up.width, height: up.height, duration: up.duration
      }));
    }
    if (!created.length) throw new HttpError(502, `Upload failed: ${failed[0]?.message || "unknown error"}`);
    const n = created.length;
    await notifyPartner({ couple: req.couple, actorId: req.user.id, type: "memory-added", message: `{actor} added ${n} new ${n === 1 ? "memory" : "memories"} 📸`, link: fields.scope === "shared" ? "/gallery?tab=ours" : "/gallery?tab=hers" });
    const populated = await Memory.find({ _id: { $in: created.map((m) => m._id) } }).populate("uploadedBy", uploaderFields);
    res.status(201).json({ memories: await serializeList(populated, req.user.id), failed });
  } finally {
    await cleanup(files);
  }
}));

/* ---------- single memory ---------- */

router.get("/:coupleId/:memoryId", requireCouple, mid, asyncHandler(async (req, res) => {
  const memory = await Memory.findOne({ _id: req.params.memoryId, coupleId: req.couple._id, deletedAt: null }).populate("uploadedBy", uploaderFields);
  if (!memory) throw new HttpError(404, "Memory not found.");
  res.json({ memory: (await serializeList([memory], req.user.id))[0] });
}));

router.patch("/:coupleId/:memoryId", requireCouple, mid, validate(memoryUpdateSchema), asyncHandler(async (req, res) => {
  const memory = await findOwn(req);
  const { tags, ...rest } = req.body;
  Object.assign(memory, rest);
  if (tags !== undefined) memory.tags = parseTags(tags);
  await memory.save();
  await memory.populate("uploadedBy", uploaderFields);
  res.json({ memory: (await serializeList([memory], req.user.id))[0] });
}));

// Soft delete: moves to Trash for 30 days, then purged automatically.
router.delete("/:coupleId/:memoryId", requireCouple, mid, asyncHandler(async (req, res) => {
  const memory = await findOwn(req);
  memory.deletedAt = new Date(); memory.deletedBy = req.user.id;
  await memory.save();
  res.json({ message: "Moved to Trash.", retentionDays: TRASH_DAYS });
}));

router.post("/:coupleId/:memoryId/restore", requireCouple, mid, asyncHandler(async (req, res) => {
  const memory = await findOwn(req, { trashed: true });
  memory.deletedAt = null; memory.deletedBy = undefined;
  await memory.save();
  res.json({ message: "Memory restored." });
}));

router.delete("/:coupleId/:memoryId/permanent", requireCouple, mid, asyncHandler(async (req, res) => {
  const memory = await findOwn(req, { trashed: true });
  await destroyMemories([memory]);
  res.json({ message: "Memory permanently deleted." });
}));

/* ---------- favorites, reactions, comments ---------- */

router.post("/:coupleId/:memoryId/favorite", requireCouple, mid, asyncHandler(async (req, res) => {
  const memory = await findVisible(req);
  const has = memory.favoritedBy.some((id) => String(id) === req.user.id);
  await Memory.updateOne({ _id: memory._id }, has ? { $pull: { favoritedBy: req.user.id } } : { $addToSet: { favoritedBy: req.user.id } });
  res.json({ isFavorite: !has });
}));

router.post("/:coupleId/:memoryId/react", requireCouple, mid, validate(reactSchema), asyncHandler(async (req, res) => {
  const { emoji } = req.body;
  if (!REACTIONS.includes(emoji)) throw new HttpError(400, "Unsupported reaction.");
  const memory = await findVisible(req);
  const existing = memory.reactions.find((r) => String(r.user) === req.user.id);
  const removing = existing?.emoji === emoji;
  memory.reactions = memory.reactions.filter((r) => String(r.user) !== req.user.id);
  if (!removing) memory.reactions.push({ user: req.user.id, emoji });
  await memory.save();
  if (!removing && String(memory.uploadedBy) !== req.user.id) {
    await notifyPartner({ couple: req.couple, actorId: req.user.id, type: "reaction", message: `{actor} reacted ${emoji} to your memory`, link: "/gallery", only: memory.uploadedBy });
  }
  const { reactions, myReaction } = serializeMemory(memory, req.user.id);
  res.json({ reactions, myReaction });
}));

router.get("/:coupleId/:memoryId/comments", requireCouple, mid, asyncHandler(async (req, res) => {
  await findVisible(req);
  const comments = await Comment.find({ memoryId: req.params.memoryId }).sort({ createdAt: 1 }).populate("author", uploaderFields);
  res.json({ comments });
}));

router.post("/:coupleId/:memoryId/comments", requireCouple, mid, validate(commentSchema), asyncHandler(async (req, res) => {
  const memory = await findVisible(req);
  const comment = await Comment.create({ memoryId: memory._id, coupleId: req.couple._id, author: req.user.id, text: req.body.text });
  await comment.populate("author", uploaderFields);
  if (String(memory.uploadedBy) !== req.user.id) {
    await notifyPartner({ couple: req.couple, actorId: req.user.id, type: "comment", message: "{actor} commented on your memory 💬", link: "/gallery", only: memory.uploadedBy });
  }
  res.status(201).json({ comment });
}));

router.delete("/:coupleId/:memoryId/comments/:commentId", requireCouple, mid, idParams("commentId"), asyncHandler(async (req, res) => {
  const comment = await Comment.findOne({ _id: req.params.commentId, memoryId: req.params.memoryId, coupleId: req.couple._id });
  if (!comment) throw new HttpError(404, "Comment not found.");
  if (String(comment.author) !== req.user.id) throw new HttpError(403, "You can only delete your own comments.");
  await comment.deleteOne();
  res.json({ message: "Comment deleted." });
}));

export default router;
