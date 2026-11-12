import { ZodError } from "zod";
import multer from "multer";

export function notFound(_req, res) { res.status(404).json({ message: "Route not found." }); }

export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    const issues = err.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
    return res.status(400).json({ message: issues[0]?.message || "Invalid request.", issues });
  }
  if (err instanceof multer.MulterError) {
    const map = { LIMIT_FILE_SIZE: "File is too large (max 100 MB).", LIMIT_FILE_COUNT: "Too many files (max 10 per upload).", LIMIT_UNEXPECTED_FILE: "Unexpected file field." };
    return res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ message: map[err.code] || err.message });
  }
  if (err.name === "CastError" || err.name === "ValidationError") return res.status(400).json({ message: "Invalid data." });
  if (err.code === 11000) return res.status(409).json({ message: "That value is already in use." });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ message: status >= 500 && process.env.NODE_ENV === "production" ? "Internal server error" : err.message || "Internal server error" });
}
