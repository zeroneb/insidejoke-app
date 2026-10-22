import { get, run, now } from './db';
import crypto from 'node:crypto';
import { stripe, stripeOn, stripeTestKey } from './stripe';

// Payments. Givers never pay a fee: they are charged exactly what they give.
// The 7% fee is taken from the receiver at cash-out (see lib/wallet.js).
// No STRIPE_SECRET_KEY: the charge is simulated (test mode).
// With STRIPE_SECRET_KEY: the giver's card is a Stripe Customer + PaymentMethod, and each gift is an
// off-session PaymentIntent on the platform account (separate charges and transfers to the owner later).
export const FEE_RATE = 0.07;

export async function paymentMethod(userId) {
  return (await get('SELECT * FROM payment_methods WHERE user_id = ?', userId)) || null;
}

const BRANDS = { visa: 'Visa', mastercard: 'Mastercard', amex: 'Amex', discover: 'Discover' };

// stripe: make sure the user has a Customer with an attached PaymentMethod. `pmId` comes from the client
// (Stripe Elements / Apple Pay) in live mode; with a test key we fall back to Stripe's `pm_card_visa`.
async function attachStripeMethod(userId, existing, pmId) {
  const source = pmId && /^pm_/.test(pmId) ? pmId : stripeTestKey() ? 'pm_card_visa' : null;
  if (!source) throw new Error('no_payment_method');
  let customer = existing?.stripe_customer_id;
  if (!customer) {
    const u = await get('SELECT id, name, phone FROM users WHERE id = ?', userId);
    const c = await stripe('POST', '/customers', { name: u?.name || undefined, phone: u?.phone || undefined, metadata: { user_id: userId } }, { idempotencyKey: `cus_${userId}` });
    customer = c.id;
  }
  const pm = await stripe('POST', `/payment_methods/${encodeURIComponent(source)}/attach`, { customer });
  await stripe('POST', `/customers/${customer}`, { invoice_settings: { default_payment_method: pm.id } });
  const card = pm.card;
  const label = card ? `${BRANDS[card.brand] || card.brand} ·· ${card.last4}` : null;
  return { customer, paymentMethodId: pm.id, label };
}

// opts.paymentMethodId: a Stripe pm_… id from the client (live mode).
export async function savePaymentMethod(userId, kind, label, opts = {}) {
  let cus = null, pm = null;
  if (stripeOn()) {
    const s = await attachStripeMethod(userId, await paymentMethod(userId), opts.paymentMethodId);
    cus = s.customer; pm = s.paymentMethodId;
    if (s.label && kind === 'card') label = s.label;
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
    const pi = await stripe('POST', '/payment_intents', {
      amount: amountCents,
      currency: 'usd',
      customer: m.stripe_customer_id,
      payment_method: m.stripe_payment_method_id,
      confirm: true,
      off_session: true,
      description: String(description || '').slice(0, 500),
      metadata: { user_id: userId }
    }, { idempotencyKey: idempotencyKey || `pi_${userId}_${crypto.randomUUID()}` });
    if (pi.status !== 'succeeded') throw new Error('payment_failed');
    return { ok: true, ref: pi.id, paymentIntentId: pi.id, chargeId: pi.latest_charge || null, amountCents, description };
  }
  return { ok: true, ref: 'test_' + crypto.randomBytes(6).toString('hex'), amountCents, description };
}
