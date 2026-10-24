import { get, all, run, id, now } from './db';
import { FEE_RATE, HOLD_MS, cashoutFees } from './payments';
import crypto from 'node:crypto';
import { stripe, stripeOn, stripeV2 } from './stripe';

// Cash-out rule (option 3): money on treats and on fully covered wishes can be cashed out anytime.
// Money on wishes still filling waits until each is covered, or until the list closes
// (its date has passed, or the owner closes / archives it). Only the owner ever sees these numbers.
export function listClosed(list) {
  if (!list) return false;
  if (list.status === 'archived') return true;
  if (list.date && /^\d{4}-\d{2}-\d{2}$/.test(list.date)) return new Date(list.date + 'T23:59:59') < new Date();
  return false;
}

// Older payouts were recorded only as a sum per list: mark the oldest gifts as paid to match, once.
async function backfillPaid(listId) {
  const paid = Number((await get('SELECT COALESCE(SUM(gross_cents),0) AS c FROM payouts WHERE list_id = ?', listId)).c);
  if (!paid) return;
  const marked = Number((await get('SELECT COALESCE(SUM(amount_cents),0) AS c FROM contributions WHERE list_id = ? AND paid_out_id IS NOT NULL', listId)).c);
  if (marked >= paid) return;
  let left = paid - marked;
  for (const c of await all('SELECT id, amount_cents FROM contributions WHERE list_id = ? AND paid_out_id IS NULL ORDER BY created_at ASC', listId)) {
    if (left <= 0) break;
    await run("UPDATE contributions SET paid_out_id = 'legacy' WHERE id = ?", c.id);
    left -= c.amount_cents;
  }
}

// Every unpaid gift on a list, each marked ready (can cash out now) or waiting.
export async function unpaidGifts(listId) {
  await backfillPaid(listId);
  const list = await get('SELECT * FROM lists WHERE id = ?', listId);
  const closed = listClosed(list);
  const cs = await all(`SELECT c.*, i.name AS item_name, i.quantity, i.price_cents,
      (SELECT COALESCE(SUM(c2.amount_cents),0) FROM contributions c2 WHERE c2.item_id = c.item_id) AS item_raised
    FROM contributions c JOIN items i ON i.id = c.item_id WHERE c.list_id = ? AND c.paid_out_id IS NULL ORDER BY c.created_at ASC`, listId);
  const t = Date.now();
  return cs.map((c) => {
    const treat = c.quantity === 0;
    const covered = !treat && Number(c.item_raised) >= c.price_cents * Math.max(1, c.quantity);
    const unlocked = !c.pending && (treat || covered || closed || !!c.released);
    // Real card gifts wait 3 days after they're given (bank gifts already wait to clear).
    const holdUntil = c.stripe_payment_intent_id && c.method !== 'bank' ? Number(c.created_at) + HOLD_MS : 0;
    const held = unlocked && holdUntil > t;
    return { ...c, treat, covered, clearing: !!c.pending, held, holdUntil: held ? holdUntil : 0, ready: unlocked && !held };
  });
}

// Fees on the gifts being cashed out (see cashoutFees in lib/payments.js).
export function feesOn(gifts) {
  return cashoutFees(gifts.map((g) => ({ cents: g.amount_cents, method: g.method })));
}

export async function balanceFor(listId) {
  const gifts = await unpaidGifts(listId);
  const ready = gifts.filter((g) => g.ready);
  const available = ready.reduce((t, g) => t + g.amount_cents, 0);
  const waiting = gifts.filter((g) => !g.ready && !g.held).reduce((t, g) => t + g.amount_cents, 0);
  const waitingWishes = new Set(gifts.filter((g) => !g.ready && !g.held).map((g) => g.item_id)).size;
  const heldGifts = gifts.filter((g) => g.held);
  const holding = heldGifts.reduce((t, g) => t + g.amount_cents, 0);
  const holdUntil = heldGifts.length ? Math.min(...heldGifts.map((g) => g.holdUntil)) : 0;
  const paid = Number((await get('SELECT COALESCE(SUM(gross_cents),0) AS c FROM payouts WHERE list_id = ?', listId)).c);
  const f = feesOn(ready);
  return { paid, available, waiting, waitingWishes, holding, holdUntil, fee: f.fee, processing: f.processing, platform: f.platform, flat: f.flat, net: f.net };
}

export async function payoutMethod(userId) {
  const m = (await get('SELECT * FROM payout_methods WHERE user_id = ?', userId)) || null;
  // With real payouts on, a bank only counts once it's linked through the payout provider
  // (old test-mode or pre-Stripe banks are ignored, so the wallet asks to link a bank).
  if (m && stripeOn() && !m.stripe_account_id) return null;
  return m;
}

