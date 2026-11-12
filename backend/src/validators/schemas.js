import { z } from "zod";
import mongoose from "mongoose";

export const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), "Invalid id");
const emailField = z.string().trim().toLowerCase().email("Enter a valid email address.").max(254);
export const passwordField = z.string().min(8, "Password must be at least 8 characters.").max(128)
  .regex(/[A-Za-z]/, "Password must include a letter.").regex(/\d/, "Password must include a number.");
// literal/null first: z.coerce.date() would turn null into 1970-01-01
const optionalDate = z.union([z.literal(""), z.null(), z.coerce.date()]).transform((v) => (v ? v : null));

export const registerSchema = z.object({ name: z.string().trim().min(1, "Name is required.").max(80), email: emailField, password: passwordField });
export const loginSchema = z.object({ email: emailField, password: z.string().min(1).max(128) });
export const forgotSchema = z.object({ email: emailField });
export const resetSchema = z.object({ token: z.string().min(10).max(200), password: passwordField });
export const tokenSchema = z.object({ token: z.string().min(10).max(200) });
export const profileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  bio: z.string().trim().max(200).optional(),
  birthday: optionalDate.optional()
});
export const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: passwordField });
export const confirmPasswordSchema = z.object({ password: z.string().min(1).max(128) });

export const coupleCreateSchema = z.object({ name: z.string().trim().max(80).optional() });
export const joinSchema = z.object({ inviteCode: z.string().trim().min(4).max(20) });
export const coupleUpdateSchema = z.object({ name: z.string().trim().min(1).max(80).optional(), anniversary: optionalDate.optional() });

const tagsField = z.union([z.string(), z.array(z.string())]).optional();
export const memoryUpdateSchema = z.object({
  title: z.string().trim().max(100).optional(),
  caption: z.string().trim().max(500).optional(),
  location: z.string().trim().max(100).optional(),
  tags: tagsField,
  takenAt: z.coerce.date().optional(),
  scope: z.enum(["personal", "shared"]).optional()
});
export const uploadFieldsSchema = z.object({
  scope: z.enum(["personal", "shared"], { message: "Scope must be personal or shared." }),
  title: z.string().trim().max(100).optional(),
  caption: z.string().trim().max(500).optional(),
  location: z.string().trim().max(100).optional(),
  tags: tagsField,
  takenAt: z.union([z.literal(""), z.coerce.date()]).optional(),
  lastModified: z.string().max(2000).optional()
});
export const listQuerySchema = z.object({
  owner: z.enum(["all", "mine", "partner"]).default("all"),
  scope: z.enum(["personal", "shared"]).optional(),
  mediaType: z.enum(["image", "video"]).optional(),
  favorite: z.enum(["true", "false"]).optional(),
  q: z.string().trim().max(100).optional(),
  tag: z.string().trim().toLowerCase().max(30).optional(),
  album: objectId.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  sort: z.enum(["newest", "oldest", "uploaded"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(24)
});
export const bulkSchema = z.object({
  action: z.enum(["delete", "favorite", "unfavorite", "scope"]),
  ids: z.array(objectId).min(1).max(100),
  scope: z.enum(["personal", "shared"]).optional()
});
export const reactSchema = z.object({ emoji: z.string().min(1).max(8) });
export const commentSchema = z.object({ text: z.string().trim().min(1, "Write something first.").max(1000) });

export const albumSchema = z.object({ name: z.string().trim().min(1, "Album name is required.").max(80), description: z.string().trim().max(300).optional() });
export const albumUpdateSchema = albumSchema.partial().extend({ coverMemory: z.union([objectId, z.null()]).optional() });
export const idsSchema = z.object({ ids: z.array(objectId).min(1).max(200) });

export const EVENT_TYPE_LIST = ["anniversary", "birthday", "trip", "milestone", "date-night", "other"];
export const eventSchema = z.object({
  title: z.string().trim().min(1, "Give the date a title.").max(100),
  date: z.coerce.date(),
  type: z.enum(EVENT_TYPE_LIST).default("other"),
  recurring: z.boolean().default(false),
  notes: z.string().trim().max(500).optional()
});
export const eventUpdateSchema = eventSchema.partial();
