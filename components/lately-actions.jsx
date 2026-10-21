'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { react } from '@/lib/actions';
import { replyToGiver } from '@/lib/actions-a1';

// r1: the Lately row's buttons (Option 10 Home): emoji reaction (smiley + top emoji + count),
// reply by text, See item / See list. Tapping the smiley opens a small emoji row; picking the
// same emoji again takes the reaction back.
const EMOJI = ['❤️', '😋', '🎉', '🙌', '🥹', '👀'];
const PILL = { border: '1.5px solid #000000', background: 'transparent', height: 34, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontFamily: 'inherit', color: '#000000' };
const Smile = () => <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5c1 1.4 2.2 2 3.5 2s2.5-.6 3.5-2" /><path d="M9 9.5h.01" /><path d="M15 9.5h.01" /></svg>;

export default function LatelyActions({ cid, top = null, count = 0, mine = null, href, see = 'See item', toName = 'them', delay = 0 }) {
  const [pick, setPick] = useState(false);
  const [open, setOpen] = useState(false);
  const [state, act, pending] = useActionState(replyToGiver, null);
  const sent = state?.ok && !pending;
  return (
    <>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
        <button type="button" onClick={() => setPick(!pick)} aria-expanded={pick ? 'true' : 'false'} aria-label={count ? `React with an emoji, ${count} so far` : 'React with an emoji'} style={{ ...PILL, padding: '0 10px', gap: 6, fontSize: 14, background: pick ? '#D4FA4F' : 'transparent' }}>
          <Smile />
          {top ? <span className="wig" style={{ animationDelay: `${-delay * 0.35}s` }}>{top}</span> : null}
          {count ? <span>{count}</span> : null}
        </button>
        <button type="button" aria-label={`Reply to ${toName} by text`} aria-expanded={open ? 'true' : 'false'} onClick={() => setOpen(!open)} style={{ ...PILL, width: 40, padding: 0, background: open ? '#000000' : 'transparent' }}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={open ? '#FFFFFF' : '#000000'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16v11H9l-5 4z" /></svg>
        </button>
        <Link href={href} style={{ marginLeft: 2, display: 'flex', alignItems: 'center', gap: 4, height: 34, padding: '0 12px', borderRadius: 999, background: '#000000', color: '#FFFFFF', textDecoration: 'none', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>{see}<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg></Link>
      </div>
      {pick ? (
        <form action={react} onSubmit={() => setPick(false)} className="a1up" role="group" aria-label="Pick a reaction" style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
          <input type="hidden" name="contributionId" value={cid} />
          {EMOJI.map((e) => (
            <button key={e} name="emoji" value={e} aria-pressed={mine === e ? 'true' : 'false'} aria-label={`React ${e}`} style={{ width: 44, height: 40, borderRadius: 999, border: '1.5px solid #000000', background: mine === e ? '#D4FA4F' : '#FFFFFF', fontSize: 18, cursor: 'pointer', padding: 0 }}>{e}</button>
          ))}
        </form>
      ) : null}
      {open ? (
        sent ? (
          <p className="a1up" role="status" style={{ margin: '4px 0 0', fontSize: 13 }}><span style={{ background: '#D4FA4F', padding: '3px 8px' }}>Texted to {state.to}.</span></p>
        ) : (
          <form action={act} className="a1up" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
            <input type="hidden" name="contributionId" value={cid} />
            <label htmlFor={`r-${cid}`} className="sr">Reply to {toName}</label>
            <input id={`r-${cid}`} name="body" autoFocus maxLength={280} placeholder={`Text ${toName} back`} required
              style={{ flexGrow: 1, minWidth: 0, height: 40, border: '1.5px solid #000000', background: '#FFFFFF', fontFamily: 'inherit', fontSize: 15, padding: '0 12px', borderRadius: 0, color: '#000' }} />
            <button disabled={pending} style={{ height: 40, padding: '0 14px', borderRadius: 999, border: 0, background: '#000000', color: '#FFFFFF', fontFamily: 'inherit', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>{pending ? 'Sending…' : 'Send'}</button>
          </form>
        )
      ) : null}
      {state?.error && open ? <span className="err" style={{ fontSize: 13 }}>{state.error}</span> : null}
    </>
  );
}