export async function savePayoutMethod(userId, kind, label) {
  await run('INSERT INTO payout_methods (user_id, kind, label, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET kind = excluded.kind, label = excluded.label', userId, kind, label, now());
}

// ---- stripe: Express Connect account for owners (only with STRIPE_SECRET_KEY) ----
// Creates (or reuses) the owner's Express account and returns a Stripe-hosted onboarding link.
// Stripe collects the bank/debit card and identity there; we only keep the account id.
// What Stripe's "Business information" step asks for. People cashing out gifts aren't businesses,
// so we answer it for them: a link to their insidejoke profile and a plain description.
function payoutProfile(userId) {
  const base = (process.env.APP_URL || 'https://insidejoke-app.vercel.app').replace(/\/$/, '');
  return { business_url: `${base}/u/${userId}`, product_description: 'Personal gifts from friends and family, collected on an insidejoke wishlist.' };
}

export async function connectOnboardingLink(userId, kind, { returnUrl, refreshUrl, email }) {
  let m = await payoutMethod(userId);
  let acct = m?.stripe_account_id;
  if (!acct) {
    const u = await get('SELECT id, name, phone FROM users WHERE id = ?', userId);
    // Accounts v2: a recipient that can receive transfers, with Stripe's Express dashboard; the platform covers fees and losses.
    const body = (withProfile) => ({
      contact_email: email,
      display_name: u?.name || undefined,
      dashboard: 'express',
      identity: { country: 'us', entity_type: 'individual' },
      configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } } },
      defaults: { currency: 'usd', responsibilities: { fees_collector: 'application', losses_collector: 'application' }, ...(withProfile ? { profile: payoutProfile(userId) } : {}) },
      metadata: { user_id: userId }
    });
    let a;
    try { a = await stripeV2('POST', '/core/accounts', body(true), { idempotencyKey: `acct3_${userId}_${email}` }); }
    catch (e) { if (!/profile|url|description/i.test(e.message || '')) throw e; a = await stripeV2('POST', '/core/accounts', body(false), { idempotencyKey: `acct2_${userId}_${email}` }); }
    acct = a.id;
    await run(`INSERT INTO payout_methods (user_id, kind, label, created_at, stripe_account_id, stripe_ready) VALUES (?, ?, ?, ?, ?, 0)
      ON CONFLICT(user_id) DO UPDATE SET stripe_account_id = excluded.stripe_account_id, stripe_ready = 0`,
      userId, kind, m?.label || 'Stripe payouts (finish setup)', now(), acct);
  }
  else {
    // Accounts made before the pre-fill: add it now so onboarding skips "Business information". Best effort.
    try { await stripeV2('POST', `/core/accounts/${acct}`, { defaults: { profile: payoutProfile(userId) } }); } catch {}
  }
  try { await stripe('POST', `/accounts/${acct}`, { business_profile: { mcc: '7299', product_description: payoutProfile(userId).product_description, url: payoutProfile(userId).business_url } }); } catch {}
  const link = await stripe('POST', '/account_links', { account: acct, type: 'account_onboarding', return_url: returnUrl, refresh_url: refreshUrl });
  return link.url;
}

// Re-reads the Express account; marks it ready once Stripe can receive transfers, and labels it by its bank/card.
export async function refreshConnectAccount(userId) {
  const m = await payoutMethod(userId);
  if (!m?.stripe_account_id) return m;
  // Transfers are what cash-out needs. Accounts v2 reports it under the recipient configuration.
  let ready = 0, status = 'unknown';
  try {
    const a2 = await stripeV2('GET', `/core/accounts/${m.stripe_account_id}?include=configuration.recipient&include=requirements`);
    status = a2?.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status || 'missing';
    ready = status === 'active' ? 1 : 0;
  } catch (e) { status = /no such|not found|resource_missing/i.test(e.message || '') ? 'unknown' : 'error: ' + (e.message || '').slice(0, 160); }
  let a = {};
  try { a = await stripe('GET', `/accounts/${m.stripe_account_id}`); } catch {}
  if (status === 'unknown') ready = a.capabilities?.transfers === 'active' ? 1 : 0;
  const ext = a.external_accounts?.data?.[0];
  let kind = m.kind, label = m.label;
  if (ext?.object === 'bank_account') { kind = 'bank'; label = `${ext.bank_name || 'Bank'} ••${ext.last4}`; }
  else if (ext?.object === 'card') { kind = 'card'; label = `Debit card ••${ext.last4}`; }
  else if (ready) label = 'Stripe payouts';
  await run('UPDATE payout_methods SET stripe_ready = ?, kind = ?, label = ?, stripe_status = ? WHERE user_id = ?', ready, kind, label, status, userId);
  return { ...(await payoutMethod(userId)), transferStatus: status };
}

