// Money ledger: one append-only row per money event, so the founder can see exactly where every dollar went.
// cents are always positive; `kind` says which way the money moved:
//   gift              money in from a giver (owed to the receiver)
//   gift_removed      a gift taken back (bank payment returned, refund, dispute)
//   processing        what the payment provider charged on a gift (est=1 until Stripe reports the real fee)
//   failed_fee        provider fee for a failed bank payment
//   payout            money sent to a receiver at cash-out
//   fee_platform      insidejoke's 5%, kept at cash-out
//   fee_recovered     processing passed on to the receiver at cash-out
//   fee_cashout       the flat cash-out fee, kept at cash-out
//   payout_cost       provider charge per payout (estimate)
//   account_fee       provider charge per monthly active receiver (estimate)
import { get, all, run, id, now } from './db';

export async function ledger(kind, cents, { userId = null, listId = null, contributionId = null, payoutId = null, giftType = null, est = 0, at = null } = {}) {
  try {
    await run('INSERT INTO ledger (id, at, kind, cents, est, user_id, list_id, contribution_id, payout_id, gift_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      id(), at || now(), kind, Math.round(Math.abs(Number(cents) || 0)), est ? 1 : 0, userId, listId, contributionId, payoutId, giftType);
  } catch (e) { console.error('ledger', e.message); } // the ledger never blocks a payment
}

// Replace a gift's estimated processing cost with the real one once Stripe reports it.
export async function setActualProcessing(contributionId, cents) {
  const row = await get("SELECT id FROM ledger WHERE kind = 'processing' AND contribution_id = ?", contributionId);
  if (row) await run('UPDATE ledger SET cents = ?, est = 0 WHERE id = ?', Math.round(cents), row.id);
  else {
    const c = await get('SELECT * FROM contributions WHERE id = ?', contributionId);
    if (c) await ledger('processing', cents, { userId: c.giver_id, listId: c.list_id, contributionId, giftType: c.gift_type });
  }
}

// Direct = one person got the whole wish; group = chipped in; treat = unlimited item.
export async function giftTypeFor(it, cents) {
  if (Number(it.quantity) === 0 || it.unlimited) return 'treat';
  const before = Number((await get('SELECT COALESCE(SUM(amount_cents),0) AS c FROM contributions WHERE item_id = ?', it.id)).c);
  return before === 0 && cents >= Number(it.price_cents) * Math.max(1, Number(it.quantity)) ? 'direct' : 'group';
}

export async function firstPayoutThisMonth(userId) {
  const d = new Date(); const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  return !(await get('SELECT 1 FROM payouts WHERE user_id = ? AND created_at >= ?', userId, start));
}

export { all };
