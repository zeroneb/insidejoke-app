import { get, all, run, id, now } from './db';
import { FEE_RATE } from './payments';
import crypto from 'node:crypto';

// Money collected on a list that has not been paid out yet. Only the owner ever sees these numbers.
export async function balanceFor(listId) {
  const gross = (await get('SELECT COALESCE(SUM(amount_cents),0) AS c FROM contributions WHERE list_id = ?', listId)).c;
  const paid = (await get('SELECT COALESCE(SUM(gross_cents),0) AS c FROM payouts WHERE list_id = ?', listId)).c;
  const available = Math.max(0, gross - paid);
  const fee = Math.round(available * FEE_RATE);
  return { gross, paid, available, fee, net: available - fee };
}

export async function payoutMethod(userId) {
  return (await get('SELECT * FROM payout_methods WHERE user_id = ?', userId)) || null;
}

export async function savePayoutMethod(userId, kind, label) {
  await run('INSERT INTO payout_methods (user_id, kind, label, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET kind = excluded.kind, label = excluded.label', userId, kind, label, now());
}

// Moves the available balance to the owner's payout method. 5% fee comes off here, never from givers.
// Own list: money moves, list stays open. Collab/surprise lists: the caller archives the list after.
export async function cashOut(list, userId) {
  const m = await payoutMethod(userId);
  if (!m) throw new Error('no_payout_method');
  const b = await balanceFor(list.id);
  if (b.available <= 0) throw new Error('nothing_to_cash_out');
  let ref = 'test_po_' + crypto.randomBytes(6).toString('hex');
  if (process.env.STRIPE_SECRET_KEY) {
    // go live: Stripe Connect transfer/payout to the owner's connected account.
  }
  const pid = id();
  await run('INSERT INTO payouts (id, list_id, user_id, gross_cents, fee_cents, net_cents, method_label, payout_ref, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    pid, list.id, userId, b.available, b.fee, b.net, m.label, ref, now());
  return { id: pid, ...b, method: m };
}

export async function payoutsFor(userId) {
  return all('SELECT p.*, l.title, l.slug FROM payouts p JOIN lists l ON l.id = p.list_id WHERE p.user_id = ? ORDER BY p.created_at DESC', userId);
}
