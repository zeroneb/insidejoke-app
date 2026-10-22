import { get, run, now } from './db';
import crypto from 'node:crypto';
import { stripe, stripeOn, stripeTestKey } from './stripe';

// Payments. Givers never pay a fee: they are charged exactly what they give.
// The 7% fee is taken from the receiver at cash-out (see lib/wallet.js).
// No STRIPE_SECRET_KEY: the charge is simulated (test mode).
// With STRIPE_SECRET_KEY: the giver's card is a Stripe Customer + PaymentMethod, and each gift is an
// off-session PaymentIntent on the platform account (separate charges and transfers to the owner later).
export const FEE_RATE = 0.07;

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
  const si = await stripe('POST', '/setup_intents', { customer, usage: 'off_session', automatic_payment_methods: { enabled: true, allow_redirects: 'never' }, metadata: { user_id: userId } });
  return si.client_secret;
}

async function attachStripeMethod(userId, existing, pmId) {
  const source = pmId && /^pm_/.test(pmId) ? pmId : stripeTestKey() ? 'pm_card_visa' : null;
  if (!source) throw new Error('no_payment_method');
  const customer = await stripeCustomerFor(userId, existing);
  let pm = /^pm_card_/.test(source) ? null : await stripe('GET', `/payment_methods/${encodeURIComponent(source)}`);
  if (!pm || pm.customer !== customer) pm = await stripe('POST', `/payment_methods/${encodeURIComponent(source)}/attach`, { customer });
  await stripe('POST', `/customers/${customer}`, { invoice_settings: { default_payment_method: pm.id } });
  if (!['card', 'link'].includes(pm.type)) throw new Error('unsupported_payment_method');
  const card = pm.card;
  const wallet = card?.wallet?.type;
  const label = card ? (wallet === 'apple_pay' ? 'Apple Pay' : wallet === 'google_pay' ? 'Google Pay' : `${BRANDS[card.brand] || card.brand} ·· ${card.last4}`) : pm.us_bank_account ? `Bank ·· ${pm.us_bank_account.last4}` : pm.type === 'link' ? 'Link' : null;
  return { customer, paymentMethodId: pm.id, label };
}

// opts.paymentMethodId: a Stripe pm_… id from the client (live mode).
export async function savePaymentMethod(userId, kind, label, opts = {}) {
  let cus = null, pm = null;
  if (stripeOn()) {
    const s = await attachStripeMethod(userId, await paymentMethod(userId), opts.paymentMethodId);
    cus = s.customer; pm = s.paymentMethodId;
    if (s.label) label = s.label;
  }
  await run(`INSERT INTO payment_methods (user_id, kind, label, created_at, stripe_customer_id, stripe_payment_method_id) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET kind = excluded.kind, label = excluded.label,
      stripe_customer_id = COALESCE(excluded.stripe_customer_id, payment_methods.stripe_customer_id),
      stripe_payment_method_id = COALESCE(excluded.stripe_payment_method_id, payment_methods.stripe_payment_method_id)`,
    userId, kind, label, now(), cus, pm);
}

export async function charge(userId, amountCents, description, { idempotencyKey } = {}) {
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
      off_session: true,
      // Saved card or Link, charged without the giver on a Stripe page.
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      description: String(description || '').slice(0, 500),
      metadata: { user_id: userId }
      }, { idempotencyKey: idempotencyKey || `pi_${userId}_${crypto.randomUUID()}` });
    } catch (e) {
      if (e.stripe?.param === 'payment_method' || /PaymentMethod/i.test(e.message)) {
        await run('UPDATE payment_methods SET stripe_payment_method_id = NULL WHERE user_id = ?', userId);
        throw new Error('no_payment_method');
      }
      throw e;
    }
    if (pi.status !== 'succeeded' && pi.status !== 'processing') throw new Error('payment_failed');
    return { ok: true, ref: pi.id, paymentIntentId: pi.id, chargeId: pi.latest_charge || null, amountCents, description };
  }
  return { ok: true, ref: 'test_' + crypto.randomBytes(6).toString('hex'), amountCents, description };
}
