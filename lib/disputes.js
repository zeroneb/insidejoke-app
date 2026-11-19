// Card disputes (chargebacks). Stripe takes a disputed payment back from insidejoke, plus a fee.
// Disputes reach us from the Stripe webhook (app/api/stripe/webhook), syncDisputes() (daily job + whenever the founder
// opens /admin) and checkGiftsBeforePayout() (right before every cash-out). Refunds work the same way (applyRefund).
//  - gift not cashed out yet: it's taken out of the receiver's wallet while the dispute is open
//  - gift already cashed out: the receiver owes it, and it comes off their next cash-out (users.debt_cents)
//  - receiver's cash-outs pause while any dispute on their gifts is open
//  - dispute won: the gift goes back to the wallet, or the debt is cancelled
import { get, all, run, now } from './db';
import { stripe, stripeOn } from './stripe';
import { ledger } from './ledger';
import { sendText, appUrl } from './texts';

const OPEN = ['warning_needs_response', 'warning_under_review', 'needs_response', 'under_review'];
const dollars = (c) => `$${(c / 100).toFixed(2)}`;
export const DISPUTE_FEE = 1500; // Stripe US dispute fee (estimate)

export async function syncDisputes() {
  if (!stripeOn()) return { checked: 0 };
  let res;
  try { res = await stripe('GET', '/disputes', { limit: 100, created: { gte: Math.floor(Date.now() / 1000) - 120 * 86400 } }); } catch (e) { console.error('disputes', e.message); return { checked: 0 }; }
  let changed = 0;
  for (const d of res?.data || []) if (await applyDispute(d)) changed++;
  return { checked: (res?.data || []).length, changed };
}

export const piOf = (x) => (typeof x === 'string' ? x : x?.id || null);
const CLOSED_OK = ['won', 'warning_closed']; // settled for the receiver (an inquiry that closed never became a chargeback)

// Every gift row paid by one PaymentIntent (moving money on a collab list can split one gift into two rows).
async function giftsFor(pi) {
  return all('SELECT * FROM contributions WHERE stripe_payment_intent_id = ? OR (stripe_payment_intent_id IS NULL AND payment_ref = ?) ORDER BY created_at ASC, id ASC', pi, pi);
}

export const isGiftPayment = async (pi) => !!pi && (await giftsFor(pi)).length > 0;

// Who got (or gets) the money for these gifts: whoever cashed them out, else the list owner.
async function receiverOf(rows) {
  const paid = rows.find((r) => r.paid_out_id);
  const payout = paid ? await get('SELECT user_id FROM payouts WHERE id = ?', paid.paid_out_id) : null;
  const list = await get('SELECT * FROM lists WHERE id = ?', rows[0].list_id);
  const receiverId = payout?.user_id || list?.owner_id || null;
  const receiver = receiverId ? await get('SELECT id, phone FROM users WHERE id = ?', receiverId) : null;
  return { list, receiverId, receiver };
}

