// r3: Option 10 PayoutSetup. Where cash-outs land (simulated in test mode).
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { payoutMethod } from '@/lib/wallet';
import PayoutForm from './payout-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Get paid · insidejoke' };

export default async function PayoutPage({ searchParams }) {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/wallet/payout');
  const sp = await searchParams;
  const pm = await payoutMethod(me.id);
  const next = /^\/[^/]/.test(sp?.next || '') ? sp.next : '/wallet';
  // Test mode: a stable, made-up account ending for the linked bank.
  let h = 0; for (const ch of String(me.id)) h = (h * 31 + ch.charCodeAt(0)) % 9000;
  const acct = String(1000 + h);
  return <PayoutForm next={next} current={pm ? pm.label.replace(/\s+(checking|savings)\b/i, '') : null} legalName={me.name || ''} acct={acct} />;
}
