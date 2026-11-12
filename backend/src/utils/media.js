import { cloudinary, configured } from "../config/cloudinary.js";

/** Builds signed delivery URLs. Falls back to the stored URL when Cloudinary is not configured. */
export function buildMediaUrls(m) {
  if (!configured || !m.publicId) return { full: m.mediaUrl, thumb: m.mediaUrl, download: m.mediaUrl };
  const base = {
    resource_type: m.mediaType,
    type: m.deliveryType || "upload",
    secure: true,
    sign_url: true
  };
  const isVideo = m.mediaType === "video";
  return {
    full: cloudinary.url(m.publicId, isVideo
      ? { ...base, format: m.format || "mp4" }
      : { ...base, transformation: [{ quality: "auto", fetch_format: "auto" }] }),
    thumb: cloudinary.url(m.publicId, isVideo
      ? { ...base, format: "jpg", transformation: [{ start_offset: "1" }, { width: 800, crop: "limit" }] }
      : { ...base, transformation: [{ width: 800, height: 800, crop: "limit", quality: "auto", fetch_format: "auto" }] }),
    download: cloudinary.url(m.publicId, { ...base, ...(isVideo ? { format: m.format || "mp4" } : {}), transformation: [{ flags: "attachment" }] })
  };
}

export const REACTIONS = ["❤️", "😍", "😂", "🥹", "🔥", "👏"];

export function serializeMemory(doc, userId, extras = {}) {
  const m = typeof doc.toObject === "function" ? doc.toObject() : doc;
  const uid = String(userId);
  const urls = buildMediaUrls(m);
  const uploader = m.uploadedBy && m.uploadedBy._id ? m.uploadedBy : { _id: m.uploadedBy };
  const counts = new Map();
  for (const r of m.reactions || []) counts.set(r.emoji, (counts.get(r.emoji) || 0) + 1);
  const mine = (m.reactions || []).find((r) => String(r.user) === uid)?.emoji || null;
  const { favoritedBy = [], reactions, publicId, deliveryType, __v, ...rest } = m;
  return {
    ...rest,
    uploadedBy: { _id: uploader._id, name: uploader.name, profileImage: uploader.profileImage },
    isOwner: String(uploader._id) === uid,
    isFavorite: favoritedBy.some((f) => String(f) === uid),
    reactions: [...counts].map(([emoji, count]) => ({ emoji, count })),
    myReaction: mine,
    mediaUrl: urls.full,
    thumbUrl: urls.thumb,
    downloadUrl: urls.download,
    commentCount: extras.commentCount ?? 0
  };
}
