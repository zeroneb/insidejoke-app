// Fraud flags. Before a cash-out, look for patterns that match stolen-card cash-outs.
// A flagged cash-out pauses for the founder to review on /admin; normal lists never trip these.
import { get, all, run, id, now } from './db';
import { unpaidGifts } from './wallet';
import { sendText, appUrl } from './texts';

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const dollars = (c) => `$${(c / 100).toFixed(c % 100 ? 2 : 0)}`;

// Reasons this list's cash-out looks risky (empty = fine). Only gifts newer than the last review count.
export async function riskReasons(list) {
  const since = Number(list.reviewed_at || 0);
  const gifts = (await unpaidGifts(list.id)).filter((g) => g.ready && Number(g.created_at) > since);
  if (!gifts.length) return [];
  const out = [];
  const total = gifts.reduce((t, g) => t + g.amount_cents, 0);
  const listAge = (g) => Number(g.created_at) - Number(list.created_at);

  // 1. A brand-new list funded within hours, mostly by brand-new accounts.
  const fast = gifts.filter((g) => listAge(g) < DAY);
  if (fast.length) {
    const ids = [...new Set(fast.map((g) => g.giver_id))];
    const newGivers = (await all(`SELECT id FROM users WHERE id IN (${ids.map(() => '?').join(',')}) AND created_at > ?`, ...ids, Number(list.created_at) - DAY)).length;
    const fastCents = fast.reduce((t, g) => t + g.amount_cents, 0);
    const coveredInHour = fast.some((g) => g.covered && listAge(g) < HOUR);
    if (coveredInHour) out.push('A wish was fully covered within an hour of the list being made');
    else if (fastCents >= 20000 && newGivers * 2 >= ids.length) out.push(`${dollars(fastCents)} given in the list's first day, mostly by brand-new accounts`);
  }

  // 2. Cards from several different countries outside the US.
  const foreign = [...new Set(gifts.map((g) => g.card_country).filter((c) => c && c !== 'US'))];
  if (foreign.length >= 2) out.push(`Cards from ${foreign.length} countries outside the US (${foreign.join(', ')})`);

  // 3. The same giver giving to many different people's lists in a day (one card spread around).
  for (const giver of [...new Set(gifts.map((g) => g.giver_id))]) {
    const n = Number((await get(`SELECT COUNT(DISTINCT l.owner_id) AS n FROM contributions c JOIN lists l ON l.id = c.list_id WHERE c.giver_id = ? AND c.created_at > ?`, giver, now() - DAY)).n);
    if (n >= 5) { out.push(`One giver gave to ${n} different people's lists in a day`); break; }
  }

  if (out.length && total < 2000) return []; // tiny amounts aren't worth pausing anyone
  return out;
}

// Pending review for this list, if there is one.
export async function pendingReview(listId) {
  return get("SELECT * FROM cashout_reviews WHERE list_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1", listId);
}

// Call before cashing out. Returns null when it's fine to go ahead, or a message for the owner.
export async function holdForReview(list, userId, amountCents) {
  if (await pendingReview(list.id)) return "We're taking a quick look at this cash-out to keep everyone safe. We'll text you as soon as it's cleared, usually within a day.";
  const reasons = await riskReasons(list);
  if (!reasons.length) return null;
  await run('INSERT INTO cashout_reviews (id, list_id, user_id, amount_cents, reasons, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    id(), list.id, userId, amountCents, JSON.stringify(reasons), 'pending', now());
  try { (await import('./events')).logEvent('cashout_review', { userId, ref: list.id, detail: reasons.join('; ') }); } catch {}
  return "We're taking a quick look at this cash-out to keep everyone safe. We'll text you as soon as it's cleared, usually within a day.";
}

// Founder decision from /admin. approve: the owner can cash out (these gifts won't be checked again).
export async function decideReview(reviewId, approve) {
  const r = await get('SELECT * FROM cashout_reviews WHERE id = ?', reviewId);
  if (!r || r.status !== 'pending') return;
  await run('UPDATE cashout_reviews SET status = ?, decided_at = ? WHERE id = ?', approve ? 'approved' : 'denied', now(), r.id);
  const list = await get('SELECT * FROM lists WHERE id = ?', r.list_id);
  const u = await get('SELECT phone FROM users WHERE id = ?', r.user_id);
  if (approve) {
    await run('UPDATE lists SET reviewed_at = ? WHERE id = ?', now(), r.list_id);
    if (u?.phone) await sendText(u.phone, `You're all set: your cash-out on "${list?.title || 'your list'}" is cleared. Cash out here: ${appUrl()}/wallet?l=${r.list_id}`, 'review');
  } else if (u?.phone) {
    await sendText(u.phone, `We couldn't clear the cash-out on "${list?.title || 'your list'}" yet. We'll be in touch to sort it out with you.`, 'review');
  }
}
