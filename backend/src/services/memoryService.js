import Memory from "../models/Memory.js";
import Comment from "../models/Comment.js";
import { cloudinary, configured } from "../config/cloudinary.js";

/** Permanently removes memories: Cloudinary assets first, then database records. */
export async function destroyMemories(memories) {
  if (!memories.length) return 0;
  if (configured) {
    await Promise.allSettled(memories.map((m) =>
      cloudinary.uploader.destroy(m.publicId, { resource_type: m.mediaType, type: m.deliveryType || "upload", invalidate: true })));
  }
  const ids = memories.map((m) => m._id);
  await Comment.deleteMany({ memoryId: { $in: ids } });
  await Memory.deleteMany({ _id: { $in: ids } });
  return ids.length;
}

export const TRASH_DAYS = 30;

export async function purgeExpiredTrash() {
  const cutoff = new Date(Date.now() - TRASH_DAYS * 86_400_000);
  const expired = await Memory.find({ deletedAt: { $ne: null, $lt: cutoff } }).limit(200);
  const count = await destroyMemories(expired);
  if (count) console.log(`Trash purge: permanently removed ${count} memories`);
}

export function startTrashPurge() {
  const run = () => purgeExpiredTrash().catch((e) => console.error("Trash purge failed:", e.message));
  run();
  return setInterval(run, 6 * 60 * 60 * 1000).unref();
}
