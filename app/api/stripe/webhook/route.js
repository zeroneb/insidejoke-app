// stripe: webhook. Stripe calls this the moment a dispute opens or changes, a payment is refunded,
// or a bank payment clears or bounces, so the wallet never shows (or pays out) money that has gone back.
// Cash-out also re-checks every gift with Stripe (lib/disputes.js checkGiftsBeforePayout) and the daily
// job re-syncs disputes, so a missed event can't let money out; this just makes it immediate.
//
// Stripe Dashboard → Developers → Webhooks: endpoint https://<app>/api/stripe/webhook, with the events in
// HANDLED below. Its signing secret goes in STRIPE_WEBHOOK_SECRET (several, comma-separated, if there is more
// than one endpoint, e.g. one for "Events on your account" and one for "Events on connected accounts").
import crypto from 'node:crypto';
import { get, run, now } from '@/lib/db';
import { stripe, stripeOn, stripeTestKey } from '@/lib/stripe';
import { applyDispute, applyRefund, isGiftPayment, piOf } from '@/lib/disputes';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const TOLERANCE = 300; // seconds, as Stripe's own libraries

// Stripe-Signature: t=<unix>,v1=<hex hmac>[,v1=…]. HMAC-SHA256 of "<t>.<raw body>" with the endpoint's secret.
function verified(payload, header, secrets) {
  const parts = String(header || '').split(',').map((p) => p.trim().split('='));
  const t = Number(parts.find(([k]) => k === 't')?.[1]);
  const sigs = parts.filter(([k]) => k === 'v1').map(([, v]) => v || '');
  if (!t || !sigs.length || Math.abs(Date.now() / 1000 - t) > TOLERANCE) return false;
  for (const secret of secrets) {
    const want = Buffer.from(crypto.createHmac('sha256', secret).update(`${t}.${payload}`, 'utf8').digest('hex'));
    for (const s of sigs) {
      const got = Buffer.from(s);
      if (got.length === want.length && crypto.timingSafeEqual(got, want)) return true;
    }
  }
  return false;
}

const HANDLED = new Set([
  'charge.dispute.created', 'charge.dispute.updated', 'charge.dispute.closed',
  'charge.dispute.funds_withdrawn', 'charge.dispute.funds_reinstated',
  'charge.refunded', 'charge.refund.updated', 'refund.created', 'refund.updated', 'refund.failed',
  'payment_intent.succeeded', 'payment_intent.payment_failed'
]);

async function handle(event) {
  const o = event.data?.object || {};
  // Our gifts are charged on the platform account. An event from a connected account (event.account) can't
  // be about one of them, but it's looked up the same way: no matching gift means nothing happens.
  if (event.type.startsWith('charge.dispute.')) {
    if (!(await isGiftPayment(piOf(o.payment_intent)))) return false;
    // Events can arrive out of order: work from the dispute as Stripe has it now.
    return applyDispute(event.account ? o : await stripe('GET', `/disputes/${encodeURIComponent(o.id)}`));
  }
  if (event.type === 'charge.refunded') return applyRefund(o);
  if (o.object === 'refund') {
    // Refund events carry the refund; the charge says how much of the payment is refunded in all.
    const chargeId = typeof o.charge === 'string' ? o.charge : o.charge?.id;
    if (!chargeId || event.account) return false;
    return applyRefund(await stripe('GET', `/charges/${encodeURIComponent(chargeId)}`));
  }
  if (event.type.startsWith('payment_intent.')) {
    // A bank payment cleared or bounced: settle that list's pending gifts now rather than at the daily job.
    const c = await get('SELECT list_id FROM contributions WHERE stripe_payment_intent_id = ? LIMIT 1', o.id || '');
    if (c) await (await import('@/lib/payments')).settlePendingGifts({ listIds: [c.list_id] });
    return !!c;
  }
  return false;
}

export async function POST(req) {
  const secrets = String(process.env.STRIPE_WEBHOOK_SECRET || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!stripeOn() || !secrets.length) {
    // Not a silent 200: Stripe shows the endpoint as failing until the secret is set.
    console.error('stripe webhook: STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET is not set');
    return Response.json({ error: 'webhook not configured' }, { status: 503 });
  }
  const payload = await req.text();
  if (!verified(payload, req.headers.get('stripe-signature'), secrets)) return Response.json({ error: 'bad signature' }, { status: 400 });
  let event;
  try { event = JSON.parse(payload); } catch { return Response.json({ error: 'bad json' }, { status: 400 }); }
  if (!event?.id || !event?.type) return Response.json({ error: 'bad event' }, { status: 400 });
  // Test-mode events sent to a live app (or the other way round) aren't about real gifts here.
  if (typeof event.livemode === 'boolean' && event.livemode === stripeTestKey()) return Response.json({ received: true, ignored: 'mode' });
  if (!HANDLED.has(event.type)) return Response.json({ received: true, ignored: 'type' });

  // Each event once. A retry of one that failed before runs again (the handlers only apply each change once).
  await run('INSERT INTO stripe_events (id, type, account, received_at) VALUES (?, ?, ?, ?) ON CONFLICT (id) DO NOTHING', event.id, event.type, event.account || null, now());
  const seen = await get('SELECT processed_at FROM stripe_events WHERE id = ?', event.id);
  if (seen?.processed_at) return Response.json({ received: true, duplicate: true });
  try {
    const changed = await handle(event);
    await run('UPDATE stripe_events SET processed_at = ?, error = NULL WHERE id = ?', now(), event.id);
    return Response.json({ received: true, changed: !!changed });
  } catch (e) {
    // Never swallow it: a non-2xx makes Stripe retry (for up to 3 days), and the error is kept here and in the logs.
    console.error('stripe webhook', event.type, event.id, e.message);
    await run('UPDATE stripe_events SET error = ? WHERE id = ?', String(e.message || e).slice(0, 500), event.id).catch(() => {});
    try { (await import('@/lib/events')).logEvent('webhook_fail', { ref: event.id, detail: `${event.type}: ${e.message}` }); } catch {}
    return Response.json({ error: 'failed, will retry' }, { status: 500 });
  }
}
