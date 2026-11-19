// Money-safety checks (holds, disputes, refunds, webhook) against an in-process fake Stripe and a throwaway PGlite.
// Run from the repo root: node --import ./scripts/fakestripe/loader.mjs scripts/fakestripe/money.mjs
process.on('unhandledRejection', (e) => { console.error('ERR', e.message, e.query || ''); process.exit(2); });
import http from 'node:http';
import crypto from 'node:crypto';

const PORT = 4343;
process.env.PGLITE_DIR = (await import('node:os')).tmpdir() + '/ij-money-' + Date.now();
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.STRIPE_API_BASE = `http://localhost:${PORT}/v1`;
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_other,whsec_test';

// ---------- fake Stripe ----------
const S = { pis: {}, charges: {}, disputes: {}, transfers: [], log: [] };
let n = 0;
const DAY = 86400000;
function addPayment(amount, { type = 'card', ageMs = 0 } = {}) {
  const pi = 'pi_f' + (++n), ch = 'ch_f' + n;
  S.charges[ch] = { id: ch, object: 'charge', payment_intent: pi, amount, status: 'succeeded', paid: true, disputed: false, refunded: false, amount_refunded: 0,
    payment_method_details: { type }, balance_transaction: { id: 'txn_' + n, available_on: Math.floor((Date.now() - ageMs + 2 * DAY) / 1000) - 3 * 86400, fee: Math.round(amount * 0.029) + 30 } };
  S.pis[pi] = { id: pi, object: 'payment_intent', amount, status: 'succeeded', latest_charge: ch };
  return { pi, ch };
}
function dispute(ch, status = 'needs_response') {
  const id = 'dp_f' + (++n); const c = S.charges[ch]; c.disputed = true;
  S.disputes[id] = { id, object: 'dispute', amount: c.amount, charge: ch, payment_intent: c.payment_intent, status, reason: 'fraudulent', created: Math.floor(Date.now() / 1000) };
  return S.disputes[id];
}
function refund(ch, amount) { const c = S.charges[ch]; c.amount_refunded += amount; c.refunded = c.amount_refunded >= c.amount; return { id: 're_f' + (++n), object: 'refund', amount, charge: ch, payment_intent: c.payment_intent, status: 'succeeded' }; }
const server = http.createServer((req, res) => {
  let body = ''; req.on('data', (c) => (body += c)); req.on('end', () => {
    const url = new URL(req.url, 'http://x'); const u = url.pathname; S.log.push(req.method + ' ' + u);
    const send = (code, j) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(j)); };
    const expand = [...url.searchParams.entries()].filter(([k]) => k.startsWith('expand')).map(([, v]) => v);
    let m;
    if ((m = /^\/v1\/payment_intents\/([^/]+)$/.exec(u))) {
      const pi = S.pis[m[1]]; if (!pi) return send(404, { error: { message: 'No such payment_intent' } });
      const out = { ...pi };
      if (expand.includes('latest_charge')) out.latest_charge = { ...S.charges[pi.latest_charge], balance_transaction: S.charges[pi.latest_charge].balance_transaction.id };
      if (expand.includes('latest_charge.balance_transaction')) out.latest_charge = { ...S.charges[pi.latest_charge] };
      return send(200, out);
    }
    if ((m = /^\/v1\/charges\/([^/]+)$/.exec(u))) return S.charges[m[1]] ? send(200, { ...S.charges[m[1]], balance_transaction: 'txn' }) : send(404, { error: { message: 'No such charge' } });
    if ((m = /^\/v1\/disputes\/([^/]+)$/.exec(u))) return S.disputes[m[1]] ? send(200, S.disputes[m[1]]) : send(404, { error: { message: 'No such dispute' } });
    if (u === '/v1/disputes') { const pi = url.searchParams.get('payment_intent'); return send(200, { data: Object.values(S.disputes).filter((d) => !pi || d.payment_intent === pi) }); }
    if (u === '/v1/transfers' && req.method === 'POST') { const p = new URLSearchParams(body); const t = { id: 'tr_f' + (++n), amount: +p.get('amount'), source_transaction: p.get('source_transaction'), contribution: p.get('metadata[contribution_id]') }; S.transfers.push(t); return send(200, t); }
    if (/^\/v2\/core\/accounts\//.test(u)) return send(200, { id: 'acct_f', configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { status: 'active' } } } } }, requirements: { entries: [] } });
    if (/^\/v1\/accounts\//.test(u)) return send(200, { id: 'acct_f', capabilities: { transfers: 'active' }, external_accounts: { data: [{ object: 'bank_account', bank_name: 'Chase', last4: '6789' }] } });
    send(404, { error: { message: 'fake: no route ' + u } });
  });
});
await new Promise((r) => server.listen(PORT, r));

