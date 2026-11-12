import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  profileImage: { type: String, default: "" },
  avatarPublicId: { type: String, default: "", select: false },
  bio: { type: String, default: "", maxlength: 200 },
  birthday: { type: Date, default: null },
  emailVerified: { type: Boolean, default: false },
  emailVerifyTokenHash: { type: String, select: false },
  emailVerifyExpires: { type: Date, select: false },
  resetTokenHash: { type: String, select: false },
  resetTokenExpires: { type: Date, select: false }
}, { timestamps: true });

export const publicUser = (u) => ({
  id: u._id, name: u.name, email: u.email, profileImage: u.profileImage,
  bio: u.bio, birthday: u.birthday, emailVerified: u.emailVerified
});

export default mongoose.model("User", userSchema);
