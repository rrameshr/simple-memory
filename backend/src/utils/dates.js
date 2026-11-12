const startOfTodayUTC = (now) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

/**
 * Next time a date occurs on/after "today" (UTC). Yearly-recurring dates roll forward;
 * one-off dates return null once they are in the past.
 */
export function nextOccurrence(date, recurring, now = new Date()) {
  const d = new Date(date);
  const today = startOfTodayUTC(now);
  if (!recurring) return d >= today ? d : null;
  let next = new Date(Date.UTC(today.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  if (next < today) next = new Date(Date.UTC(today.getUTCFullYear() + 1, d.getUTCMonth(), d.getUTCDate()));
  return next;
}

export const daysBetween = (from, to) => Math.round((to - from) / 86_400_000);
