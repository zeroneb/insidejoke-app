export function ago(ts) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Yesterday';
  if (d < 7) return `${d}d`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Today as YYYY-MM-DD where the day starts last (UTC−12), so a date is only "past" once it's past for everyone.
export function earliestToday(ms = Date.now()) {
  return new Date(ms - 12 * 3600000).toISOString().slice(0, 10);
}
// A list date (YYYY-MM-DD) that has already gone by everywhere.
export const isPastDay = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || '')) && String(d) < earliestToday();
export const PAST_DATE_ERROR = 'That date has already passed. Pick today or a day after.';
// The browser's own today, for min= on date inputs (set after mount so server and browser markup match).
export function localToday() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}