// ---------- app ----------
const { get, all, run, id, now } = await import('@/lib/db');
const wallet = await import('@/lib/wallet');
const disputes = await import('@/lib/disputes');
const { POST } = await import('@/app/api/stripe/webhook/route.js');
const fin = await import('@/lib/finance');

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? '  PASS ' : '  FAIL ') + msg); if (!cond) fails++; };
const sign = (payload, secret = 'whsec_test', t = Math.floor(Date.now() / 1000)) => `t=${t},v1=${crypto.createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex')}`;
let ev = 0;
async function hook(type, object, { secret, sig, idOverride, livemode = false } = {}) {
  const payload = JSON.stringify({ id: idOverride || 'evt_' + (++ev), object: 'event', type, livemode, data: { object } });
  const r = await POST(new Request('http://x/api/stripe/webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': sig || sign(payload, secret) } }));
  return { status: r.status, body: await r.json() };
}

await get('SELECT 1'); // migrations
const owner = id(), giver = id();
await run('INSERT INTO users (id, phone, name, color, seed, created_at) VALUES (?, ?, ?, ?, ?, ?)', owner, '+14155550101', 'Robin Owner', '#B36EE0', 1, now() - 30 * DAY);
await run('INSERT INTO users (id, phone, name, color, seed, created_at) VALUES (?, ?, ?, ?, ?, ?)', giver, '+14155550102', 'Ari Giver', '#B36EE0', 2, now() - 30 * DAY);
await run('INSERT INTO payout_methods (user_id, kind, label, created_at, stripe_account_id, stripe_ready) VALUES (?, ?, ?, ?, ?, 1)', owner, 'bank', 'Chase ••6789', now(), 'acct_f');
let lc = 0;
async function newList() {
  const lid = id(), iid = id();
  await run("INSERT INTO lists (id, owner_id, title, slug, status, created_at) VALUES (?, ?, ?, ?, 'open', ?)", lid, owner, 'Test list ' + (++lc), 'test-' + lc + '-' + lid.slice(0, 4), now() - 20 * DAY);
  await run('INSERT INTO items (id, list_id, name, price_cents, quantity, color, created_at) VALUES (?, ?, ?, ?, 0, ?, ?)', iid, lid, 'Coffee', 500, '#D8F75A', now() - 20 * DAY);
  return { lid, iid, list: await get('SELECT * FROM lists WHERE id = ?', lid) };
}
async function gift(L, amount, { ageMs = 4 * DAY, method = 'card', type = 'card', piInRefOnly = false } = {}) {
  const { pi, ch } = addPayment(amount, { type, ageMs });
  const cid = id(); const at = now() - ageMs;
  await run('INSERT INTO contributions (id, item_id, list_id, giver_id, amount_cents, units, visibility, payment_ref, created_at, stripe_payment_intent_id, pending, method, gift_type, available_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 0, ?, ?, ?)',
    cid, L.iid, L.lid, giver, amount, 'public', pi, at, piInRefOnly ? null : pi, method, 'treat', at + 2 * DAY);
  return { cid, pi, ch };
}
const tryCash = async (L) => { try { return { r: await wallet.cashOut(L.list, owner) }; } catch (e) { return { err: e.message }; } };
const debt = async () => Number((await get('SELECT debt_cents FROM users WHERE id = ?', owner)).debt_cents);

console.log('1. Card gift under 3 days is held');
{ const L = await newList(); await gift(L, 3000, { ageMs: 3600e3 });
  const b = await wallet.balanceFor(L.lid); ok(b.available === 0 && b.holding === 3000, `held: available ${b.available}, holding ${b.holding}`);
  const t0 = S.transfers.length; const x = await tryCash(L); ok(x.err === 'nothing_to_cash_out' && S.transfers.length === t0, `cash-out refused (${x.err}), no transfer`); }

