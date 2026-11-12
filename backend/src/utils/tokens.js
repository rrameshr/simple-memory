import crypto from "node:crypto";

export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");
export const hashToken = (token) => crypto.createHash("sha256").update(String(token)).digest("hex");
export const inviteCode = () => crypto.randomBytes(5).toString("hex").toUpperCase();
