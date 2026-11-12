const pad = (n) => String(n).padStart(2, "0");

export const getError = (err, fallback = "Something went wrong. Please try again.") => err?.response?.data?.message || fallback;

/** Dates of memories are instants -> shown in the viewer's timezone. */
export const fmtDate = (d, opts = { day: "numeric", month: "short", year: "numeric" }) => (d ? new Date(d).toLocaleDateString(undefined, opts) : "");
/** Calendar dates (anniversary, birthdays, events) have no time -> shown in UTC so they never shift a day. */
export const fmtDay = (d, opts = {}) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC", ...opts });

export const toDateInput = (d) => { const x = new Date(d); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };
export const utcDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
/** A picked calendar day -> local noon, so it stays on that day in every timezone. */
export const dateInputToISO = (v) => { const [y, m, d] = v.split("-").map(Number); return new Date(y, m - 1, d, 12).toISOString(); };

export const daysSince = (d) => Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000));

export function fmtBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = bytes / 1024, i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
}

export const cleanParams = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v !== null && v !== undefined && v !== false));

export function groupByMonth(items) {
  const groups = [];
  for (const m of items) {
    const label = new Date(m.takenAt).toLocaleDateString(undefined, { month: "long", year: "numeric" });
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(m); else groups.push({ label, items: [m] });
  }
  return groups;
}

export const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(d);
};
