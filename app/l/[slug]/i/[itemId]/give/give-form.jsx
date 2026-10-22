'use client';

// r3: Option 10 Contribute (wish, mustard), Treat (treat, green), and the first-time
// PaymentSetup step (shown in place of the form before the first gift is paid).
import { useActionState, useState } from 'react';
import Link from 'next/link';
import { shortNoun } from '@/components/ui';
import { tri } from '@/lib/blob';
import { PaymentPicker, usePayment } from '@/components/payment-setup';
import { give } from '@/lib/actions';

const dollars = (cents) => (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
const cents2 = (cents) => (cents / 100).toFixed(2);

// The Contribute board's own blob math (a touch calmer than lib/blob).
function blob10(shape, jitter) {
  let s = shape;
  const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const a1 = r() * 6.28, a2 = r() * 6.28, a3 = r() * 6.28;
  let j = jitter;
  const q = () => { j = (j * 7919 + 104729) % 233280; return j / 233280; };
  const pts = [];
  for (let i = 0; i < 140; i++) {
    const t = (i / 140) * 6.2832;
    const k = 1 + 0.07 * Math.sin(2 * t + a1) + 0.05 * Math.sin(3 * t + a2) + 0.03 * Math.sin(5 * t + a3) + (q() - 0.5) * 0.045;
    pts.push((100 + k * 88 * Math.cos(t)).toFixed(1) + ' ' + (100 + k * 88 * Math.sin(t)).toFixed(1));
  }
  return 'M' + pts.join(' L') + ' Z';
}
const CONTRIB_BLOB = [blob10(9, 5), blob10(9, 29), blob10(9, 53)];

function Boil({ paths, color, style, width, height }) {
  return (
    <svg aria-hidden="true" style={{ position: 'absolute', ...style }} width={width} height={height} viewBox="0 0 200 200" preserveAspectRatio="none">
      <path className="b1" d={paths[0]} fill={color} /><path className="b2" d={paths[1]} fill={color} /><path className="b3" d={paths[2]} fill={color} />
    </svg>
  );
}

const X = <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>;
const Arrows = () => (
  <span aria-hidden="true" style={{ display: 'flex', gap: 1 }}>
    {['a1', 'a2', 'a3'].map((c) => <svg key={c} className={c} width="10" height="12" viewBox="0 0 30 34"><path d="M0 0 L30 17 L0 34 Z" fill="#96E084" /></svg>)}
  </span>
);

export default function GiveForm({ slug, item, forName, signedIn, payLabel, initialMode }) {
  const [state, action, pending] = useActionState(give, null);
  const treat = item.unlimited;
  const chips = [1000, 2500, 5000].filter((c) => c < item.remaining);
  const [pick, setPick] = useState(initialMode === 'rest' || !chips.length ? 'rest' : chips.includes(2500) ? '2500' : String(chips[0]));
  const [custom, setCustom] = useState('');
  const [units, setUnits] = useState(1);
  const [vis, setVis] = useState('public');
  const [note, setNote] = useState('');
  const [step, setStep] = useState('form');
  const pay = usePayment('apple');
  // Also when the server finds the saved way to pay can't be charged (state.needPayment).
  const needsSetup = signedIn && (!payLabel || !!state?.needPayment);
  const onPay = needsSetup && (step === 'pay' || !!state?.needPayment);

  let cents = 0;
  if (treat) cents = units * item.price_cents;
  else if (pick === 'rest') cents = item.remaining;
  else if (pick === 'custom') cents = Math.min(item.remaining, Math.round(parseFloat(custom.replace(/[^0-9.]/g, '') || '0') * 100));
  else cents = parseInt(pick, 10);

  const short = shortNoun(item.name);
  const selfPath = `/l/${slug}/i/${item.id}/give${initialMode === 'rest' ? '?mode=rest' : ''}`;
  const tooSmall = cents < 100;

  const hidden = (
    <>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="itemId" value={item.id} />
      <input type="hidden" name="mode" value={treat ? 'treat' : pick === 'rest' ? 'rest' : 'amount'} />
      <input type="hidden" name="amount" value={pick === 'custom' ? 'custom' : pick === 'rest' ? '' : String(parseInt(pick, 10) / 100)} />
      <input type="hidden" name="custom" value={custom} />
      <input type="hidden" name="units" value={units} />
      <input type="hidden" name="visibility" value={vis} />
      <input type="hidden" name="note" value={note} />
      {needsSetup ? (
        <>
          <input type="hidden" name="payKind" value={onPay ? pay.kind : ''} />
          <input type="hidden" name="last4" value={pay.last4} />
          <input type="hidden" name="cardFirst" value={pay.first} />
        </>
      ) : null}
    </>
  );

  // First gift: tapping the main button opens the one-time payment step instead of paying.
  const goPay = (e) => { if (needsSetup && !onPay) { e.preventDefault(); setStep('pay'); window.scrollTo(0, 0); } };
  const err = state?.error ? <p className="err" style={{ margin: '0 0 12px' }}>{state.error}</p> : null;

  /* ---------- PaymentSetup (first time only) ---------- */
  if (onPay) {
    const cardShort = pay.kind === 'card' && pay.card.replace(/\D/g, '').length < 12;
    return (
      <form action={action} className="r3-full" style={{ background: '#ECECEF', color: '#000000', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        {hidden}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 0 8px' }}>
          <button type="button" onClick={() => setStep('form')} aria-label="Back" style={{ width: 44, height: 44, border: 0, background: 'transparent', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="1.8" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></button>
          <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em' }}>One-time setup</span>
          <div style={{ width: 44 }} />
        </header>
        <section style={{ padding: '18px 20px 0' }}>
          <h1 style={{ margin: 0, fontWeight: 400, fontSize: 44, lineHeight: 0.98, letterSpacing: '-0.04em' }}>Set up paying <span className="serif" style={{ fontStyle: 'italic' }}>once</span></h1>
          <p style={{ margin: '12px 0 0', fontSize: 16, lineHeight: 1.4 }}>After this, every gift is one tap.</p>
        </section>
        <section style={{ position: 'relative', margin: '22px 16px 0', background: '#13286B', color: '#FFFFFF', height: 210, overflow: 'hidden' }}>
          <Boil paths={tri(22)} color="#D8F75A" style={{ left: '50%', marginLeft: -139, top: 18 }} width={280} height={175} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#000000', textAlign: 'center', padding: '0 70px' }}>
            <span style={{ fontSize: 13 }}>Your {treat ? 'treat' : 'gift'} to {forName}</span>
            <span className="dot" style={{ fontSize: dollars(cents).length > 4 ? 52 : 64, lineHeight: 1 }}>${dollars(cents)}</span>
            <span style={{ fontSize: 13 }}>{treat ? `${item.name}${units > 1 ? ` ×${units}` : ''}` : `toward the ${item.store ? item.store + ' ' : ''}${short}`}</span>
          </div>
          <span style={{ position: 'absolute', left: 14, bottom: 12, fontSize: 11, fontWeight: 500 }}>Only you see this amount</span>
        </section>
        <div style={{ padding: '24px 20px 0', display: 'flex', flexDirection: 'column' }}>
          <PaymentPicker forName={forName} kind={pay.kind} onKind={pay.setKind} card={pay.card} onCard={pay.setCard} />
        </div>
        <div style={{ padding: '22px 16px 0' }}>
          {err}
          <button type="submit" disabled={pending || cardShort} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: 0, background: '#000000', color: '#FFFFFF', fontFamily: 'inherit', fontSize: 17, padding: '17px 0', borderRadius: 999, cursor: 'pointer', opacity: pending || cardShort ? 0.5 : 1 }}>
            {pending ? 'Paying…' : pay.kind === 'apple' ? `Pay $${dollars(cents)} with Apple Pay` : `Pay $${dollars(cents)}`}
          </button>
        </div>
        <p style={{ margin: '14px 20px 0', textAlign: 'center', fontSize: 13, color: '#3A3A3A' }}>Saved for next time. Change it anytime in settings.</p>
        <div style={{ height: 36 }} />
      </form>
    );
  }

  const signupHref = `/signup?ctx=give&for=${encodeURIComponent(forName)}&next=${encodeURIComponent(selfPath)}`;

  /* ---------- Treat ---------- */
  if (treat) {
    const words = (item.name || '').replace(/[,.;:()]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w.toUpperCase());
    const longest = Math.max(...words.map((w) => w.length), 1);
    const tileSize = longest > 7 ? Math.max(30, Math.floor(52 * 7 / longest)) : 52;
    const V = [['public', 'Public', `Your name + note on ${forName}'s list`], ['private', 'Private', `Only ${forName} sees it's you`]];
    return (
      <form action={action} className="r3-full" style={{ background: '#96E084', color: '#000000', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexGrow: 1 }}>
        {hidden}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 0 8px' }}>
          <Link href={`/l/${slug}`} aria-label="Close" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg></Link>
          <span className="wide" style={{ fontSize: 12, letterSpacing: '0.18em', borderTop: '2px solid #000000', borderBottom: '2px solid #000000', padding: '5px 10px' }}>Treat · unlimited</span>
          <div style={{ width: 44 }} />
        </header>

        <section aria-label={`${item.name}, treated ${item.timesTreated} times`} style={{ position: 'relative', height: 330, marginTop: 6 }}>
          <Boil paths={tri(5)} color="#FFFFFF" style={{ left: 14, top: 10 }} width={360} height={310} />
          <div aria-hidden="true" style={{ position: 'absolute', left: 80, top: 50, width: 230, height: 230, background: '#E8642C', transform: 'rotate(45deg)' }} />
          <p className="dot" aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: words.length > 1 ? 96 : 120, margin: 0, textAlign: 'center', fontSize: tileSize, lineHeight: 0.95 }}>{words.map((w, i) => <span key={i}>{i ? <br /> : null}{w}</span>)}</p>
          <p key={item.timesTreated} className="dot pop" style={{ position: 'absolute', right: 18, top: 230, margin: 0, fontSize: 50 }}>×{item.timesTreated}</p>
          <p style={{ position: 'absolute', left: 20, top: 250, margin: 0, fontWeight: 700, fontSize: 14, lineHeight: 1.3, maxWidth: 150 }}>{item.store ? <>{item.store}<br /></> : null}for {forName}</p>
        </section>

        <section style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #000000', borderBottom: '2px solid #000000', padding: '10px 0' }}>
            <span style={{ fontWeight: 800, fontSize: 17 }}>How many?</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button type="button" onClick={() => setUnits(Math.max(1, units - 1))} aria-label="One fewer" style={{ width: 44, height: 44, border: '2px solid #000000', background: 'transparent', borderRadius: '50%', fontSize: 22, fontFamily: 'inherit', cursor: 'pointer', color: '#000000', padding: 0 }}>−</button>
              <span className="dot" aria-live="polite" style={{ width: 50, textAlign: 'center', fontSize: 28 }}>{units}</span>
              <button type="button" onClick={() => setUnits(Math.min(20, units + 1))} aria-label="One more" style={{ width: 44, height: 44, border: '2px solid #000000', background: '#000000', color: '#96E084', borderRadius: '50%', fontSize: 22, fontFamily: 'inherit', cursor: 'pointer', padding: 0 }}>+</button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label htmlFor="note" style={{ fontWeight: 800, fontSize: 15 }}>Add a note</label>
            <input id="note" value={note} onChange={(e) => setNote(e.target.value.slice(0, 280))} placeholder="rough monday, eat this" style={{ height: 50, boxSizing: 'border-box', border: '2px solid #000000', background: '#FFFFFF', color: '#000000', fontFamily: "'EB Garamond', serif", fontStyle: 'italic', fontSize: 19, padding: '0 14px', borderRadius: 0, width: '100%' }} />
          </div>
          <div role="radiogroup" aria-label="Who sees it" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            {V.map(([k, label, sub]) => {
              const on = vis === k;
              return (
                <button key={k} type="button" role="radio" aria-checked={on} onClick={() => setVis(k)} style={{ textAlign: 'left', border: '2px solid #000000', background: on ? '#000000' : 'transparent', color: on ? '#96E084' : '#000000', fontFamily: 'inherit', padding: 12, display: 'flex', flexDirection: 'column', gap: 4, cursor: 'pointer' }}>
                  <span style={{ fontWeight: 800, fontSize: 16 }}>{label}</span><span style={{ fontSize: 12, lineHeight: 1.3 }}>{sub}</span>
                </button>
              );
            })}
          </div>
          <div style={{ background: '#AAB4EC', color: '#1530C8', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800, fontSize: 15 }}><span>{forName} gets</span><span style={{ background: '#D4FA4F', padding: '4px 8px' }}>${dollars(cents)} · 100%</span></div>
          {err}
          {signedIn ? (
            <button type="submit" onClick={goPay} disabled={pending} style={{ height: 58, border: 0, background: '#000000', color: '#FFFFFF', fontFamily: 'inherit', fontWeight: 800, fontSize: 17, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', opacity: pending ? 0.6 : 1 }}>{pending ? 'Sending…' : <>Treat {forName} · ${dollars(cents)}<Arrows /></>}</button>
          ) : (
            <Link href={signupHref} style={{ height: 58, textDecoration: 'none', background: '#000000', color: '#FFFFFF', fontWeight: 800, fontSize: 17, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>Confirm your number to give<Arrows /></Link>
          )}
          <span style={{ textAlign: 'center', fontSize: 13 }}>{signedIn ? 'No fees for you. Ever.' : "One code, no password. That's your account."}</span>
        </section>
        <div style={{ height: 30 }} />
      </form>
    );
  }

  /* ---------- Contribute ---------- */
  const onCustom = pick === 'custom';
  const V = [['public', 'Public', 'Your name and note show on the item'], ['private', 'Private', `Only ${forName} sees your name and note`]];
  const amt = dollars(cents);
  return (
    <form action={action} className="r3-full" style={{ background: '#E3C552', color: '#000000', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      {hidden}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 0 8px', gap: 6 }}>
        <Link href={`/l/${slug}/i/${item.id}`} aria-label="Close" style={{ width: 44, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{X}</Link>
        <span style={{ fontSize: 15, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
        <div style={{ width: 44, flexShrink: 0 }} />
      </header>

      <section style={{ padding: '14px 20px 0' }}>
        <h1 style={{ margin: 0, fontWeight: 400, fontSize: 42, lineHeight: 0.98, letterSpacing: '-0.04em' }}>Contribute to {forName}'s <span style={{ fontFamily: "'EB Garamond', serif", fontStyle: 'italic' }}>{short}</span></h1>
      </section>

      <section aria-label="Your amount" style={{ position: 'relative', marginTop: 10, height: 200 }}>
        <Boil paths={CONTRIB_BLOB} color="#D8F75A" style={{ left: '50%', marginLeft: -165, top: 0 }} width={330} height={200} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <span className="dot" aria-live="polite" style={{ fontSize: amt.length > 4 ? 48 : 60, lineHeight: 1 }}>${amt}</span>
          <span style={{ fontWeight: 500, fontSize: 12 }}>Only you see this amount</span>
        </div>
      </section>

      <div role="radiogroup" aria-label="Amount" style={{ padding: '14px 20px 0', display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
        {[...chips.map((c) => [String(c), '$' + c / 100]), ['rest', 'The rest']].map(([k, label]) => {
          const on = pick === k;
          return <button key={k} type="button" role="radio" aria-checked={on} onClick={() => setPick(k)} style={{ height: 46, border: '1.5px solid #000000', background: on ? '#000000' : 'transparent', color: on ? '#FFFFFF' : '#000000', fontFamily: 'inherit', fontSize: 15, borderRadius: 999, cursor: 'pointer', padding: 0 }}>{label}</button>;
        })}
      </div>
      <div style={{ padding: '10px 20px 0', display: 'flex', gap: 8, alignItems: 'stretch' }}>
        <label htmlFor="custom" className="sr">Your own amount</label>
        <span style={{ flex: '1 1 0', minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, height: 46, boxSizing: 'border-box', border: '1.5px solid #000000', background: onCustom ? '#D8F75A' : '#FFFFFF', borderRadius: 999, padding: '0 16px' }}>
          <span className="dot" style={{ fontSize: 18 }}>$</span>
          <input id="custom" value={custom} inputMode="decimal" placeholder="Your own amount" onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (custom) setPick('custom'); } }} style={{ flex: '1 1 0', width: '100%', minWidth: 0, border: 0, background: 'transparent', fontFamily: "'Doto', monospace", fontWeight: 900, fontSize: 18, color: '#000000', outline: 'none' }} />
        </span>
        <button type="button" onClick={() => custom && setPick('custom')} aria-pressed={onCustom} style={{ flexShrink: 0, height: 46, border: '1.5px solid #000000', background: '#000000', color: '#FFFFFF', fontFamily: 'inherit', fontSize: 15, padding: '0 16px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap' }}>Use this</button>
      </div>

      <section style={{ padding: '24px 20px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label htmlFor="note" style={{ fontSize: 15 }}>Add a note for {forName}</label>
        <textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value.slice(0, 280))} placeholder="for every winter walk" style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #000000', background: '#FFFFFF', color: '#000000', resize: 'none', fontFamily: "'EB Garamond', serif", fontStyle: 'italic', fontSize: 19, lineHeight: 1.3, padding: '12px 14px', borderRadius: 0 }} />
      </section>

      <section role="radiogroup" aria-label="Who sees your contribution" style={{ padding: '22px 20px 0', display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 15, paddingBottom: 8 }}>Who sees it?</span>
        {V.map(([k, label, sub]) => {
          const on = vis === k;
          return (
            <button key={k} type="button" role="radio" aria-checked={on} onClick={() => setVis(k)} style={{ display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', border: 0, borderTop: '1px solid #000000', background: on ? '#D8F75A' : 'transparent', color: '#000000', fontFamily: 'inherit', padding: `14px ${on ? '12px' : '0'}`, cursor: 'pointer' }}>
              <span style={{ width: 22, height: 22, flexShrink: 0, borderRadius: '50%', border: '1.5px solid #000000', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ width: 12, height: 12, borderRadius: '50%', background: on ? '#000000' : 'transparent' }} /></span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1 }}><span style={{ fontSize: 18 }}>{label}</span><span style={{ fontSize: 13, color: '#3A3220' }}>{sub}</span></span>
            </button>
          );
        })}
      </section>

      <section style={{ margin: '22px 20px 0', borderTop: '1px solid #000000', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 6, fontWeight: 500, fontSize: 13 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}><span>Your contribution</span><span>${cents2(cents)}</span></div>
        <span>No fee added. All of it goes to {forName}.</span>
      </section>

      <div style={{ padding: '22px 16px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {err}
        {signedIn ? (
          <button type="submit" onClick={goPay} disabled={pending || tooSmall} style={{ display: 'block', width: '100%', textAlign: 'center', border: 0, background: '#000000', color: '#FFFFFF', fontFamily: 'inherit', fontSize: 17, padding: '17px 0', borderRadius: 999, cursor: 'pointer', opacity: pending || tooSmall ? 0.5 : 1 }}>{pending ? 'Sending…' : `Contribute $${amt}`}</button>
        ) : (
          <>
            <Link href={signupHref} style={{ display: 'block', textAlign: 'center', textDecoration: 'none', background: '#000000', color: '#FFFFFF', fontSize: 17, padding: '17px 0', borderRadius: 999 }}>Confirm your number to give</Link>
            <span style={{ textAlign: 'center', fontSize: 13 }}>One code, no password. That's your account.</span>
          </>
        )}
      </div>
    </form>
  );
}
