'use client';

// a3: Option 13 Contribute (wish, yellow) and Treat (treat, green).
import { useActionState, useState } from 'react';
import Link from 'next/link';
import { Blob, shortNoun } from '@/components/ui';
import { PaymentPicker, usePayment, splitPayLabel } from '@/components/payment-setup';
import { give } from '@/lib/actions';

const dollars = (cents) => (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
const lastWord = shortNoun;
const article = (w) => (/^[aeiou]/.test(w) ? 'an' : 'a');
const X = <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>;

function Vis({ vis, setVis, options, subInk }) {
  return options.map(([k, label, sub]) => {
    const on = vis === k;
    return (
      <button key={k} type="button" role="radio" aria-checked={on} onClick={() => setVis(k)} style={{ display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', border: 0, borderTop: '1px solid #000000', background: on ? '#D8F75A' : 'transparent', color: '#000000', fontFamily: 'inherit', padding: `14px ${on ? '12px' : '0'}`, minHeight: 64, cursor: 'pointer' }}>
        <span style={{ width: 22, height: 22, flexShrink: 0, borderRadius: '50%', border: '1.5px solid #000000', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ width: 12, height: 12, borderRadius: '50%', background: on ? '#000000' : 'transparent' }} /></span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1 }}><span style={{ fontSize: 17 }}>{label}</span><span style={{ fontSize: 13, color: subInk }}>{sub}</span></span>
      </button>
    );
  });
}

function PayRow({ label, changeHref }) {
  const [brand, digits] = splitPayLabel(label);
  return (
    <Link href={changeHref} aria-label={`Change payment method, ${label}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', padding: '14px 0', fontSize: 15, color: '#000000', minHeight: 48, boxSizing: 'border-box' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="12" /><path d="M3 10h18" /></svg>
        {brand} {digits ? <span className="dot" style={{ fontSize: 15 }}>{digits}</span> : null}
      </span>
      <span style={{ fontSize: 13, textDecoration: 'underline', textUnderlineOffset: 3 }}>Change</span>
    </Link>
  );
}

export default function GiveForm({ slug, item, forName, signedIn, payLabel, initialMode }) {
  const [state, action, pending] = useActionState(give, null);
  const treat = item.unlimited;
  const chips = [1000, 2500, 5000].filter((c) => c < item.remaining);
  const [pick, setPick] = useState(initialMode === 'rest' ? 'rest' : chips.includes(2500) ? '2500' : chips[0] ? String(chips[0]) : 'rest');
  const [custom, setCustom] = useState('');
  const [units, setUnits] = useState(1);
  const [vis, setVis] = useState('public');
  const [note, setNote] = useState('');
  const pay = usePayment('apple');
  const needPayment = signedIn && (!payLabel || state?.needPayment);

  let cents = 0;
  if (treat) cents = units * item.price_cents;
  else if (pick === 'rest') cents = item.remaining;
  else if (pick === 'custom') cents = Math.min(item.remaining, Math.round(parseFloat(custom.replace(/[^0-9.]/g, '') || '0') * 100));
  else cents = parseInt(pick, 10);

  const short = lastWord(item.name);
  const selfPath = `/l/${slug}/i/${item.id}/give${initialMode === 'rest' ? '?mode=rest' : ''}`;
  const bg = treat ? '#96E084' : '#E3C552';
  const subInk = treat ? '#1F3A14' : '#3A3220';
  const visLine = vis === 'public' ? `${forName} sees your name and note, never the amount.` : `Only ${forName} knows it was you. Never the amount.`;
  const changeHref = `/you/payment?next=${encodeURIComponent(selfPath)}`;
  const amt = <span className="dot" style={{ fontSize: 18 }}>${dollars(cents)}</span>;

  const payBlock = !signedIn ? null : needPayment ? (
    <section className="pop" style={{ marginTop: 28, borderTop: '1px solid #000000', paddingTop: 16, display: 'flex', flexDirection: 'column' }}>
      <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em', paddingBottom: 6 }}>One-time setup</span>
      <h2 style={{ margin: '0 0 6px', fontWeight: 400, fontSize: 30, lineHeight: 0.98, letterSpacing: '-0.04em' }}>Set up paying <span className="serif" style={{ fontStyle: 'italic' }}>once</span></h2>
      <p style={{ margin: '0 0 16px', fontSize: 15, lineHeight: 1.4 }}>After this, every gift is one tap.</p>
      <input type="hidden" name="payKind" value={pay.kind} />
      <input type="hidden" name="last4" value={pay.last4} />
      <input type="hidden" name="cardFirst" value={pay.first} />
      <PaymentPicker forName={forName} kind={pay.kind} onKind={pay.setKind} card={pay.card} onCard={pay.setCard} />
      <p style={{ margin: '12px 0 0', fontSize: 13, color: '#3A3A3A' }}>Saved for next time. Change it anytime in settings. Test mode: nothing is charged.</p>
    </section>
  ) : (
    <section style={{ marginTop: treat ? 24 : 28, borderTop: '1px solid #000000', display: 'flex', flexDirection: 'column' }}>
      <PayRow label={payLabel} changeHref={changeHref} />
    </section>
  );

  const submit = (label) => (
    <div style={{ padding: treat ? '8px 0 36px' : '8px 0 36px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {state?.error ? <p className="err" style={{ margin: '8px 0 0' }}>{state.error}</p> : null}
      {signedIn ? (
        <button type="submit" disabled={pending || cents < 100} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: 0, background: '#000000', color: '#FFFFFF', fontFamily: 'inherit', fontWeight: 800, fontSize: 16, height: 58, borderRadius: 999, cursor: 'pointer', opacity: pending || cents < 100 ? 0.5 : 1, marginTop: needPayment ? 16 : 0 }}>
          {pending ? 'Sending…' : label}
        </button>
      ) : (
        <Link href={`/signup?ctx=give&for=${encodeURIComponent(forName)}&next=${encodeURIComponent(selfPath)}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', background: '#000000', color: '#FFFFFF', fontWeight: 800, fontSize: 16, height: 58, borderRadius: 999, marginTop: 20 }}>Confirm your number to give</Link>
      )}
      <span style={{ textAlign: 'center', fontSize: 13, color: subInk }}>{signedIn ? visLine : "One code, no password. That's your account."}</span>
    </div>
  );

  const hidden = (
    <>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="itemId" value={item.id} />
      <input type="hidden" name="mode" value={treat ? 'treat' : pick === 'rest' ? 'rest' : 'amount'} />
      <input type="hidden" name="amount" value={pick === 'custom' ? 'custom' : pick === 'rest' ? '' : String(parseInt(pick, 10) / 100)} />
      <input type="hidden" name="custom" value={custom} />
      <input type="hidden" name="units" value={units} />
      <input type="hidden" name="visibility" value={vis} />
    </>
  );

  const header = (label) => (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 0 8px' }}>
      <Link href={treat ? `/l/${slug}` : `/l/${slug}/i/${item.id}`} aria-label="Close" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{X}</Link>
      <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em' }}>{label}</span>
      <div style={{ width: 44 }} />
    </header>
  );

  const noteBox = (
    <>
      <label htmlFor="note" style={{ fontSize: 15, fontWeight: 700 }}>A note for {forName}</label>
      {treat ? (
        <input id="note" name="note" value={note} onChange={(e) => setNote(e.target.value.slice(0, 280))} placeholder="rough monday, eat this" style={{ height: 54, boxSizing: 'border-box', border: '1.5px solid #000000', background: '#FFFFFF', fontFamily: "'EB Garamond', serif", fontStyle: 'italic', fontSize: 20, padding: '0 14px', color: '#000000', borderRadius: 0, width: '100%' }} />
      ) : (
        <textarea id="note" name="note" rows={3} value={note} onChange={(e) => setNote(e.target.value.slice(0, 280))} placeholder="for every winter walk" style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #000000', background: '#FFFFFF', resize: 'none', fontFamily: "'EB Garamond', serif", fontStyle: 'italic', fontSize: 20, lineHeight: 1.3, padding: '12px 14px', borderRadius: 0, color: '#000000' }} />
      )}
    </>
  );

  if (treat) {
    const word = lastWord(item.name);
    const tileName = (item.name || '').split(/\s+/).filter(Boolean).slice(-2);
    return (
      <form action={action} style={{ minHeight: '100vh', boxSizing: 'border-box', background: bg, color: '#000000', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {hidden}
        {header('A treat')}
        <section style={{ padding: '16px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h1 style={{ margin: 0, fontWeight: 400, fontSize: 46, lineHeight: 0.96, letterSpacing: '-0.035em' }}>Treat {forName} to {article(word)} <span className="it">{word}</span></h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.4, color: subInk }}>{item.name}{item.store ? ` from ${item.store}` : ''}. Anyone can send one, as many times as they like.</p>
        </section>
        <section aria-label={`${item.name}, treated ${item.timesTreated} times`} style={{ position: 'relative', height: 300, marginTop: 10 }}>
          <div aria-hidden="true" className="a3-dia" style={{ position: 'absolute', left: '50%', marginLeft: -100, top: 35, width: 200, height: 200, background: '#E8642C', transform: 'rotate(45deg)' }} />
          <p className="dot" style={{ position: 'absolute', left: 0, right: 0, top: tileName.length > 1 ? 94 : 116, margin: 0, textAlign: 'center', fontSize: 46, lineHeight: 0.95, color: '#000000', textTransform: 'uppercase' }}>{tileName.map((w, i) => <span key={i}>{i ? <br /> : null}{w}</span>)}</p>
          <p className="dot a3-tick" aria-live="polite" style={{ position: 'absolute', right: 20, top: 232, margin: 0, fontSize: 44, lineHeight: 1 }}>×{item.timesTreated}</p>
          <p style={{ position: 'absolute', left: 20, top: 244, margin: 0, fontSize: 13, lineHeight: 1.35, color: subInk }}>{item.timesTreated ? <>sent so far,<br />by {item.givers} {item.givers === 1 ? 'friend' : 'friends'}</> : <>none yet,<br />be the first</>}</p>
        </section>
        <div aria-hidden="true" style={{ overflow: 'hidden', whiteSpace: 'nowrap', background: '#000000', color: '#96E084', padding: '8px 0' }}><span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em' }}>{Array.from({ length: 8 }, () => `Treat ${forName}`).join(' · ')}</span></div>
        <section style={{ padding: '0 20px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #000000' }}>
            <span style={{ fontSize: 17, fontWeight: 700 }}>How many?</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button type="button" onClick={() => setUnits(Math.max(1, units - 1))} aria-label="One fewer" style={{ width: 44, height: 44, border: '1.5px solid #000000', background: 'transparent', borderRadius: '50%', fontSize: 22, fontFamily: 'inherit', cursor: 'pointer', color: '#000000' }}>−</button>
              <span key={units} className="dot a3-tick" aria-live="polite" style={{ width: 50, textAlign: 'center', fontSize: 28 }}>{units}</span>
              <button type="button" onClick={() => setUnits(Math.min(20, units + 1))} aria-label="One more" style={{ width: 44, height: 44, border: '1.5px solid #000000', background: '#000000', color: '#FFFFFF', borderRadius: '50%', fontSize: 22, fontFamily: 'inherit', cursor: 'pointer' }}>+</button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '24px 0 0' }}>{noteBox}</div>
          <div role="radiogroup" aria-label="Who sees it was you" style={{ padding: '24px 0 0', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 15, fontWeight: 700, paddingBottom: 8 }}>Who sees it was you?</span>
            <Vis vis={vis} setVis={setVis} subInk={subInk} options={[['public', 'Public', `Your name and note show on ${forName}'s list`], ['private', 'Private', `Only ${forName} sees it was you`]]} />
          </div>
          {payBlock}
          {submit(<>Treat {forName} · {amt}</>)}
        </section>
      </form>
    );
  }

  const onCustom = pick === 'custom';
  return (
    <form action={action} style={{ minHeight: '100vh', boxSizing: 'border-box', background: bg, color: '#000000', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {hidden}
      {header('Chip in')}
      <section style={{ padding: '16px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h1 style={{ margin: 0, fontWeight: 400, fontSize: 46, lineHeight: 0.96, letterSpacing: '-0.035em' }}>Chip in on {forName}'s <span className="it">{short}</span></h1>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.4, color: subInk }}>
          {item.name}{item.store ? ` from ${item.store}` : ''}.{' '}
          {item.pct > 0 ? <><span className="dot" style={{ fontSize: 15, color: '#000000' }}>{item.pct}%</span> covered so far by {item.givers} {item.givers === 1 ? 'friend' : 'friends'}.</> : 'Nobody has chipped in yet.'}
        </p>
      </section>

      <section aria-label="Your amount" style={{ position: 'relative', marginTop: 18, height: 236 }}>
        <Blob seed={9} color="#D8F75A" style={{ left: '50%', marginLeft: -160, top: 0 }} width={320} height={236} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <span key={cents} className="dot a3-tick" aria-live="polite" style={{ fontSize: dollars(cents).length > 4 ? 60 : 80, lineHeight: 0.9 }}>${dollars(cents)}</span>
          <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em', background: '#13286B', color: '#FFFFFF', padding: '5px 9px' }}>Only you see this amount</span>
        </div>
      </section>

      <div role="radiogroup" aria-label="Pick an amount" style={{ padding: '20px 20px 0', display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
        {[...chips.map((c) => [String(c), '$' + c / 100]), ['rest', 'The rest']].map(([k, label]) => {
          const on = pick === k;
          return <button key={k} type="button" role="radio" aria-checked={on} onClick={() => setPick(k)} style={{ height: 48, border: '1.5px solid #000000', background: on ? '#000000' : 'transparent', color: on ? '#FFFFFF' : '#000000', fontFamily: 'inherit', fontWeight: 700, fontSize: 15, borderRadius: 999, cursor: 'pointer', padding: 0 }}>{label}</button>;
        })}
      </div>
      <div style={{ padding: '8px 20px 0', display: 'flex', gap: 8, alignItems: 'stretch' }}>
        <label htmlFor="customIn" className="sr">Your own amount</label>
        <span style={{ flex: '1 1 0', minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, height: 48, boxSizing: 'border-box', border: '1.5px solid #000000', background: onCustom ? '#D8F75A' : '#FFFFFF', borderRadius: 999, padding: '0 18px' }}>
          <span className="dot" style={{ fontSize: 18 }}>$</span>
          <input id="customIn" value={custom} inputMode="decimal" placeholder="Your own amount" onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (custom) setPick('custom'); } }} style={{ flex: '1 1 0', width: '100%', minWidth: 0, border: 0, background: 'transparent', fontFamily: "'Doto', monospace", fontWeight: 900, fontSize: 18, color: '#000000', outline: 'none' }} />
        </span>
        <button type="button" onClick={() => custom && setPick('custom')} aria-pressed={onCustom} style={{ flexShrink: 0, height: 48, border: '1.5px solid #000000', background: onCustom ? '#000000' : 'transparent', color: onCustom ? '#FFFFFF' : '#000000', fontFamily: 'inherit', fontWeight: 700, fontSize: 15, padding: '0 18px', borderRadius: 999, cursor: 'pointer', whiteSpace: 'nowrap' }}>Use this</button>
      </div>
      <p style={{ margin: '10px 20px 0', fontSize: 13, lineHeight: 1.4, color: subInk }}>The rest is what is still open on the {short}. Pick it and {forName}'s wish is done.</p>

      <section style={{ margin: '28px 20px 0', borderTop: '1px solid #000000', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>{noteBox}</section>

      <section role="radiogroup" aria-label="Who sees your name" style={{ margin: '28px 20px 0', borderTop: '1px solid #000000', paddingTop: 16, display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 15, fontWeight: 700, paddingBottom: 8 }}>Who sees it was you?</span>
        <Vis vis={vis} setVis={setVis} subInk={subInk} options={[['public', 'Public', 'Your name and note show on the item'], ['private', 'Private', `Only ${forName} sees your name and note`]]} />
      </section>

      <div style={{ padding: '0 20px' }}>
        {payBlock}
        {submit(<>Pay {amt} for {forName}</>)}
      </div>
    </form>
  );
}