// Moves the available balance to the owner's payout method. Fees come off here (see cashoutFees), never from givers.
// Own list: money moves, list stays open. Collab/surprise lists: the caller archives the list after.
export async function cashOut(list, userId) {
  try { await (await import('./payments')).settlePendingGifts({ listIds: [list.id] }); } catch {}
  let m = await payoutMethod(userId);
  if (!m) throw new Error('no_payout_method');
  const b = await balanceFor(list.id);
  if (b.available <= 0) throw new Error('nothing_to_cash_out');
  if (b.net <= 0) throw new Error('too_small_after_fees');
  let ref = 'test_po_' + crypto.randomBytes(6).toString('hex');
  let transferId = null;
  if (stripeOn()) {
    // stripe: the owner needs a finished Express account; otherwise send them back to setup.
    if (!m.stripe_account_id) throw new Error('no_payout_method');
    m = await refreshConnectAccount(userId);
    // 'pending' = Stripe is still checking; anything else means setup isn't finished, so go finish it.
    if (!m.stripe_ready) throw new Error(m.transferStatus === 'pending' || /^error/.test(m.transferStatus || '') ? 'payout_not_ready' : 'no_payout_method');
    // Platform keeps the fees: only the net moves, split across the gifts in proportion. One transfer per gift,
    // tied to that gift's charge (source_transaction), so it can go out before the charge settles in our balance.
    const parts = (await unpaidGifts(list.id)).filter((g) => g.ready).map((g) => ({ id: g.id, open: g.amount_cents, pi: g.stripe_payment_intent_id || null, simulated: !g.stripe_payment_intent_id && /^test_/.test(g.payment_ref || '') }));
    let left = b.net, ids = [];
    for (let i = 0; i < parts.length; i++) {
      const g = parts[i];
      const amt = i === parts.length - 1 ? left : Math.min(left, Math.floor(g.open * b.net / b.available));
      if (amt <= 0) continue;
      left -= amt;
      if (g.simulated) continue; // made before Stripe was connected: no real money behind it
      let source;
      if (g.pi) { try { source = (await stripe('GET', `/payment_intents/${g.pi}`)).latest_charge || undefined; } catch {} }
      let t;
      try { t = await stripe('POST', '/transfers', {
        amount: amt,
        currency: 'usd',
        destination: m.stripe_account_id,
        source_transaction: source,
        transfer_group: `list_${list.id}`,
        description: `Cash-out: ${String(list.title || '').slice(0, 200)}`,
        metadata: { list_id: list.id, user_id: userId, contribution_id: g.id }
      }, { idempotencyKey: `tr_${g.id}_${m.transfer_try || 0}` }); }
      catch (e) {
        if (/capabilit/i.test(e.message || '') && !ids.length) {
          // Stripe hasn't switched on transfers for this account yet. Nothing was sent; next try uses a fresh key.
          await run('UPDATE payout_methods SET stripe_ready = 0, transfer_try = COALESCE(transfer_try,0) + 1 WHERE user_id = ?', userId);
          throw new Error('payout_not_ready');
        }
        throw e;
      }
      ids.push(t.id);
    }
    ref = transferId = ids.join(',') || null;
  }
  const pid = id();
  await run('INSERT INTO payouts (id, list_id, user_id, gross_cents, fee_cents, net_cents, method_label, payout_ref, created_at, stripe_transfer_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    pid, list.id, userId, b.available, b.fee, b.net, m.label, ref, now(), transferId);
  for (const g of (await unpaidGifts(list.id)).filter((x) => x.ready)) await run('UPDATE contributions SET paid_out_id = ? WHERE id = ?', pid, g.id);
  return { id: pid, ...b, method: m };
}

// Gifts on a list not yet paid out (oldest count as paid first), with their Stripe PaymentIntent.
async function openGifts(listId, paid) {
  const cs = await all('SELECT id, amount_cents, stripe_payment_intent_id, payment_ref FROM contributions WHERE list_id = ? ORDER BY created_at ASC', listId);
  const out = [];
  for (const c of cs) {
    const open = Math.max(0, c.amount_cents - paid);
    paid = Math.max(0, paid - c.amount_cents);
    if (open) out.push({ id: c.id, open, pi: c.stripe_payment_intent_id || null, simulated: !c.stripe_payment_intent_id && /^test_/.test(c.payment_ref || '') });
  }
  return out;
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
  // Rough total (the exact fees are shown per list at cash-out): 5% + processing at card rates + one cash-out fee per list.
  const fee = Math.round(gross * FEE_RATE) + Math.round(gross * 0.029) + perList.length * (30 + 250);
  return { gross, fee, net: Math.max(0, gross - fee), rows, givers: givers.size, lists: perList };
}

function joinNames(a) { return a.length <= 2 ? a.join(' and ') : `${a.slice(0, 2).join(', ')} and ${a.length - 2} more`; }

// Received (gifts on your lists), Given (your gifts on others' lists), Cashed out (payouts). Newest first.
export async function historyFor(userId) {
  const received = await all(`SELECT c.id, c.amount_cents, c.units, c.visibility, c.created_at, c.giver_id, i.name AS item_name, i.quantity, i.store, u.name, u.color, u.seed, u.photo, l.title, l.id AS list_id
    FROM contributions c JOIN items i ON i.id = c.item_id JOIN lists l ON l.id = c.list_id JOIN users u ON u.id = c.giver_id
    WHERE l.owner_id = ? ORDER BY c.created_at DESC`, userId);
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
  const lists = await all("SELECT * FROM lists WHERE owner_id = ? AND status <> 'deleted' ORDER BY created_at ASC", userId);
  const out = [];
  for (const l of lists) {
    const gifts = await unpaidGifts(l.id);
    const ready = gifts.filter((g) => g.ready);
    const waitingGifts = gifts.filter((g) => !g.ready && !g.held);
    const waiting = waitingGifts.reduce((t, g) => t + g.amount_cents, 0);
    const heldGifts = gifts.filter((g) => g.held);
    const holding = heldGifts.reduce((t, g) => t + g.amount_cents, 0);
    const holdUntil = heldGifts.length ? Math.min(...heldGifts.map((g) => g.holdUntil)) : 0;
    const wishes = new Map();
    const treats = new Map();
    const givers = new Set();
    let cents = 0, treatCents = 0;
    for (const c of ready) {
      cents += c.amount_cents;
      givers.add(c.giver_id);
      if (c.treat) {
        treatCents += c.amount_cents;
        treats.set(c.item_name, (treats.get(c.item_name) || 0) + Math.max(1, c.units || 1));
      } else {
        const w = wishes.get(c.item_id) || { name: c.item_name, cents: 0, itemId: c.item_id, covered: c.covered };
        w.cents += c.amount_cents;
        wishes.set(c.item_id, w);
      }
    }
    const paid = Number((await get('SELECT COALESCE(SUM(gross_cents),0) AS c FROM payouts WHERE list_id = ?', l.id)).c);
    const rows = [];
    for (const w of wishes.values()) {
      const it = await get('SELECT price_cents, quantity FROM items WHERE id = ?', w.itemId);
      const tot = (await get('SELECT COALESCE(SUM(amount_cents),0) AS c FROM contributions WHERE item_id = ?', w.itemId)).c;
      const pct = Math.min(100, Math.floor((tot / Math.max(1, it.price_cents * Math.max(1, it.quantity))) * 100));
      rows.push({ key: w.itemId, name: w.name, sub: pct >= 100 ? 'Wish · fully funded' : `Wish · ${pct}% covered · list closed`, cents: w.cents });
    }
    if (treatCents) {
      const bits = [...treats.entries()].sort((a, b) => b[1] - a[1]).map(([name, n]) => `${n} ${r3plural(r3noun(name), n)}`);
      rows.push({ key: l.id + '-treats', name: 'Treats from friends', sub: bits.slice(0, 3).join(', ') + (bits.length > 3 ? ` and ${bits.length - 3} more` : ''), cents: treatCents });
    }
    const members = (await get('SELECT COUNT(*) AS n FROM list_members WHERE list_id = ?', l.id)).n;
    const shared = l.for_who === 'other' || !!l.surprise || members > 0;
    const f = feesOn(ready);
    const clearing = waitingGifts.filter((g) => g.clearing).reduce((t, g) => t + g.amount_cents, 0);
    out.push({ list: l, paid, clearing, cents, fee: f.fee, processing: f.processing, platform: f.platform, flat: f.flat, net: f.net, holding, holdUntil, rows, givers: givers.size, shared, waiting, waitingWishes: new Set(waitingGifts.map((g) => g.item_id)).size, waitingItems: [...new Map(waitingGifts.map((g) => [g.item_id, { id: g.item_id, name: g.item_name, raised: Number(g.item_raised), goal: Number(g.price_cents || 0) * Number(g.quantity || 1) }])).values()], closed: listClosed(l) });
  }
  return out.sort((a, b) => Number(a.shared) - Number(b.shared));
}