// One Stripe dispute (from the webhook, the daily sync, or the check before a cash-out). Safe to call again:
// each change is applied once. Returns true when something changed.
export async function applyDispute(d) {
  const pi = piOf(d?.payment_intent);
  if (!d?.id || !pi) return false;
  const rows = await giftsFor(pi);
  if (!rows.length) return false; // not an insidejoke gift
  const before = await get('SELECT * FROM disputes WHERE id = ?', d.id);
  if (before && before.status === d.status) return false;
  if (before && !OPEN.includes(before.status) && OPEN.includes(d.status)) return false; // a late, older update: already closed
  const c = rows[0];
  const { list, receiverId, receiver } = await receiverOf(rows);
  const amount = Number(d.amount) || rows.reduce((t, r) => t + r.amount_cents, 0);
  const meta = { userId: receiverId, listId: c.list_id, contributionId: c.id, giftType: c.gift_type };

  if (!before) {
    // Already settled for the receiver by the time we heard of it: just keep the record.
    if (CLOSED_OK.includes(d.status)) {
      await run('INSERT INTO disputes (id, contribution_id, list_id, receiver_id, giver_id, amount_cents, status, reason, paid_out, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?) ON CONFLICT (id) DO NOTHING',
        d.id, c.id, c.list_id, receiverId, c.giver_id, amount, d.status, d.reason || null, (Number(d.created) || 0) * 1000 || now(), now());
      return true;
    }
    // Gifts not cashed out yet leave the wallet; the part already cashed out is owed back (comes off the next cash-out).
    let left = amount, owed = 0;
    const hold = [];
    for (const r of rows) {
      if (left <= 0) break;
      const part = Math.min(left, r.amount_cents - Number(r.refunded_cents || 0));
      if (part <= 0) continue;
      left -= part;
      if (r.paid_out_id) owed += part; else hold.push(r.id);
    }
    const ins = await get('INSERT INTO disputes (id, contribution_id, list_id, receiver_id, giver_id, amount_cents, status, reason, paid_out, owed_cents, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING RETURNING id',
      d.id, c.id, c.list_id, receiverId, c.giver_id, amount, d.status, d.reason || null, owed ? 1 : 0, owed, (Number(d.created) || 0) * 1000 || now(), now());
    if (!ins) return false; // another request recorded it first
    for (const cid of hold) await run('UPDATE contributions SET disputed = 1 WHERE id = ?', cid);
    await ledger('gift_removed', amount, meta);
    await ledger('dispute_fee', DISPUTE_FEE, { ...meta, est: 1 });
    if (owed) { await run('UPDATE users SET debt_cents = COALESCE(debt_cents,0) + ? WHERE id = ?', owed, receiverId); await ledger('dispute_loss', owed, meta); }
    if (receiver?.phone) await sendText(receiver.phone, owed
      ? `Heads up: a ${dollars(amount)} gift on "${list?.title || 'your list'}" was disputed by the giver's bank after you cashed it out. If the bank sides with the giver, it comes off your next cash-out. Questions? Reply or see ${appUrl()}/terms`
      : `Heads up: a ${dollars(amount)} gift on "${list?.title || 'your list'}" was disputed by the giver's bank, so it's on hold while that's sorted out.`, 'dispute');
    try { (await import('./events')).logEvent('dispute', { userId: receiverId, ref: c.list_id, detail: `${d.id} ${d.reason || ''} ${dollars(amount)}${owed ? ` (${dollars(owed)} already cashed out)` : ''}` }); } catch {}
    return true;
  }

  const upd = await get('UPDATE disputes SET status = ?, updated_at = ? WHERE id = ? AND status = ? RETURNING id', d.status, now(), d.id, before.status);
  if (!upd) return false;
  if (CLOSED_OK.includes(d.status) && OPEN.includes(before.status)) {
    // Money came back (or never left): undo what we did when it opened.
    const owed = Number(before.owed_cents || 0) || (before.paid_out ? Number(before.amount_cents) : 0);
    const back = Math.max(0, Number(before.amount_cents) - owed);
    if (back) await ledger('gift_restored', back, meta);
    if (owed) { await ledger('dispute_won', owed, meta); await run('UPDATE users SET debt_cents = GREATEST(0, COALESCE(debt_cents,0) - ?) WHERE id = ?', owed, before.receiver_id || receiverId); }
    for (const r of rows) if (!r.paid_out_id && r.disputed) await run('UPDATE contributions SET disputed = 0 WHERE id = ?', r.id);
    if (receiver?.phone) await sendText(receiver.phone, `Good news: the disputed ${dollars(amount)} gift on "${list?.title || 'your list'}" was settled in your favor${owed ? '. Nothing comes off your next cash-out' : ' and is back in your wallet'}.`, 'dispute');
  }
  return true;
}

// A refund to the giver (Stripe charge, with amount_refunded). The refunded part never gets paid out:
// gifts not cashed out yet shrink or leave the wallet; a part already cashed out is owed back.
export async function applyRefund(ch) {
  const pi = piOf(ch?.payment_intent);
  if (!pi) return false;
  const rows = await giftsFor(pi);
  if (!rows.length) return false;
  let left = Number(ch.amount_refunded || 0) - rows.reduce((t, r) => t + Number(r.refunded_cents || 0), 0);
  if (left <= 0) return false;
  const { list, receiverId, receiver } = await receiverOf(rows);
  let removed = 0, owed = 0;
  for (const r of [...rows].reverse()) { // newest part first
    if (left <= 0) break;
    const had = Number(r.refunded_cents || 0);
    const part = Math.min(left, r.amount_cents - had);
    if (part <= 0) continue;
    if (!(await get('UPDATE contributions SET refunded_cents = ? WHERE id = ? AND COALESCE(refunded_cents,0) = ? RETURNING id', had + part, r.id, had))) continue;
    left -= part; removed += part;
    if (r.paid_out_id) owed += part;
  }
  if (!removed) return false;
  const c = rows[0];
  const meta = { userId: receiverId, listId: c.list_id, contributionId: c.id, giftType: c.gift_type };
  await ledger('gift_removed', removed, meta);
  if (owed) { await run('UPDATE users SET debt_cents = COALESCE(debt_cents,0) + ? WHERE id = ?', owed, receiverId); await ledger('refund_loss', owed, meta); }
  if (receiver?.phone) await sendText(receiver.phone, owed
    ? `Heads up: ${dollars(removed)} of a gift on "${list?.title || 'your list'}" was refunded to the giver after you cashed it out, so it comes off your next cash-out. Questions? Reply or see ${appUrl()}/terms`
    : `Heads up: ${dollars(removed)} of a gift on "${list?.title || 'your list'}" was refunded to the giver, so it's no longer in your wallet.`, 'refund');
  try { (await import('./events')).logEvent('refund', { userId: receiverId, ref: c.list_id, detail: `${ch.id || pi} ${dollars(removed)}${owed ? ` (${dollars(owed)} already cashed out)` : ''}` }); } catch {}
  return true;
}

