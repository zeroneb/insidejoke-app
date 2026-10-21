'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Blob } from '@/components/ui';
import { PaymentPicker, usePayment, splitPayLabel } from '@/components/payment-setup';
import { savePayment } from '@/lib/actions-a3';

export default function PaymentForm({ next, current }) {
  const [state, action, pending] = useActionState(savePayment, null);
  const pay = usePayment(current?.kind || 'apple');
  const [brand, digits] = splitPayLabel(current?.label || '');
  return (
    <form action={action} style={{ color: '#000000', display: 'flex', flexDirection: 'column' }}>
      <input type="hidden" name="payKind" value={pay.kind} />
      <input type="hidden" name="last4" value={pay.last4} />
      <input type="hidden" name="cardFirst" value={pay.first} />
      <input type="hidden" name="next" value={next} />
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 0 8px' }}>
        <Link href={next} aria-label="Back" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="1.8" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></Link>
        <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em' }}>{current ? 'How you pay' : 'One-time setup'}</span>
        <div style={{ width: 44 }} />
      </header>
      <section style={{ padding: '18px 20px 0' }}>
        <h1 style={{ margin: 0, fontWeight: 400, fontSize: 44, lineHeight: 0.98, letterSpacing: '-0.04em' }}>{current ? <>How you <span className="serif" style={{ fontStyle: 'italic' }}>pay</span></> : <>Set up paying <span className="serif" style={{ fontStyle: 'italic' }}>once</span></>}</h1>
        <p style={{ margin: '12px 0 0', fontSize: 16, lineHeight: 1.4 }}>After this, every gift is one tap.</p>
      </section>
      <section style={{ position: 'relative', margin: '22px 16px 0', background: '#13286B', color: '#FFFFFF', height: 210, overflow: 'hidden' }}>
        <Blob seed={22} color="#D8F75A" style={{ left: '50%', marginLeft: -140, top: 18 }} width={280} height={175} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#000000', textAlign: 'center', padding: '0 70px' }}>
          <span style={{ fontSize: 13 }}>{current ? 'You give with' : 'Nothing saved yet'}</span>
          <span className={digits ? 'dot' : ''} style={{ fontSize: digits ? 40 : 30, lineHeight: 1, fontWeight: digits ? 900 : 700 }}>{current ? (digits || brand) : 'Pick one'}</span>
          <span style={{ fontSize: 13 }}>{current && digits ? brand : 'Saved for every gift'}</span>
        </div>
        <span style={{ position: 'absolute', left: 14, bottom: 12, fontSize: 11, fontWeight: 500 }}>Only you see this</span>
      </section>
      <div style={{ padding: '24px 20px 0', display: 'flex', flexDirection: 'column' }}>
        <PaymentPicker forName="your friends" kind={pay.kind} onKind={pay.setKind} card={pay.card} onCard={pay.setCard} />
      </div>
      {state?.error ? <p className="err" style={{ margin: '14px 20px 0' }}>{state.error}</p> : null}
      <div style={{ padding: '22px 16px 0' }}>
        <button type="submit" disabled={pending || (pay.kind === 'card' && pay.card.replace(/\D/g, '').length < 4)} style={{ width: '100%', border: 0, background: '#000000', color: '#FFFFFF', fontFamily: 'inherit', fontSize: 17, padding: '17px 0', borderRadius: 999, cursor: 'pointer', opacity: pending || (pay.kind === 'card' && pay.card.replace(/\D/g, '').length < 4) ? 0.5 : 1 }}>
          {pending ? 'Saving…' : pay.kind === 'apple' ? 'Use Apple Pay' : pay.kind === 'card' ? 'Save this card' : 'Link this bank'}
        </button>
      </div>
      <p style={{ margin: '14px 20px 0', textAlign: 'center', fontSize: 13, color: '#3A3A3A' }}>Saved for next time. Change it anytime here. Test mode: nothing is charged.</p>
      <div style={{ height: 36 }} />
    </form>
  );
}
