import { get, run, now } from './db';
import crypto from 'node:crypto';
import { stripe, stripeOn, stripeTestKey } from './stripe';

// Payments. Givers never pay a fee: they are charged exactly what they give.
// At cash-out the receiver pays: the processing cost of each gift, insidejoke's 5% fee, and a flat
// $2.50 cash-out fee (see cashoutFees below and lib/wallet.js), so a cash-out never costs insidejoke money.
// No STRIPE_SECRET_KEY: the charge is simulated (test mode).
// With STRIPE_SECRET_KEY: the giver's card is a Stripe Customer + PaymentMethod, and each gift is an
// off-session PaymentIntent on the platform account (separate charges and transfers to the owner later).
export const FEE_RATE = 0.05;
// Flat fee per cash-out (cents): covers the payout cost (Stripe's monthly active account + per-payout fee).
export const CASHOUT_FLAT = 250;
// Smallest cash-out (cents). A list that has closed can always be cashed out (if anything is left after fees).
export const MIN_CASHOUT = 2500;
// Card gifts wait this long before they can be cashed out, so a stolen-card dispute arrives while the money is still here.
export const HOLD_MS = 3 * 24 * 60 * 60 * 1000;

// What a gift cost to process (Stripe US standard pricing): bank 0.8% capped at $5, card 2.9% + 30¢.
export function processingCents(cents, method) {
  const c = Math.max(0, Number(cents) || 0);
  if (!c) return 0;
  return method === 'bank' ? Math.min(500, Math.round(c * 0.008)) : Math.round(c * 0.029) + 30;
}

// gifts: [{ cents, method }]. Everything the receiver pays at one cash-out.
export function cashoutFees(gifts) {
  const gross = gifts.reduce((t, g) => t + g.cents, 0);
  const processing = gifts.reduce((t, g) => t + processingCents(g.cents, g.method), 0);
  const platform = Math.round(gross * FEE_RATE);
  const flat = gross ? CASHOUT_FLAT : 0;
  const fee = processing + platform + flat;
  return { gross, processing, platform, flat, fee, net: Math.max(0, gross - fee) };
}

// With Stripe on, a way to pay saved before Stripe (simulated) doesn't count: the first gift asks again.
export async function paymentMethod(userId) {
  const m = (await get('SELECT * FROM payment_methods WHERE user_id = ?', userId)) || null;
  if (m && stripeOn() && !m.stripe_payment_method_id) return null;
  return m;
}

const BRANDS = { visa: 'Visa', mastercard: 'Mastercard', amex: 'Amex', discover: 'Discover' };

// stripe: make sure the user has a Customer with an attached PaymentMethod. `pmId` comes from the client
// (Stripe Elements / Apple Pay) in live mode; with a test key we fall back to Stripe's `pm_card_visa`.
// One Stripe Customer per person, created the first time they save a way to pay.
export async function stripeCustomerFor(userId, existing) {
  const u = await get('SELECT id, name, phone, stripe_customer_id FROM users WHERE id = ?', userId);
  let customer = existing?.stripe_customer_id || u?.stripe_customer_id;
  if (!customer) {
    const c = await stripe('POST', '/customers', { name: u?.name || undefined, phone: u?.phone || undefined, metadata: { user_id: userId } }, { idempotencyKey: `cus_${userId}` });
    customer = c.id;
  }
  if (u && u.stripe_customer_id !== customer) await run('UPDATE users SET stripe_customer_id = ? WHERE id = ?', customer, userId);
  return customer;
}

// The card form (Stripe Payment Element) confirms a SetupIntent in the browser; this makes it.
export async function startCardSetup(userId) {
  const customer = await stripeCustomerFor(userId, await paymentMethod(userId));
  // Which methods show is set in the Stripe Dashboard (Settings → Payment methods); we accept cards and Link.
  const base = { customer, usage: 'off_session', automatic_payment_methods: { enabled: true, allow_redirects: 'never' }, metadata: { user_id: userId } };
  let si;
  // Bank accounts (ACH): verify instantly by logging in to the bank, never by days-long test deposits.
  try { si = await stripe('POST', '/setup_intents', { ...base, payment_method_options: { us_bank_account: { verification_method: 'instant' } } }); }
  catch { si = await stripe('POST', '/setup_intents', base); }
  return si.client_secret;
}

