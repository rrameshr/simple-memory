import Notification from "../models/Notification.js";
import User from "../models/User.js";

/** Notify everyone in the couple except the actor (and optionally only one specific user). */
export async function notifyPartner({ couple, actorId, type, message, link = "", only }) {
  try {
    const actor = await User.findById(actorId).select("name");
    const recipients = couple.members.map(String).filter((id) => id !== String(actorId) && (!only || String(only) === id));
    if (!recipients.length) return;
    const text = message.replace("{actor}", actor?.name || "Your partner");
    await Notification.insertMany(recipients.map((userId) => ({ userId, coupleId: couple._id, actor: actorId, type, message: text, link })));
  } catch (err) {
    console.error("Failed to create notification:", err.message); // never fail the main request
  }
}
