import { get, all, run, id, now } from './db';
import { FEE_RATE } from './payments';
import crypto from 'node:crypto';
import { stripe, stripeOn } from './stripe';

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

// ---- stripe: Express Connect account for owners (only with STRIPE_SECRET_KEY) ----
// Creates (or reuses) the owner's Express account and returns a Stripe-hosted onboarding link.
// Stripe collects the bank/debit card and identity there; we only keep the account id.
export async function connectOnboardingLink(userId, kind, { returnUrl, refreshUrl }) {
  let m = await payoutMethod(userId);
  let acct = m?.stripe_account_id;
  if (!acct) {
    const u = await get('SELECT id, name, phone FROM users WHERE id = ?', userId);
    const a = await stripe('POST', '/accounts', {
      type: 'express',
      country: 'US',
      business_type: 'individual',
      capabilities: { transfers: { requested: true } },
      business_profile: { product_description: 'Gifts from friends on insidejoke' },
      individual: u?.phone ? { phone: u.phone } : undefined,
      metadata: { user_id: userId }
    }, { idempotencyKey: `acct_${userId}` });
    acct = a.id;
    await run(`INSERT INTO payout_methods (user_id, kind, label, created_at, stripe_account_id, stripe_ready) VALUES (?, ?, ?, ?, ?, 0)
      ON CONFLICT(user_id) DO UPDATE SET stripe_account_id = excluded.stripe_account_id, stripe_ready = 0`,
      userId, kind, m?.label || 'Stripe payouts (finish setup)', now(), acct);
  }
  const link = await stripe('POST', '/account_links', { account: acct, type: 'account_onboarding', return_url: returnUrl, refresh_url: refreshUrl });
  return link.url;
}

// Re-reads the Express account; marks it ready once Stripe can receive transfers, and labels it by its bank/card.
export async function refreshConnectAccount(userId) {
  const m = await payoutMethod(userId);
  if (!m?.stripe_account_id) return m;
  const a = await stripe('GET', `/accounts/${m.stripe_account_id}`);
  const ready = a.capabilities?.transfers === 'active' && a.payouts_enabled ? 1 : 0;
  const ext = a.external_accounts?.data?.[0];
  let kind = m.kind, label = m.label;
  if (ext?.object === 'bank_account') { kind = 'bank'; label = `${ext.bank_name || 'Bank'} ••${ext.last4}`; }
  else if (ext?.object === 'card') { kind = 'card'; label = `Debit card ••${ext.last4}`; }
  else if (ready) label = 'Stripe payouts';
  await run('UPDATE payout_methods SET stripe_ready = ?, kind = ?, label = ? WHERE user_id = ?', ready, kind, label, userId);
  return payoutMethod(userId);
}