async function attachStripeMethod(userId, existing, pmId) {
  const source = pmId && /^pm_/.test(pmId) ? pmId : stripeTestKey() ? 'pm_card_visa' : null;
  if (!source) throw new Error('no_payment_method');
  const customer = await stripeCustomerFor(userId, existing);
  let pm = /^pm_card_/.test(source) ? null : await stripe('GET', `/payment_methods/${encodeURIComponent(source)}`);
  if (!pm || pm.customer !== customer) pm = await stripe('POST', `/payment_methods/${encodeURIComponent(source)}/attach`, { customer });
  await stripe('POST', `/customers/${customer}`, { invoice_settings: { default_payment_method: pm.id } });
  if (!['card', 'link', 'us_bank_account'].includes(pm.type)) throw new Error('unsupported_payment_method');
  const card = pm.card;
  const wallet = card?.wallet?.type;
  const label = card ? (wallet === 'apple_pay' ? 'Apple Pay' : wallet === 'google_pay' ? 'Google Pay' : `${BRANDS[card.brand] || card.brand} ·· ${card.last4}`) : pm.us_bank_account ? `${pm.us_bank_account.bank_name || 'Bank'} ·· ${pm.us_bank_account.last4}` : pm.type === 'link' ? 'Link' : null;
  return { customer, paymentMethodId: pm.id, label, country: card?.country || null };
}

// opts.paymentMethodId: a Stripe pm_… id from the client (live mode).
export async function savePaymentMethod(userId, kind, label, opts = {}) {
  let cus = null, pm = null, country = null;
  if (stripeOn()) {
    const s = await attachStripeMethod(userId, await paymentMethod(userId), opts.paymentMethodId);
    cus = s.customer; pm = s.paymentMethodId; country = s.country;
    if (s.label) label = s.label;
  }
  await run(`INSERT INTO payment_methods (user_id, kind, label, created_at, stripe_customer_id, stripe_payment_method_id, card_country) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET kind = excluded.kind, label = excluded.label, card_country = excluded.card_country,
      stripe_customer_id = COALESCE(excluded.stripe_customer_id, payment_methods.stripe_customer_id),
      stripe_payment_method_id = COALESCE(excluded.stripe_payment_method_id, payment_methods.stripe_payment_method_id)`,
    userId, kind, label, now(), cus, pm, country);
}

export async function charge(userId, amountCents, description, { idempotencyKey, returnUrl, metadata = {} } = {}) {
  let m = await paymentMethod(userId);
  if (!m) throw new Error('no_payment_method');
  if (stripeOn()) {
    // A method saved in test mode has no Stripe ids yet; with a test key, attach pm_card_visa now.
    if (!m.stripe_payment_method_id || !m.stripe_customer_id) {
      await savePaymentMethod(userId, m.kind, m.label);
      m = await paymentMethod(userId);
    }
    let pi;
    try {
      pi = await stripe('POST', '/payment_intents', {
      amount: amountCents,
      currency: 'usd',
      customer: m.stripe_customer_id,
      payment_method: m.stripe_payment_method_id,
      confirm: true,
      // The giver is on the screen: if the bank wants a check (3-D Secure), we show it instead of failing.
      off_session: false,
      return_url: returnUrl || (process.env.APP_URL || 'https://insidejoke.app') + '/home',
      // Saved card or Link, charged without the giver on a Stripe page.
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      description: String(description || '').slice(0, 500),
      metadata: { ...metadata, user_id: userId }
      }, { idempotencyKey: idempotencyKey || `pi_${userId}_${crypto.randomUUID()}` });
    } catch (e) {
      if (e.stripe?.param === 'payment_method' || /PaymentMethod/i.test(e.message)) {
        await run('UPDATE payment_methods SET stripe_payment_method_id = NULL WHERE user_id = ?', userId);
        throw new Error('no_payment_method');
      }
      throw e;
    }
    if (pi.status === 'requires_action') return { ok: false, requiresAction: true, clientSecret: pi.client_secret, paymentIntentId: pi.id, amountCents };
    if (pi.status !== 'succeeded' && pi.status !== 'processing') throw new Error('payment_failed');
    // Bank payments come back 'processing' and clear in a few business days.
    const pending = pi.status === 'processing';
    return { ok: true, ref: pi.id, paymentIntentId: pi.id, chargeId: pi.latest_charge || null, amountCents, description, pending, method: pending || m.kind === 'bank' ? 'bank' : 'card', country: m.card_country || null };
  }
  return { ok: true, ref: 'test_' + crypto.randomBytes(6).toString('hex'), amountCents, description, method: m.kind === 'bank' ? 'bank' : 'card' };
}

