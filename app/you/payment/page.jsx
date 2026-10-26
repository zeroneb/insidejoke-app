// r3: how you give (Option 10 PaymentSetup, as a settings page).
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { paymentMethod } from '@/lib/payments';
import PaymentForm from './payment-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'How you pay · insidejoke' };

export default async function PaymentPage({ searchParams }) {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/you/payment');
  const sp = await searchParams;
  const pm = await paymentMethod(me.id);
  const next = /^\/[^/]/.test(sp?.next || '') ? sp.next : '/you/settings';
  return (
    <main className="r3-full" style={{ background: 'var(--ground, #ECECEF)', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <PaymentForm next={next} current={pm ? { kind: pm.kind, label: pm.label } : null} />
    </main>
  );
}