console.log('2. Card/Apple Pay saved as "bank" no longer skips the hold');
{ const L = await newList(); const g = await gift(L, 3000, { ageMs: 2.5 * DAY, method: 'bank', type: 'card' });
  ok((await wallet.balanceFor(L.lid)).available === 3000, 'before: looks ready (stored as bank, settled)');
  const t0 = S.transfers.length; const x = await tryCash(L);
  const row = await get('SELECT method FROM contributions WHERE id = ?', g.cid);
  ok(x.err === 'nothing_to_cash_out' && S.transfers.length === t0 && row.method === 'card', `refused (${x.err}), method now ${row.method}`); }

console.log('3. Split gift with the PaymentIntent only in payment_ref is still held');
{ const L = await newList(); await gift(L, 3000, { ageMs: 3600e3, piInRefOnly: true });
  const b = await wallet.balanceFor(L.lid); ok(b.available === 0 && b.holding === 3000, `held: available ${b.available}, holding ${b.holding}`); }

console.log('4. Dispute opened in Stripe before cash-out, webhook never arrived: blocked');
{ const L = await newList(); const g = await gift(L, 3000); dispute(g.ch);
  const t0 = S.transfers.length; const x = await tryCash(L);
  const row = await get('SELECT disputed FROM contributions WHERE id = ?', g.cid);
  ok(x.err === 'dispute_open' && S.transfers.length === t0 && row.disputed === 1, `refused (${x.err}), gift disputed=${row.disputed}, no transfer`);
  const b = await wallet.balanceFor(L.lid); ok(b.available === 0, `wallet shows ${b.available}`);
  // won: back in the wallet
  const d = Object.values(S.disputes).find((x) => x.charge === g.ch); d.status = 'won';
  const h = await hook('charge.dispute.closed', d); ok(h.status === 200, `webhook won -> ${h.status}`);
  ok((await wallet.balanceFor(L.lid)).available === 3000, 'won: gift back in the wallet');
  const y = await tryCash(L); ok(!!y.r && S.transfers.length === t0 + 1, `cash-out after won: ${y.err || 'sent ' + y.r.net}`); }

console.log('5. Dispute via webhook before cash-out: wallet drops at once');
{ const L = await newList(); const g = await gift(L, 3000);
  const d = dispute(g.ch); const h = await hook('charge.dispute.created', d);
  ok(h.status === 200 && h.body.changed, `webhook ${h.status} ${JSON.stringify(h.body)}`);
  ok((await wallet.balanceFor(L.lid)).available === 0, 'wallet 0');
  const dup = await hook('charge.dispute.created', d, { idOverride: 'evt_dup' }); const dup2 = await hook('charge.dispute.created', d, { idOverride: 'evt_dup' });
  ok(dup2.body.duplicate === true, 'same event twice: second is a duplicate');
  ok(Number((await get("SELECT COUNT(*) AS n FROM ledger WHERE kind = 'gift_removed' AND contribution_id = ?", g.cid)).n) === 1, 'gift removed once in the ledger');
  d.status = 'lost'; await hook('charge.dispute.closed', d); }

console.log('6. Dispute after cash-out: owed back, shown to admin, recovered from the next cash-out');
{ const L = await newList(); const g = await gift(L, 3000);
  const x = await tryCash(L); ok(!!x.r, `cashed out ${x.r?.net}`);
  const d0 = await debt();
  const d = dispute(g.ch); const h = await hook('charge.dispute.created', d); ok(h.status === 200, 'webhook 200');
  ok(await debt() === d0 + 3000, `debt ${await debt()}`);
  const ad = await disputes.debtsForAdmin(); ok(ad.some((r) => r.id === owner && Number(r.debt_cents) === d0 + 3000), 'listed in admin negative balances');
  const f = await fin.financials(); ok(f.debts.cents >= 3000, `admin money view: owed back ${f.debts.cents}`);
  d.status = 'lost'; await hook('charge.dispute.closed', d);
  await gift(L, 10000); const y = await tryCash(L);
  ok(!!y.r && y.r.recovered === Math.min(d0 + 3000, y.r.recovered + y.r.net) && y.r.recovered > 0, `next cash-out recovered ${y.r?.recovered}, paid ${y.r?.net}`);
  ok(await debt() === d0 + 3000 - y.r.recovered, `debt now ${await debt()}`); }

