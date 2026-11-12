export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Accepts "a, #B, a" or ["a","B"] and returns unique, lowercase, trimmed tags (max 15, 30 chars each). */
export function parseTags(input) {
  const list = Array.isArray(input) ? input : String(input ?? "").split(",");
  const clean = list
    .map((t) => String(t).trim().toLowerCase().replace(/^#/, "").slice(0, 30))
    .filter(Boolean);
  return [...new Set(clean)].slice(0, 15);
}
