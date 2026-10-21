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

// ---- a3: what is waiting in the wallet, and the history timeline ----
// Payouts are recorded per list as a gross sum, so the oldest gifts count as paid first.
export async function walletSummary(userId) {
  const lists = await all('SELECT * FROM lists WHERE owner_id = ? ORDER BY created_at ASC', userId);
  const rows = [];
  const givers = new Set();
  const perList = [];
  let gross = 0;
  for (const l of lists) {
    const paidRow = await get('SELECT COALESCE(SUM(gross_cents),0) AS c FROM payouts WHERE list_id = ?', l.id);
    let paid = paidRow.c;
    const cs = await all(`SELECT c.*, i.name AS item_name, i.quantity, u.name AS giver_name FROM contributions c
      JOIN items i ON i.id = c.item_id JOIN users u ON u.id = c.giver_id WHERE c.list_id = ? ORDER BY c.created_at ASC`, l.id);
    const wishes = new Map();
    const treats = [];
    let listAvail = 0;
    for (const c of cs) {
      const open = Math.max(0, c.amount_cents - paid);
      paid = Math.max(0, paid - c.amount_cents);
      if (!open) continue;
      listAvail += open;
      givers.add(c.giver_id);
      const who = (c.giver_name || 'A friend').split(/\s+/)[0];
      if (c.quantity === 0) treats.push({ who, item: c.item_name, cents: open });
      else {
        const w = wishes.get(c.item_id) || { name: c.item_name, who: [], cents: 0 };
        if (!w.who.includes(who)) w.who.push(who);
        w.cents += open;
        wishes.set(c.item_id, w);
      }
    }
    if (!listAvail) continue;
    gross += listAvail;
    const members = (await get('SELECT COUNT(*) AS n FROM list_members WHERE list_id = ?', l.id)).n;
    perList.push({ list: l, cents: listAvail, shared: l.for_who === 'other' || !!l.surprise || members > 0 });
    for (const w of wishes.values()) rows.push({ key: l.id + w.name, name: w.name, sub: `Wish on ${l.title} · ${joinNames(w.who)}`, cents: w.cents });
    if (treats.length) {
      const byItem = new Map();
      for (const t of treats) { const g = byItem.get(t.item) || []; if (!g.includes(t.who)) g.push(t.who); byItem.set(t.item, g); }
      const bits = [...byItem.entries()].map(([item, who]) => `${item.toLowerCase()} from ${joinNames(who)}`);
      rows.push({ key: l.id + 'treats', name: 'Treats from friends', sub: `${l.title} · ${bits.slice(0, 2).join('; ')}${bits.length > 2 ? `; and ${bits.length - 2} more` : ''}`, cents: treats.reduce((s, t) => s + t.cents, 0) });
    }
  }
  const fee = Math.round(gross * FEE_RATE);
  return { gross, fee, net: gross - fee, rows, givers: givers.size, lists: perList };
}

function joinNames(a) { return a.length <= 2 ? a.join(' and ') : `${a.slice(0, 2).join(', ')} and ${a.length - 2} more`; }

// Received (gifts on your lists), Given (your gifts on others' lists), Cashed out (payouts). Newest first.
export async function historyFor(userId) {
  const received = await all(`SELECT c.id, c.amount_cents, c.units, c.visibility, c.created_at, c.giver_id, i.name AS item_name, i.quantity, i.store, u.name, u.color, u.seed, u.photo, l.title, l.id AS list_id
    FROM contributions c JOIN items i ON i.id = c.item_id JOIN lists l ON l.id = c.list_id JOIN users u ON u.id = c.giver_id
    WHERE l.owner_id = ? AND c.giver_id <> ? ORDER BY c.created_at DESC`, userId, userId);
  const given = await all(`SELECT c.id, c.amount_cents, c.units, c.visibility, c.created_at, i.name AS item_name, i.quantity, i.store, l.title, l.for_who, l.recipient_name,
      o.id AS owner_id, o.name, o.color, o.seed, o.photo, (SELECT COALESCE(SUM(c2.amount_cents),0) FROM contributions c2 WHERE c2.item_id = c.item_id AND c2.created_at < c.created_at) AS before_cents, i.price_cents
    FROM contributions c JOIN items i ON i.id = c.item_id JOIN lists l ON l.id = c.list_id JOIN users o ON o.id = l.owner_id
    WHERE c.giver_id = ? AND l.owner_id <> ? ORDER BY c.created_at DESC`, userId, userId);
  const payouts = await all('SELECT p.*, l.title FROM payouts p JOIN lists l ON l.id = p.list_id WHERE p.user_id = ? ORDER BY p.created_at DESC', userId);
  return { received, given, payouts };
}
