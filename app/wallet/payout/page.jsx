// a3: Option 10 PayoutSetup. Where cash-outs land: bank or debit card (simulated in test mode).
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
  return <PayoutForm next={next} current={pm?.label || null} legalName={me.name || ''} />;
}
