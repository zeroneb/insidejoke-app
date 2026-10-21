import { db, id, now } from './db';
import { FEE_RATE } from './payments';
import crypto from 'node:crypto';

// Money collected on a list that has not been paid out yet. Only the owner ever sees these numbers.
export function balanceFor(listId) {
  const gross = db().prepare('SELECT COALESCE(SUM(amount_cents),0) AS c FROM contributions WHERE list_id = ?').get(listId).c;
  const paid = db().prepare('SELECT COALESCE(SUM(gross_cents),0) AS c FROM payouts WHERE list_id = ?').get(listId).c;
  const available = Math.max(0, gross - paid);
  const fee = Math.round(available * FEE_RATE);
  return { gross, paid, available, fee, net: available - fee };
}

export function payoutMethod(userId) {
  return db().prepare('SELECT * FROM payout_methods WHERE user_id = ?').get(userId) || null;
}

export function savePayoutMethod(userId, kind, label) {
  db().prepare('INSERT INTO payout_methods (user_id, kind, label, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET kind = excluded.kind, label = excluded.label').run(userId, kind, label, now());
}

// Moves the available balance to the owner's payout method. 5% fee comes off here, never from givers.
// Own list: money moves, list stays open. Collab/surprise lists: the caller archives the list after.
export async function cashOut(list, userId) {
  const m = payoutMethod(userId);
  if (!m) throw new Error('no_payout_method');
  const b = balanceFor(list.id);
  if (b.available <= 0) throw new Error('nothing_to_cash_out');
  let ref = 'test_po_' + crypto.randomBytes(6).toString('hex');
  if (process.env.STRIPE_SECRET_KEY) {
    // go live: Stripe Connect transfer/payout to the owner's connected account.
  }
  const pid = id();
  db().prepare('INSERT INTO payouts (id, list_id, user_id, gross_cents, fee_cents, net_cents, method_label, payout_ref, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(pid, list.id, userId, b.available, b.fee, b.net, m.label, ref, now());
  return { id: pid, ...b, method: m };
}

export function payoutsFor(userId) {
  return db().prepare('SELECT p.*, l.title, l.slug FROM payouts p JOIN lists l ON l.id = p.list_id WHERE p.user_id = ? ORDER BY p.created_at DESC').all(userId);
}
