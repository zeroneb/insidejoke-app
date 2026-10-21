'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { Blob } from '@/components/ui';
import { savePayout } from '@/lib/actions-a3';

const V = '#3B12D9', Y = '#E6F98A';
const BANKS = [['CH', 'Chase'], ['BA', 'Bank of America'], ['CI', 'Citi'], ['+', 'Another bank']];
const field = { height: 52, border: `1.5px solid ${V}`, background: '#FFFFFF', color: '#000000', fontFamily: 'inherit', fontSize: 16, padding: '0 14px', boxSizing: 'border-box', width: '100%', borderRadius: 0 };
const big = { height: 56, border: 0, background: V, color: Y, fontFamily: 'inherit', fontWeight: 800, fontSize: 17, borderRadius: 999, cursor: 'pointer', width: '100%', marginTop: 8 };

export default function PayoutForm({ next, current, legalName }) {
  const [state, action, pending] = useActionState(savePayout, null);
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState('bank');
  const [bank, setBank] = useState('Chase');
  const [card, setCard] = useState('');
  const done = state?.done;
  const s = done ? 2 : step;
  const L = [kind === 'bank' ? 'Link bank' : 'Add card', 'Confirm ID', 'Done'];
  const seg = (on) => ({ flex: '1 1 0', height: 40, border: 0, background: on ? V : 'transparent', color: on ? Y : V, fontFamily: 'inherit', fontWeight: 800, fontSize: 14, cursor: 'pointer' });

  return (
    <form action={action} style={{ minHeight: '100vh', boxSizing: 'border-box', background: Y, color: V, display: 'flex', flexDirection: 'column' }}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="bank" value={bank} />
      <input type="hidden" name="card" value={card} />
      <input type="hidden" name="next" value={next} />
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px 0 8px', fontSize: 13, fontWeight: 600 }}>
        <Link href={next} aria-label="Back" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={V} strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></Link>
        <span>One-time setup</span>
      </header>
      <section style={{ padding: '10px 20px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h1 style={{ margin: 0, fontWeight: 600, fontSize: 44, lineHeight: 0.95, letterSpacing: '-0.03em' }}>Get paid <span className="serif" style={{ fontWeight: 400, fontStyle: 'italic' }}>once,</span><br />then never again</h1>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.4 }}>{current ? `Cash-outs go to ${current} now. Switch it here.` : "Two quick steps the first time you cash out. We'll never ask again."}</p>
      </section>
      <ol aria-label="Progress" style={{ listStyle: 'none', margin: '22px 20px 0', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
        {L.map((label, i) => <li key={label} aria-current={i === s ? 'step' : undefined} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={{ height: 6, borderRadius: 999, background: i <= s ? V : 'rgba(59,18,217,.2)' }} /><span style={{ fontSize: 12, fontWeight: i === s ? 800 : 500 }}>{label}</span></li>)}
      </ol>

      {s === 0 ? (
        <section className="a3-pop" style={{ padding: '22px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div role="radiogroup" aria-label="Where it lands" style={{ display: 'flex', border: `1.5px solid ${V}`, borderRadius: 999, overflow: 'hidden', marginBottom: 6 }}>
            <button type="button" role="radio" aria-checked={kind === 'bank'} onClick={() => setKind('bank')} style={seg(kind === 'bank')}>Bank account</button>
            <button type="button" role="radio" aria-checked={kind === 'card'} onClick={() => setKind('card')} style={seg(kind === 'card')}>Debit card</button>
          </div>
          {kind === 'bank' ? (
            <>
              <h2 className="wide" style={{ margin: 0, fontSize: 14, letterSpacing: '0.14em' }}>Pick your bank</h2>
              {BANKS.map(([i, name]) => {
                const on = bank === name;
                return (
                  <button key={name} type="button" onClick={() => setBank(name)} aria-pressed={on} style={{ display: 'flex', alignItems: 'center', gap: 12, border: `1.5px solid ${V}`, background: on ? '#FFFFFF' : 'transparent', color: V, fontFamily: 'inherit', padding: 12, cursor: 'pointer', textAlign: 'left' }}>
                    <span className="wide" style={{ width: 40, height: 40, flexShrink: 0, background: V, color: Y, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{i}</span>
                    <span style={{ flexGrow: 1, fontWeight: 700, fontSize: 16 }}>{name}</span>
                  </button>
                );
              })}
              <span style={{ fontSize: 12, lineHeight: 1.4 }}>You'll sign in with your bank. insidejoke never sees your password. Test mode: simulated.</span>
              <button type="button" onClick={() => setStep(1)} style={big}>Link account</button>
            </>
          ) : (
            <>
              <h2 className="wide" style={{ margin: 0, fontSize: 14, letterSpacing: '0.14em' }}>Your debit card</h2>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontWeight: 700, fontSize: 14 }}>Card number<input value={card} onChange={(e) => setCard(e.target.value)} inputMode="numeric" autoComplete="cc-number" placeholder="1234 1234 1234 1234" style={{ ...field, fontFamily: "'Doto', monospace", fontWeight: 900, fontSize: 18 }} /></label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontWeight: 700, fontSize: 14 }}>Expiry<input placeholder="MM/YY" autoComplete="cc-exp" style={field} /></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontWeight: 700, fontSize: 14 }}>ZIP<input placeholder="ZIP" inputMode="numeric" style={field} /></label>
              </div>
              <span style={{ fontSize: 12, lineHeight: 1.4 }}>Debit cards usually get the money in minutes. Test mode: simulated.</span>
              <button type="button" onClick={() => setStep(1)} disabled={card.replace(/\D/g, '').length < 4} style={{ ...big, opacity: card.replace(/\D/g, '').length < 4 ? 0.5 : 1 }}>Add card</button>
            </>
          )}
        </section>
      ) : null}

      {s === 1 ? (
        <section className="a3-pop" style={{ padding: '22px 20px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 className="wide" style={{ margin: 0, fontSize: 14, letterSpacing: '0.14em' }}>Confirm it's you</h2>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontWeight: 700, fontSize: 14 }}>Legal name<input name="legalName" defaultValue={legalName} autoComplete="name" style={field} /></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontWeight: 700, fontSize: 14 }}>Date of birth<input placeholder="MM / DD / YYYY" autoComplete="bday" style={{ ...field, fontFamily: "'Doto', monospace", fontWeight: 900 }} /></label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontWeight: 700, fontSize: 14 }}>Last 4 of SSN<input placeholder="••••" inputMode="numeric" maxLength={4} style={{ ...field, fontFamily: "'Doto', monospace", fontWeight: 900 }} /></label>
          </div>
          <span style={{ fontSize: 12, lineHeight: 1.4 }}>Banks require this before money can move. It's encrypted and only used to verify you. Test mode: nothing is checked or stored.</span>
          {state?.error ? <p className="err" style={{ margin: 0 }}>{state.error}</p> : null}
          <button type="submit" disabled={pending} style={big}>{pending ? 'Verifying…' : 'Verify'}</button>
          <button type="button" onClick={() => setStep(0)} style={{ alignSelf: 'center', border: 0, background: 'transparent', color: V, fontFamily: 'inherit', fontSize: 14, textDecoration: 'underline', textUnderlineOffset: 3, padding: 10, cursor: 'pointer' }}>Back</button>
        </section>
      ) : null}

      {s === 2 ? (
        <>
          <section className="a3-pop" role="status" style={{ margin: '22px 16px 0', position: 'relative', background: V, color: Y, padding: '26px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10, overflow: 'hidden' }}>
            <Blob seed={17} color="#FFFFFF" style={{ left: '50%', marginLeft: -95, top: 8, opacity: 0.14 }} width={190} height={130} />
            <svg aria-hidden="true" style={{ position: 'relative' }} width="86" height="86" viewBox="0 0 100 100" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path className="a3-draw" d="M50 9 C72 8 92 26 91 50 C90 74 72 92 49 91 C25 90 9 72 10 49 C11 27 30 10 53 9 M30 52 C36 57 41 62 44 67 C53 53 63 41 74 31 M76 33 L72 30" /></svg>
            <span className="serif" style={{ position: 'relative', fontSize: 32, lineHeight: 1, color: '#FFFFFF' }}>You're <span style={{ fontWeight: 600 }}>all set</span></span>
            <span style={{ position: 'relative', fontSize: 15, lineHeight: 1.4 }}>{state?.label} is linked. You won't see this again.</span>
          </section>
          <p style={{ margin: '18px 20px 0', fontSize: 14, lineHeight: 1.45 }}><span className="dot" style={{ fontSize: 16 }}>5%</span> comes out only when you cash out. Your friends never pay a fee.</p>
          <div style={{ padding: '18px 16px 0' }}><Link href={state?.next || next} style={{ display: 'block', textAlign: 'center', textDecoration: 'none', background: V, color: Y, fontWeight: 800, fontSize: 17, padding: '17px 0', borderRadius: 999 }}>{(state?.next || next).startsWith('/wallet') ? 'Back to cash out' : 'Continue'}</Link></div>
        </>
      ) : null}
      <div style={{ height: 40 }} />
    </form>
  );
}
