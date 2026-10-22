import { currentUser } from '@/lib/auth';
import { stripe, stripeOn, stripeTestKey } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

// Signed-in only: are the Stripe keys in place and working? Never returns the keys.
export async function GET() {
  const me = await currentUser();
  if (!me) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || process.env.NEXT_STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLIC_KEY || '';
  const names = Object.keys(process.env).filter((k) => /STRIPE/i.test(k));
  const out = {
    secretKey: stripeOn() ? (stripeTestKey() ? 'test key set' : 'LIVE key set') : 'missing',
    publishableKey: pk ? (pk.startsWith('pk_test_') ? 'test key set' : pk.startsWith('pk_live_') ? 'LIVE key set' : 'set, but does not look like a Stripe key') : 'missing',
  };
  out.stripeVariablesFound = names;
  if ((stripeTestKey() && pk.startsWith('pk_live_')) || (stripeOn() && !stripeTestKey() && pk.startsWith('pk_test_'))) out.warning = 'The two keys are from different modes. Use both test keys or both live keys.';
  if (stripeOn()) {
    try {
      const b = await stripe('GET', '/balance');
      out.stripe = 'connected';
      out.balance = (b.available || []).map((x) => `${(x.amount / 100).toFixed(2)} ${x.currency}`).join(', ') || '0';
      const acct = await stripe('GET', '/account');
      out.connect = acct?.controller || acct?.settings?.dashboard ? 'platform account reachable' : 'reachable';
    } catch (e) { out.stripe = 'error: ' + e.message; }
  }
  return Response.json(out);
}
