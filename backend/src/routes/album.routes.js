import { Router } from "express";
import Album from "../models/Album.js";
import Memory from "../models/Memory.js";
import { requireAuth } from "../middleware/auth.js";
import { requireCouple } from "../middleware/requireCouple.js";
import { validate, idParams } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/httpError.js";
import { buildMediaUrls } from "../utils/media.js";
import { albumSchema, albumUpdateSchema, idsSchema } from "../validators/schemas.js";

const router = Router();
router.use(requireAuth);
const aid = idParams("albumId");

async function loadAlbum(req) {
  const album = await Album.findOne({ _id: req.params.albumId, coupleId: req.couple._id });
  if (!album) throw new HttpError(404, "Album not found.");
  return album;
}
const coverUrl = (m) => (m ? buildMediaUrls(m).thumb : null);

async function describe(albums, coupleId) {
  const ids = albums.map((a) => a._id);
  const [stats, covers] = await Promise.all([
    Memory.aggregate([{ $match: { coupleId, deletedAt: null, albumIds: { $in: ids } } }, { $unwind: "$albumIds" }, { $match: { albumIds: { $in: ids } } },
      { $sort: { takenAt: -1 } }, { $group: { _id: "$albumIds", count: { $sum: 1 }, latest: { $first: "$$ROOT" } } }]),
    Memory.find({ _id: { $in: albums.map((a) => a.coverMemory).filter(Boolean) }, deletedAt: null })
  ]);
  const byAlbum = new Map(stats.map((s) => [String(s._id), s]));
  const coverById = new Map(covers.map((c) => [String(c._id), c]));
  return albums.map((a) => {
    const s = byAlbum.get(String(a._id));
    const cover = coverById.get(String(a.coverMemory)) || s?.latest;
    return { ...a.toObject(), count: s?.count || 0, coverUrl: coverUrl(cover) };
  });
}

router.get("/:coupleId", requireCouple, asyncHandler(async (req, res) => {
  const albums = await Album.find({ coupleId: req.couple._id }).sort({ createdAt: -1 });
  res.json({ albums: await describe(albums, req.couple._id) });
}));

router.post("/:coupleId", requireCouple, validate(albumSchema), asyncHandler(async (req, res) => {
  const album = await Album.create({ ...req.body, coupleId: req.couple._id, createdBy: req.user.id });
  res.status(201).json({ album: (await describe([album], req.couple._id))[0] });
}));

router.get("/:coupleId/:albumId", requireCouple, aid, asyncHandler(async (req, res) => {
  const album = await loadAlbum(req);
  res.json({ album: (await describe([album], req.couple._id))[0] });
}));

router.patch("/:coupleId/:albumId", requireCouple, aid, validate(albumUpdateSchema), asyncHandler(async (req, res) => {
  const album = await loadAlbum(req);
  if (req.body.coverMemory) {
    const ok = await Memory.exists({ _id: req.body.coverMemory, coupleId: req.couple._id, albumIds: album._id, deletedAt: null });
    if (!ok) throw new HttpError(400, "The cover must be a memory inside this album.");
  }
  Object.assign(album, req.body);
  await album.save();
  res.json({ album: (await describe([album], req.couple._id))[0] });
}));

router.delete("/:coupleId/:albumId", requireCouple, aid, asyncHandler(async (req, res) => {
  const album = await loadAlbum(req);
  await Memory.updateMany({ coupleId: req.couple._id, albumIds: album._id }, { $pull: { albumIds: album._id } }); // photos are kept
  await album.deleteOne();
  res.json({ message: "Album deleted. Its memories were kept." });
}));

router.post("/:coupleId/:albumId/memories", requireCouple, aid, validate(idsSchema), asyncHandler(async (req, res) => {
  const album = await loadAlbum(req);
  const r = await Memory.updateMany({ _id: { $in: req.body.ids }, coupleId: req.couple._id, deletedAt: null }, { $addToSet: { albumIds: album._id } });
  res.json({ added: r.modifiedCount });
}));

router.delete("/:coupleId/:albumId/memories", requireCouple, aid, validate(idsSchema), asyncHandler(async (req, res) => {
  const album = await loadAlbum(req);
  const r = await Memory.updateMany({ _id: { $in: req.body.ids }, coupleId: req.couple._id }, { $pull: { albumIds: album._id } });
  if (album.coverMemory && req.body.ids.includes(String(album.coverMemory))) { album.coverMemory = null; await album.save(); }
  res.json({ removed: r.modifiedCount });
}));

export default router;
