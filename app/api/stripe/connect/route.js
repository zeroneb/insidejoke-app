// stripe: Express onboarding comes back here.
//  ?step=return  -> re-read the account, then go to `next` (or back to /wallet/payout if Stripe still needs info)
//  ?step=refresh -> the link expired; make a fresh one and send the owner straight back to Stripe
import { currentUser } from '@/lib/auth';
import { appUrl } from '@/lib/texts';
import { stripeOn } from '@/lib/stripe';
import { connectOnboardingLink, refreshConnectAccount, payoutMethod } from '@/lib/wallet';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { safeNext } from '@/lib/access';

export async function GET(req) {
  const u = new URL(req.url);
  const next = safeNext(u.searchParams.get('next'), '/wallet');
  const step = u.searchParams.get('step');
  const go = (path) => Response.redirect(new URL(path, appUrl()).toString(), 303);
  const me = await currentUser();
  if (!me) return go(`/signup?next=${encodeURIComponent('/wallet/payout')}`);
  if (!stripeOn()) return go(next);
  try {
    if (step === 'refresh') {
      const m = await payoutMethod(me.id);
      const back = `${appUrl()}/api/stripe/connect?next=${encodeURIComponent(next)}`;
      const url = await connectOnboardingLink(me.id, m?.kind || 'bank', { returnUrl: `${back}&step=return`, refreshUrl: `${back}&step=refresh` });
      return Response.redirect(url, 303);
    }
    // Stripe usually switches transfers on a few seconds after onboarding: give it a moment.
    let m = await refreshConnectAccount(me.id);
    for (let i = 0; i < 3 && !m?.stripe_ready && /^(pending|restricted)$/.test(m?.transferStatus || ''); i++) {
      await new Promise((r) => setTimeout(r, 2000));
      m = await refreshConnectAccount(me.id);
    }
    if (m && !m.stripe_ready && m.transferStatus === 'restricted') m.transferStatus = 'pending';
    // Ready, or still being checked: back to the wallet (cash-out re-checks). Setup not finished: back to setup.
    return go(m?.stripe_ready || m?.transferStatus === 'pending' ? next : `/wallet/payout?next=${encodeURIComponent(next)}&status=${encodeURIComponent(String(m?.transferStatus || 'unfinished').slice(0, 40))}`);
  } catch (e) {
    console.error('stripe connect return', e.message);
    return go(`/wallet/payout?next=${encodeURIComponent(next)}`);
  }
}
