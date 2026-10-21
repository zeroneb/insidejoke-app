'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { Blob } from '@/components/ui';
import { give } from '@/lib/actions';

const fmt = (cents) => '$' + (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);

function shortName(name) {
  const w = (name || 'this').split(/\s+/).filter(Boolean);
  return (w.length > 2 ? w.slice(-2).join(' ') : w.join(' ')).toLowerCase();
}

export default function GiveForm({ slug, item, forName, signedIn, hasPayment, initialMode }) {
  const [state, action, pending] = useActionState(give, null);
  const chips = [1000, 2500, 5000].filter((c) => c < item.remaining);
  const [pick, setPick] = useState(initialMode === 'rest' ? 'rest' : chips[1] ? String(chips[1]) : chips[0] ? String(chips[0]) : 'rest');
  const [custom, setCustom] = useState('');
  const [units, setUnits] = useState(1);
  const [vis, setVis] = useState('public');
  const [payKind, setPayKind] = useState('apple');
  const [note, setNote] = useState('');
  const needPayment = state?.needPayment || (signedIn && !hasPayment);

  let cents = 0;
  if (item.unlimited) cents = units * item.price_cents;
  else if (pick === 'rest') cents = item.remaining;
  else if (pick === 'custom') cents = Math.min(item.remaining, Math.round(parseFloat(custom.replace(/[^0-9.]/g, '') || '0') * 100));
  else cents = parseInt(pick, 10);
  const short = shortName(item.name);
  const selfPath = `/l/${slug}/i/${item.id}/give${initialMode === 'rest' ? '?mode=rest' : ''}`;

  return (
    <form action={action} className="gv">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="itemId" value={item.id} />
      <input type="hidden" name="mode" value={pick === 'rest' ? 'rest' : 'amount'} />
      <input type="hidden" name="amount" value={pick === 'custom' ? 'custom' : pick === 'rest' ? '' : String(parseInt(pick, 10) / 100)} />
      <input type="hidden" name="units" value={units} />
      <input type="hidden" name="visibility" value={vis} />
      {needPayment ? <input type="hidden" name="payKind" value={payKind} /> : null}
      {needPayment && payKind === 'card' ? <input type="hidden" name="last4" value="4242" /> : null}

      <header className="hdr">
        <Link href={`/l/${slug}/i/${item.id}`} aria-label="Close" className="iconbtn">
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
        </Link>
        <span style={{ fontSize: 15 }}>{item.name}</span>
        <span style={{ width: 44 }} />
      </header>

      <section style={{ padding: '14px 20px 0' }}>
        <h1 style={{ margin: 0, fontWeight: 400, fontSize: 42, lineHeight: 0.98, letterSpacing: '-0.04em' }}>
          {item.unlimited ? <>Treat {forName} to <span className="it">{short}</span></> : <>Contribute to {forName}'s <span className="it">{short}</span></>}
        </h1>
      </section>

      <section className="gv-amt">
        <Blob seed={9} color="#D8F75A" style={{ left: 30, top: 0 }} width={330} height={200} />
        <div className="gv-amtin">
          <span className="dot" aria-live="polite" style={{ fontSize: 60, lineHeight: 1 }}>{fmt(cents)}</span>
          <span style={{ fontWeight: 500, fontSize: 12 }}>Only you see this amount</span>
        </div>
      </section>

      {item.unlimited ? (
        <section className="sec" style={{ gap: 8 }}>
          <span className="lbl">How many?</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="gv-step">
              <button type="button" onClick={() => setUnits(Math.max(1, units - 1))} aria-label="One fewer">−</button>
              <span className="dot" style={{ minWidth: 44, textAlign: 'center', fontSize: 24 }}>{units}</span>
              <button type="button" onClick={() => setUnits(Math.min(50, units + 1))} aria-label="One more">+</button>
            </div>
            <span style={{ fontSize: 14 }}>{fmt(item.price_cents)} each</span>
          </div>
        </section>
      ) : (
        <div role="radiogroup" aria-label="Amount" className="gv-chips">
          {chips.map((c) => (
            <label key={c} className={'gv-chip' + (pick === String(c) ? ' on' : '')}>
              <input type="radio" name="pickAmount" value={c} checked={pick === String(c)} onChange={() => setPick(String(c))} className="sr" />
              {fmt(c)}
            </label>
          ))}
          <label className={'gv-chip' + (pick === 'rest' ? ' on' : '')}>
            <input type="radio" name="pickAmount" value="rest" checked={pick === 'rest'} onChange={() => setPick('rest')} className="sr" />
            The rest
          </label>
          <label className={'gv-chip gv-custom' + (pick === 'custom' ? ' on' : '')}>
            <input type="radio" name="pickAmount" value="custom" checked={pick === 'custom'} onChange={() => setPick('custom')} className="sr" />
            <span className="dot" style={{ fontSize: 18 }}>$</span>
            <input name="custom" inputMode="decimal" placeholder="Your own amount" value={custom} onFocus={() => setPick('custom')} onChange={(e) => { setCustom(e.target.value); setPick('custom'); }} className="gv-customin" aria-label="Your own amount" />
          </label>
        </div>
      )}

      <section className="sec" style={{ gap: 8, paddingTop: 24 }}>
        <label htmlFor="note" style={{ fontSize: 15 }}>Add a note for {forName}</label>
        <textarea id="note" name="note" rows={3} className="input" placeholder={item.unlimited ? 'breakfast is on me today' : 'for every winter walk'} value={note} onChange={(e) => setNote(e.target.value.slice(0, 280))} />
      </section>

      <section role="radiogroup" aria-label="Who sees your contribution" style={{ padding: '22px 20px 0', display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 15, paddingBottom: 8 }}>Who sees it?</span>
        {[['public', 'Public', 'Your name and note show on the item'], ['private', 'Private', `Only ${forName} sees your name and note`]].map(([k, l, sub]) => (
          <label key={k} className={'gv-vis' + (vis === k ? ' on' : '')}>
            <input type="radio" name="pickVis" value={k} checked={vis === k} onChange={() => setVis(k)} className="sr" />
            <span className="gv-radio"><span /></span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontSize: 18 }}>{l}</span><span style={{ fontSize: 13, color: '#3A3220' }}>{sub}</span></span>
          </label>
        ))}
      </section>

      <section className="gv-sum">
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}><span>Your {item.unlimited ? 'treat' : 'contribution'}</span><span>{fmt(cents)}</span></div>
        <span>No fee added. All of it goes to {forName}.</span>
      </section>

      {signedIn && needPayment ? (
        <section className="gv-pay pop">
          <h2 className="wide seclbl" style={{ fontSize: 13, letterSpacing: '0.14em' }}>Set up payment once</h2>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.4 }}>Like Venmo. After this, every gift is one tap.</p>
          {[['apple', 'Apple Pay'], ['card', 'Card'], ['bank', 'Bank']].map(([k, l]) => (
            <label key={k} className={'gv-vis' + (payKind === k ? ' on' : '')}>
              <input type="radio" name="pickPay" value={k} checked={payKind === k} onChange={() => setPayKind(k)} className="sr" />
              <span className="gv-radio"><span /></span>
              <span style={{ fontSize: 18 }}>{l}</span>
            </label>
          ))}
          {payKind === 'card' ? (
            <div className="field pop">
              <label htmlFor="cardnum">Card number</label>
              <input id="cardnum" className="input" inputMode="numeric" defaultValue="4242 4242 4242 4242" style={{ fontFamily: 'Doto, monospace', fontWeight: 900, fontSize: 18 }} />
              <span className="muted" style={{ fontSize: 12 }}>Test mode: nothing is charged.</span>
            </div>
          ) : null}
        </section>
      ) : null}

      {state?.error ? <p className="err" style={{ margin: '18px 20px 0' }}>{state.error}</p> : null}

      <div style={{ padding: '22px 16px 32px' }}>
        {signedIn ? (
          <button type="submit" className="btn" disabled={pending || cents < 100}>
            {pending ? 'Sending…' : item.unlimited ? `Send ${units > 1 ? units + ' treats' : 'treat'} · ${fmt(cents)}` : `Contribute ${fmt(cents)}`}
          </button>
        ) : (
          <Link href={`/signup?ctx=give&for=${encodeURIComponent(forName)}&next=${encodeURIComponent(selfPath)}`} className="btn">Confirm your number to give</Link>
        )}
        {!signedIn ? <p className="muted" style={{ margin: '12px 0 0', textAlign: 'center', fontSize: 13 }}>One code, no password. That's your account.</p> : null}
      </div>
    </form>
  );
}
