import { currentUser } from '@/lib/auth';
import { stripe, stripeV2, stripeOn, stripeTestKey } from '@/lib/stripe';
import { payoutMethod } from '@/lib/wallet';

export const dynamic = 'force-dynamic';

// Signed-in only: are the Stripe keys in place and working? Never returns the keys.
export async function GET() {
  const me = await currentUser();
  if (!me) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const digits = (p) => String(p || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  if (!String(process.env.ADMIN_PHONES || '').split(',').map(digits).filter(Boolean).includes(digits(me.phone))) return Response.json({ error: 'Not found.' }, { status: 404 });
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.NEXT_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLIC_KEY || '';
  const names = Object.keys(process.env).filter((k) => /STRIPE/i.test(k));
  const out = {
    secretKey: stripeOn() ? (stripeTestKey() ? 'test key set' : 'LIVE key set') : 'missing',
    publishableKey: pk ? (pk.startsWith('pk_test_') ? 'test key set' : pk.startsWith('pk_live_') ? 'LIVE key set' : 'set, but does not look like a Stripe key') : 'missing',
  };
  out.stripeVariablesFound = names;
  out.deployment = { environment: process.env.VERCEL_ENV || 'local', commit: (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7), url: process.env.VERCEL_URL || '' };
  if ((stripeTestKey() && pk.startsWith('pk_live_')) || (stripeOn() && !stripeTestKey() && pk.startsWith('pk_test_'))) out.warning = 'The two keys are from different modes. Use both test keys or both live keys.';
  if (stripeOn()) {
    try {
      const b = await stripe('GET', '/balance');
      out.stripe = 'connected';
      out.balance = (b.available || []).map((x) => `${(x.amount / 100).toFixed(2)} ${x.currency}`).join(', ') || '0';
      const acct = await stripe('GET', '/account');
      out.connect = acct?.controller || acct?.settings?.dashboard ? 'platform account reachable' : 'reachable';
    } catch (e) { out.stripe = 'error: ' + e.message; }
    const m = await payoutMethod(me.id);
    if (m?.stripe_account_id) {
      const pay = out.payoutAccount = { saved: m.label, readyInApp: !!m.stripe_ready, lastStatus: m.stripe_status || null };
      try {
        const a2 = await stripeV2('GET', `/core/accounts/${m.stripe_account_id}?include=configuration.recipient&include=requirements`);
        pay.transfers = a2?.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers || 'not in reply';
        pay.stillNeeded = (a2?.requirements?.entries || []).map((r) => `${r.description || r.awaiting_action_from || ''} (${(r.impact?.restricts_capabilities || []).map((c) => c.capability + ':' + c.deadline?.status).join(', ')})`).slice(0, 8);
      } catch (e) { pay.v2Error = e.message; }
      try { const a = await stripe('GET', `/accounts/${m.stripe_account_id}`); pay.v1Capabilities = a.capabilities; pay.v1Due = a.requirements?.currently_due; } catch (e) { pay.v1Error = e.message; }
    } else out.payoutAccount = 'none yet';
  }
  return Response.json(out);
}
