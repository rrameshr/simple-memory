import Couple from "../models/Couple.js";
import Memory from "../models/Memory.js";
import Comment from "../models/Comment.js";
import Album from "../models/Album.js";
import Event from "../models/Event.js";
import Notification from "../models/Notification.js";
import { destroyMemories } from "./memoryService.js";
import { inviteCode } from "../utils/tokens.js";

export async function deleteCoupleData(couple) {
  const all = await Memory.find({ coupleId: couple._id });
  await destroyMemories(all);
  await Promise.all([
    Comment.deleteMany({ coupleId: couple._id }),
    Album.deleteMany({ coupleId: couple._id }),
    Event.deleteMany({ coupleId: couple._id }),
    Notification.deleteMany({ coupleId: couple._id })
  ]);
  await couple.deleteOne();
}

/**
 * Removes a user's footprint from their couple space. Their own uploads are deleted;
 * the partner keeps everything else and the space goes back to "pending" with a fresh invite code.
 */
export async function removeUserFromCouple(userId) {
  const couple = await Couple.findOne({ members: userId });
  if (!couple) return;
  await destroyMemories(await Memory.find({ coupleId: couple._id, uploadedBy: userId }));
  await Comment.deleteMany({ coupleId: couple._id, author: userId });
  await Memory.updateMany({ coupleId: couple._id }, { $pull: { favoritedBy: userId, reactions: { user: userId } } });
  couple.members.pull(userId);
  if (couple.members.length === 0) return deleteCoupleData(couple);
  couple.status = "pending";
  couple.inviteCode = inviteCode();
  couple.createdBy = couple.members[0];
  await couple.save();
}