// Moves the available balance to the owner's payout method. 5% fee comes off here, never from givers.
// Own list: money moves, list stays open. Collab/surprise lists: the caller archives the list after.
export async function cashOut(list, userId) {
  let m = await payoutMethod(userId);
  if (!m) throw new Error('no_payout_method');
  const b = await balanceFor(list.id);
  if (b.available <= 0) throw new Error('nothing_to_cash_out');
  let ref = 'test_po_' + crypto.randomBytes(6).toString('hex');
  let transferId = null;
  if (stripeOn()) {
    // stripe: the owner needs a finished Express account; otherwise send them back to setup.
    if (!m.stripe_account_id) throw new Error('no_payout_method');
    if (!m.stripe_ready) m = await refreshConnectAccount(userId);
    if (!m.stripe_ready) throw new Error('no_payout_method');
    // Platform keeps the 5% fee: only the net moves. Keyed on the amount already paid so a retry never doubles.
    const t = await stripe('POST', '/transfers', {
      amount: b.net,
      currency: 'usd',
      destination: m.stripe_account_id,
      transfer_group: `list_${list.id}`,
      description: `Cash-out: ${String(list.title || '').slice(0, 200)}`,
      metadata: { list_id: list.id, user_id: userId, gross_cents: b.available, fee_cents: b.fee }
    }, { idempotencyKey: `tr_${list.id}_${b.paid}_${b.available}` });
    ref = transferId = t.id;
  }
  const pid = id();
  await run('INSERT INTO payouts (id, list_id, user_id, gross_cents, fee_cents, net_cents, method_label, payout_ref, created_at, stripe_transfer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    pid, list.id, userId, b.available, b.fee, b.net, m.label, ref, now(), transferId);
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

// ---- r3: Option 10 CashOut is per list. Same oldest-first allocation as walletSummary. ----
const r3plural = (w, n) => (n === 1 ? w : /s$/.test(w) ? w : /(ch|sh|x)$/.test(w) ? w + 'es' : /[^aeiou]y$/.test(w) ? w.slice(0, -1) + 'ies' : w + 's');
const r3noun = (name = '') => {
  const head = name.split(/\s+(?:for|from|with|by|in|×|x\d)\b|,/i)[0] || name;
  const words = head.replace(/[×().]/g, ' ').split(/\s+/).filter((w) => w && !/^\d+$/.test(w));
  return (words.pop() || 'gift').toLowerCase();
};
export async function walletByList(userId) {
  const lists = await all("SELECT * FROM lists WHERE owner_id = ? ORDER BY created_at ASC", userId);
  const out = [];
  for (const l of lists) {
    let paid = (await get('SELECT COALESCE(SUM(gross_cents),0) AS c FROM payouts WHERE list_id = ?', l.id)).c;
    const cs = await all(`SELECT c.*, i.name AS item_name, i.quantity, i.price_cents FROM contributions c
      JOIN items i ON i.id = c.item_id WHERE c.list_id = ? ORDER BY c.created_at ASC`, l.id);
    const wishes = new Map();
    const treats = new Map();
    const givers = new Set();
    let cents = 0, treatCents = 0;
    for (const c of cs) {
      const open = Math.max(0, c.amount_cents - paid);
      paid = Math.max(0, paid - c.amount_cents);
      if (!open) continue;
      cents += open;
      givers.add(c.giver_id);
      if (c.quantity === 0) {
        treatCents += open;
        treats.set(c.item_name, (treats.get(c.item_name) || 0) + Math.max(1, c.units || 1));
      } else {
        const w = wishes.get(c.item_id) || { name: c.item_name, cents: 0, itemId: c.item_id };
        w.cents += open;
        wishes.set(c.item_id, w);
      }
    }
    if (!cents) continue;
    const rows = [];
    for (const w of wishes.values()) {
      const tot = (await get('SELECT COALESCE(SUM(amount_cents),0) AS c FROM contributions WHERE item_id = ?', w.itemId)).c;
      const it = await get('SELECT price_cents, quantity FROM items WHERE id = ?', w.itemId);
      const pct = Math.min(100, Math.floor((tot / Math.max(1, it.price_cents * Math.max(1, it.quantity))) * 100));
      rows.push({ key: w.itemId, name: w.name, sub: pct >= 100 ? 'Wish · fully funded' : `Wish · ${pct}% covered`, cents: w.cents });
    }
    if (treatCents) {
      const bits = [...treats.entries()].sort((a, b) => b[1] - a[1]).map(([name, n]) => `${n} ${r3plural(r3noun(name), n)}`);
      rows.push({ key: l.id + '-treats', name: 'Treats from friends', sub: bits.slice(0, 3).join(', ') + (bits.length > 3 ? ` and ${bits.length - 3} more` : ''), cents: treatCents });
    }
    const members = (await get('SELECT COUNT(*) AS n FROM list_members WHERE list_id = ?', l.id)).n;
    const shared = l.for_who === 'other' || !!l.surprise || members > 0;
    const fee = Math.round(cents * FEE_RATE);
    out.push({ list: l, cents, fee, net: cents - fee, rows, givers: givers.size, shared });
  }
  return out.sort((a, b) => Number(a.shared) - Number(b.shared));
}
