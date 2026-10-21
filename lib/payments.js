import { db, now } from './db';
import crypto from 'node:crypto';

// Payments. Givers never pay a fee: they are charged exactly what they give.
// The 5% fee is taken from the receiver at cash-out (phase 2).
// Test mode simulates the charge. With STRIPE_SECRET_KEY set, this is where a
// Stripe PaymentIntent on a Connect destination account is created.
export const FEE_RATE = 0.05;

export function paymentMethod(userId) {
  return db().prepare('SELECT * FROM payment_methods WHERE user_id = ?').get(userId) || null;
}

export function savePaymentMethod(userId, kind, label) {
  db().prepare('INSERT INTO payment_methods (user_id, kind, label, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET kind = excluded.kind, label = excluded.label').run(userId, kind, label, now());
}

export async function charge(userId, amountCents, description) {
  if (!paymentMethod(userId)) throw new Error('no_payment_method');
  if (process.env.STRIPE_SECRET_KEY) {
    // Phase "go live": create a PaymentIntent with the saved customer/payment method.
    // Left as an explicit TODO so test mode never touches real money.
  }
  return { ok: true, ref: 'test_' + crypto.randomBytes(6).toString('hex'), amountCents, description };
}
