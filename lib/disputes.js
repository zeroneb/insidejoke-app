// Card disputes (chargebacks). Stripe takes a disputed payment back from insidejoke, plus a fee.
// syncDisputes() checks Stripe for disputes (daily job + whenever the founder opens /admin) and:
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
  for (const d of res?.data || []) {
    const pi = typeof d.payment_intent === 'string' ? d.payment_intent : d.payment_intent?.id;
    if (!pi) continue;
    const c = await get('SELECT * FROM contributions WHERE stripe_payment_intent_id = ?', pi);
    if (!c) continue; // not an insidejoke gift
    const before = await get('SELECT * FROM disputes WHERE id = ?', d.id);
    if (before && before.status === d.status) continue;
    changed++;
    const list = await get('SELECT * FROM lists WHERE id = ?', c.list_id);
    const payout = c.paid_out_id ? await get('SELECT user_id FROM payouts WHERE id = ?', c.paid_out_id) : null;
    const receiverId = payout?.user_id || list?.owner_id;
    const amount = Number(d.amount) || c.amount_cents;
    const meta = { userId: receiverId, listId: c.list_id, contributionId: c.id, giftType: c.gift_type };
    const receiver = receiverId ? await get('SELECT id, phone FROM users WHERE id = ?', receiverId) : null;

    if (!before) {
      const paidOut = c.paid_out_id ? 1 : 0;
      await run('INSERT INTO disputes (id, contribution_id, list_id, receiver_id, giver_id, amount_cents, status, reason, paid_out, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        d.id, c.id, c.list_id, receiverId, c.giver_id, amount, d.status, d.reason || null, paidOut, (Number(d.created) || 0) * 1000 || now(), now());
      await ledger('gift_removed', amount, meta);
      await ledger('dispute_fee', DISPUTE_FEE, { ...meta, est: 1 });
      if (paidOut) { await run('UPDATE users SET debt_cents = COALESCE(debt_cents,0) + ? WHERE id = ?', amount, receiverId); await ledger('dispute_loss', amount, meta); }
      else await run('UPDATE contributions SET disputed = 1 WHERE id = ?', c.id);
      if (receiver?.phone) await sendText(receiver.phone, paidOut
        ? `Heads up: a ${dollars(amount)} gift on "${list?.title || 'your list'}" was disputed by the giver's bank after you cashed it out. If the bank sides with the giver, it comes off your next cash-out. Questions? Reply or see ${appUrl()}/terms`
        : `Heads up: a ${dollars(amount)} gift on "${list?.title || 'your list'}" was disputed by the giver's bank, so it's on hold while that's sorted out.`, 'dispute');
      try { (await import('./events')).logEvent('dispute', { userId: receiverId, ref: c.list_id, detail: `${d.id} ${d.reason || ''} ${dollars(amount)}` }); } catch {}
    } else {
      await run('UPDATE disputes SET status = ?, updated_at = ? WHERE id = ?', d.status, now(), d.id);
      if (d.status === 'won' && OPEN.includes(before.status)) {
        // Money came back: undo what we did when it opened.
        await ledger(before.paid_out ? 'dispute_won' : 'gift_restored', amount, meta);
        if (before.paid_out) await run('UPDATE users SET debt_cents = GREATEST(0, COALESCE(debt_cents,0) - ?) WHERE id = ?', amount, receiverId);
        else await run('UPDATE contributions SET disputed = 0 WHERE id = ?', c.id);
        if (receiver?.phone) await sendText(receiver.phone, `Good news: the disputed ${dollars(amount)} gift on "${list?.title || 'your list'}" was settled in your favor${before.paid_out ? '. Nothing comes off your next cash-out' : ' and is back in your wallet'}.`, 'dispute');
      }
    }
  }
  return { checked: (res?.data || []).length, changed };
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

export const isOpen = (s) => OPEN.includes(s);
