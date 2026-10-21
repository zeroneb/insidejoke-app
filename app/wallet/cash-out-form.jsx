'use client';

// a3: archive choice + Cash out behind a second tap.
import { useActionState, useState } from 'react';
import Link from 'next/link';
import { cashOutAll } from '@/lib/actions-a3';

export default function CashOutForm({ net, method, shared, ownNote }) {
  const [state, action, pending] = useActionState(cashOutAll, null);
  const [asking, setAsking] = useState(false);
  const [arch, setArch] = useState({});
  const any = Object.values(arch).some(Boolean);
  const dest = method ? <>{method.bank} <span className="dot" style={{ fontSize: 17 }}>{method.digits}</span></> : null;
  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column' }}>
      <section style={{ margin: '24px 20px 0', padding: '14px 0', borderTop: '1px solid #000000', borderBottom: '1px solid #000000', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45 }}>
          {any ? `${shared.filter((l) => arch[l.id]).map((l) => l.title).join(' and ')} will be archived after this cash-out. You can bring it back anytime.` : ownNote ? 'Your lists stay open. Treats and wishes keep coming in until you archive them.' : 'Shared lists stay open until you archive them.'}
        </p>
        {shared.map((l) => (
          <label key={l.id} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 700, padding: '10px 0', cursor: 'pointer', position: 'relative' }}>
            <input type="checkbox" name="archive" value={l.id} checked={!!arch[l.id]} onChange={(e) => setArch({ ...arch, [l.id]: e.target.checked })} className="sr" />
            <span aria-hidden="true" style={{ width: 22, height: 22, flexShrink: 0, boxSizing: 'border-box', border: '1.5px solid #000000', background: arch[l.id] ? '#000000' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={arch[l.id] ? '#D4FA4F' : 'transparent'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg></span>
            Archive “{l.title}” too
          </label>
        ))}
      </section>
      <div style={{ padding: '28px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {state?.error ? <p className="err" style={{ margin: 0 }}>{state.error}</p> : null}
        {!method ? (
          <>
            <Link href="/wallet/payout?next=/wallet" style={{ textAlign: 'center', textDecoration: 'none', background: '#000000', color: '#FFFFFF', fontWeight: 800, fontSize: 16, padding: '19px 0', borderRadius: 999 }}>Set up where it lands</Link>
            <span style={{ textAlign: 'center', fontSize: 12, color: '#4A4A4A' }}>Once. Then cashing out is two taps.</span>
          </>
        ) : !asking ? (
          <>
            <button type="button" onClick={() => setAsking(true)} style={{ width: '100%', border: 0, background: '#000000', color: '#FFFFFF', fontFamily: 'inherit', fontWeight: 800, fontSize: 16, padding: '19px 0', borderRadius: 999, cursor: 'pointer' }}>Cash out <span className="dot" style={{ fontSize: 17 }}>{net}</span></button>
            <span style={{ textAlign: 'center', fontSize: 12, color: '#4A4A4A' }}>You will confirm on the next tap.</span>
          </>
        ) : (
          <div className="a3-pop" role="alertdialog" aria-label="Confirm cash out" style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#D4FA4F', padding: '16px 16px 14px' }}>
            <span style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.3 }}>Send <span className="dot" style={{ fontSize: 17 }}>{net}</span> to {dest}?</span>
            <span style={{ fontSize: 13, lineHeight: 1.4 }}>This cannot be undone. It lands {method.card ? 'in minutes' : 'in 1–2 business days'}.</span>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="submit" disabled={pending} autoFocus style={{ flex: '1 1 0', border: 0, background: '#000000', color: '#FFFFFF', fontFamily: 'inherit', fontWeight: 800, fontSize: 15, padding: '15px 0', borderRadius: 999, cursor: 'pointer' }}>{pending ? 'Sending…' : 'Yes, send it'}</button>
              <button type="button" onClick={() => setAsking(false)} style={{ flexShrink: 0, border: '1.5px solid #000000', background: 'transparent', fontFamily: 'inherit', fontWeight: 700, fontSize: 15, padding: '0 20px', borderRadius: 999, cursor: 'pointer', color: '#000000' }}>Not now</button>
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