const piFor = (g) => g.stripe_payment_intent_id || (/^pi_/.test(g.payment_ref || '') ? g.payment_ref : null);

// Right before money leaves: ask Stripe about every gift about to be paid out, so a dispute or refund that
// hasn't reached us yet (late or missed webhook) is never cashed out. Throws if Stripe can't be asked
// (nothing is sent). Records what it finds; the caller re-reads the balance after.
// Returns { sources: { pi: charge id }, bad: [pi] } — bad = Stripe says the payment isn't a settled, paid charge.
export async function checkGiftsBeforePayout(gifts) {
  const sources = {}, bad = [];
  if (!stripeOn()) return { sources, bad };
  for (const pi of [...new Set(gifts.map(piFor).filter(Boolean))]) {
    const p = await stripe('GET', `/payment_intents/${encodeURIComponent(pi)}`, { expand: ['latest_charge'] });
    const ch = p?.latest_charge && typeof p.latest_charge === 'object' ? p.latest_charge : null;
    if (p?.status !== 'succeeded' || !ch || ch.status !== 'succeeded' || ch.paid === false) { bad.push(pi); continue; }
    sources[pi] = ch.id;
    if (ch.disputed) {
      const ds = (await stripe('GET', '/disputes', { payment_intent: pi, limit: 10 }))?.data || [];
      if (!ds.length) bad.push(pi);
      for (const d of ds) await applyDispute(d);
    }
    if (ch.refunded || Number(ch.amount_refunded) > 0) await applyRefund(ch);
    // The 3-day card hold follows what Stripe says was charged, not what the app guessed at checkout.
    const type = ch.payment_method_details?.type;
    if (type && type !== 'us_bank_account') await run("UPDATE contributions SET method = 'card' WHERE (stripe_payment_intent_id = ? OR payment_ref = ?) AND method = 'bank'", pi, pi);
  }
  return { sources, bad };
}

// Open disputes on gifts this person received: their cash-outs wait until these are settled.
export async function openDisputesFor(userId) {
  return Number((await get(`SELECT COUNT(*) AS n FROM disputes WHERE receiver_id = ? AND status IN (${OPEN.map(() => '?').join(',')})`, userId, ...OPEN))?.n || 0);
}

export async function debtFor(userId) {
  return Number((await get('SELECT COALESCE(debt_cents,0) AS c FROM users WHERE id = ?', userId))?.c || 0);
}

export async function disputesForAdmin() {
  return all(`SELECT d.*, l.title, l.slug, r.name AS receiver, g.name AS giver, g.phone AS giver_phone, g.created_at AS giver_since, c.note, c.created_at AS given_at
    FROM disputes d LEFT JOIN lists l ON l.id = d.list_id LEFT JOIN users r ON r.id = d.receiver_id LEFT JOIN users g ON g.id = d.giver_id LEFT JOIN contributions c ON c.id = d.contribution_id
    ORDER BY (CASE WHEN d.status IN ('${OPEN.join("','")}') THEN 0 ELSE 1 END), d.created_at DESC LIMIT 30`);
}

// Receivers who owe money back (disputes or refunds on gifts they already cashed out): a negative balance
// that comes off their next cash-out.
export async function debtsForAdmin() {
  return all(`SELECT u.id, u.name, u.debt_cents,
      (SELECT MAX(l.at) FROM ledger l WHERE l.user_id = u.id AND l.kind IN ('dispute_loss', 'refund_loss')) AS since
    FROM users u WHERE COALESCE(u.debt_cents, 0) > 0 ORDER BY u.debt_cents DESC LIMIT 50`);
}

export const isOpen = (s) => OPEN.includes(s);