console.log('7. Refund before cash-out (webhook): removed from the wallet');
{ const L = await newList(); const g = await gift(L, 3000); await hook('charge.refunded', { ...S.charges[g.ch] }) ; // no change yet
  const r = refund(g.ch, 3000); const h = await hook('charge.refunded', { ...S.charges[g.ch] });
  ok(h.status === 200 && h.body.changed, `webhook ${h.status}`);
  ok((await wallet.balanceFor(L.lid)).available === 0, 'wallet 0');
  const x = await tryCash(L); ok(x.err === 'nothing_to_cash_out', `cash-out: ${x.err}`); }

console.log('8. Partial refund, no webhook: cash-out check catches it and pays only the rest');
{ const L = await newList(); const g = await gift(L, 4000); refund(g.ch, 1500);
  const t0 = S.transfers.length; const x = await tryCash(L);
  ok(!!x.r && x.r.available === 2500, `cashed out gross ${x.r?.available} (expected 2500)`);
  ok(S.transfers.slice(t0).reduce((t, z) => t + z.amount, 0) === x.r.net, 'transfers match net'); }

console.log('9. Refund after cash-out (refund.created event): owed back');
{ const L = await newList(); const g = await gift(L, 3000); const d0 = await debt();
  const x = await tryCash(L); ok(!!x.r, 'cashed out');
  const rf = refund(g.ch, 3000); const h = await hook('refund.created', rf);
  ok(h.status === 200 && h.body.changed, `webhook ${h.status} ${JSON.stringify(h.body)}`);
  ok(await debt() === d0 + 3000, `debt ${await debt()}`);
  ok(!!(await get("SELECT 1 FROM ledger WHERE kind = 'refund_loss' AND contribution_id = ?", g.cid)), 'refund_loss in ledger'); }

console.log('10. Webhook safety');
{ const payload = JSON.stringify({ id: 'evt_bad', type: 'charge.dispute.created', data: { object: {} } });
  let r = await POST(new Request('http://x', { method: 'POST', body: payload, headers: { 'stripe-signature': sign(payload, 'whsec_wrong') } })); ok(r.status === 400, `wrong secret -> ${r.status}`);
  r = await POST(new Request('http://x', { method: 'POST', body: payload, headers: { 'stripe-signature': sign(payload, 'whsec_test', Math.floor(Date.now() / 1000) - 3600) } })); ok(r.status === 400, `old timestamp -> ${r.status}`);
  r = await POST(new Request('http://x', { method: 'POST', body: payload })); ok(r.status === 400, `no signature -> ${r.status}`);
  const other = await hook('charge.dispute.created', { id: 'dp_x', payment_intent: 'pi_unknown', status: 'needs_response', amount: 100 }, { secret: 'whsec_other' }); ok(other.status === 200, `second secret accepted, unknown gift ignored (${other.status})`);
  const live = await hook('charge.dispute.created', { id: 'dp_y' }, { livemode: true }); ok(live.body.ignored === 'mode', 'live event on test key ignored');
  const boom = await hook('refund.created', { id: 're_x', object: 'refund', charge: 'ch_missing' }, { idOverride: 'evt_boom' });
  const row = await get("SELECT processed_at, error FROM stripe_events WHERE id = 'evt_boom'");
  ok(boom.status === 500 && !row.processed_at && !!row.error, `handler error -> ${boom.status}, kept: ${row.error}`);
  const sec = process.env.STRIPE_WEBHOOK_SECRET; process.env.STRIPE_WEBHOOK_SECRET = '';
  r = await POST(new Request('http://x', { method: 'POST', body: payload })); ok(r.status === 503, `no secret configured -> ${r.status}`); process.env.STRIPE_WEBHOOK_SECRET = sec; }

console.log('11. Stripe unreachable at cash-out: nothing sent');
{ const L = await newList(); await gift(L, 3000); const base = process.env.STRIPE_API_BASE;
  const pi = Object.keys(S.pis).pop(); const saved = S.pis[pi]; delete S.pis[pi];
  const t0 = S.transfers.length; const x = await tryCash(L); ok(!!x.err && S.transfers.length === t0, `refused (${x.err}), no transfer`); S.pis[pi] = saved; }

console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED');
server.close(); process.exit(fails ? 1 : 0);