// After the giver finishes the bank's check in the browser: make sure this PaymentIntent really paid, for this person and amount.
export async function confirmedPayment(userId, paymentIntentId, amountCents) {
  if (!stripeOn() || !/^pi_/.test(paymentIntentId || '')) return null;
  const pi = await stripe('GET', `/payment_intents/${encodeURIComponent(paymentIntentId)}`);
  if (pi.metadata?.user_id !== userId || pi.amount !== amountCents || !['succeeded', 'processing'].includes(pi.status)) return null;
  if (await get('SELECT 1 FROM contributions WHERE stripe_payment_intent_id = ?', pi.id)) return null;
  return { ok: true, ref: pi.id, paymentIntentId: pi.id, chargeId: pi.latest_charge || null, amountCents, pending: pi.status === 'processing', method: pi.status === 'processing' ? 'bank' : 'card', country: (await paymentMethod(userId))?.card_country || null };
}

// Bank payments that were still clearing: mark them cleared, or remove them (and tell the giver) if they bounced.
// Runs from the daily job, and before a wallet is shown or cashed out.
export async function settlePendingGifts({ listIds = null } = {}) {
  if (!stripeOn()) return { cleared: 0, failed: 0 };
  const rows = listIds
    ? (listIds.length ? await (await import('./db')).all(`SELECT c.*, i.name AS item_name, l.title AS list_title, l.slug FROM contributions c JOIN items i ON i.id = c.item_id JOIN lists l ON l.id = c.list_id WHERE c.pending = 1 AND c.list_id IN (${listIds.map(() => '?').join(',')})`, ...listIds) : [])
    : await (await import('./db')).all('SELECT c.*, i.name AS item_name, l.title AS list_title, l.slug FROM contributions c JOIN items i ON i.id = c.item_id JOIN lists l ON l.id = c.list_id WHERE c.pending = 1');
  let cleared = 0, failed = 0;
  for (const c of rows) {
    if (!c.stripe_payment_intent_id) { await run('UPDATE contributions SET pending = 0 WHERE id = ?', c.id); continue; }
    let pi;
    try { pi = await stripe('GET', `/payment_intents/${encodeURIComponent(c.stripe_payment_intent_id)}`); } catch { continue; }
    if (pi.status === 'succeeded') { await run('UPDATE contributions SET pending = 0 WHERE id = ?', c.id); cleared++; }
    else if (['requires_payment_method', 'canceled'].includes(pi.status)) {
      await run('DELETE FROM reactions WHERE contribution_id = ?', c.id).catch(() => {});
      await run('DELETE FROM contributions WHERE id = ?', c.id);
      { const { ledger } = await import('./ledger'); const meta = { userId: c.giver_id, listId: c.list_id, contributionId: c.id, giftType: c.gift_type };
        await ledger('gift_removed', c.amount_cents, meta); await ledger('failed_fee', 400, { ...meta, est: 1 }); }
      failed++;
      try {
        const g = await get('SELECT phone FROM users WHERE id = ?', c.giver_id);
        const { sendText, appUrl } = await import('./texts');
        if (g) await sendText(g.phone, `Your bank payment of $${(c.amount_cents / 100).toFixed(2)} toward ${c.item_name} on "${c.list_title}" didn't go through, so the gift was removed. Nothing was charged. You can try again with a card: ${appUrl()}/l/${c.slug}/i/${c.item_id}`, 'gift_failed');
        (await import('./events')).logEvent('pay_fail', { userId: c.giver_id, ref: c.list_id, detail: `bank payment returned: ${pi.last_payment_error?.message || pi.status}` });
      } catch {}
    }
  }
  await settleGifts({ listIds });
  return { cleared, failed };
}

// Real payments only become payable once Stripe has settled them. Records when each gift's money is
// available (Stripe's balance transaction available_on) and what Stripe actually charged for it.
export async function settleGifts({ listIds = null } = {}) {
  if (!stripeOn()) return 0;
  const { all } = await import('./db');
  const where = 'c.stripe_payment_intent_id IS NOT NULL AND c.pending = 0 AND c.available_at IS NULL AND c.paid_out_id IS NULL';
  const rows = listIds
    ? (listIds.length ? await all(`SELECT c.* FROM contributions c WHERE ${where} AND c.list_id IN (${listIds.map(() => '?').join(',')})`, ...listIds) : [])
    : await all(`SELECT c.* FROM contributions c WHERE ${where} LIMIT 200`);
  let n = 0;
  for (const c of rows) {
    let bt;
    try { bt = (await stripe('GET', `/payment_intents/${encodeURIComponent(c.stripe_payment_intent_id)}`, { expand: ['latest_charge.balance_transaction'] }))?.latest_charge?.balance_transaction; } catch { continue; }
    if (!bt || typeof bt !== 'object' || !bt.available_on) continue;
    await run('UPDATE contributions SET available_at = ?, stripe_fee_cents = ? WHERE id = ?', bt.available_on * 1000, bt.fee ?? null, c.id);
    if (bt.fee != null) await (await import('./ledger')).setActualProcessing(c.id, bt.fee);
    n++;
  }
  return n;
}
