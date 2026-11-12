import { clientOrigins } from "../config/env.js";

/**
 * CSRF defence in depth for cookie auth: browsers always send Origin on cross-site POST/PUT/PATCH/DELETE,
 * so reject mutating requests that come from an origin other than our frontend (SameSite=Lax is the first layer).
 */
export function originCheck(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  let origin = req.headers.origin;
  if (!origin && req.headers.referer) {
    try { origin = new URL(req.headers.referer).origin; } catch { /* ignore */ }
  }
  if (!origin) return next(); // non-browser clients do not carry ambient cookies
  if (clientOrigins().includes(origin)) return next();
  return res.status(403).json({ message: "Request origin not allowed." });
}
