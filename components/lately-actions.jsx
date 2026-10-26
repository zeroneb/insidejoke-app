'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { react } from '@/lib/actions';
import { replyToGiver } from '@/lib/actions-a1';

// r1: the Lately row's buttons (Option 10 Home): emoji reaction (smiley + top emoji + count),
// reply by text, See item / See list. Tapping the smiley opens a small emoji row; picking the
// same emoji again takes the reaction back.
const QUICK = ['❤️', '😋', '🎉', '🙌', '🥹', '👀'];
const MORE = ['😍', '🔥', '✨', '🥂', '😂', '🤌', '💐', '🎂', '🍰', '☕️', '🥯', '🍕', '🛍️', '👢', '🕯️', '📚', '🌸', '🫶', '💃', '🤍', '😭', '🙏', '💯', '🍾']
const PILL = { border: '1.5px solid var(--edge, #000000)', background: 'transparent', height: 40, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--ink, #000000)' };
const Smile = () => <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="1.64" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5c1 1.4 2.2 2 3.5 2s2.5-.6 3.5-2" /><path d="M9 9.5h.01" /><path d="M15 9.5h.01" /></svg>;

export default function LatelyActions({ cid, chips = [], mine = [], href, see = 'See item', toName = 'them', delay = 0 }) {
  const [pick, setPick] = useState(false);
  const [more, setMore] = useState(false);
  const count = chips.reduce((t, c) => t + c.n, 0);
  const [open, setOpen] = useState(false);
  const [state, act, pending] = useActionState(replyToGiver, null);
  const sent = state?.ok && !pending;
  return (
    <>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
        {chips.length ? (
          <form action={react} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <input type="hidden" name="contributionId" value={cid} />
            {chips.map((c, i) => {
              const on = mine.includes(c.emoji);
              return <button key={c.emoji} name="emoji" value={c.emoji} aria-pressed={on ? 'true' : 'false'} aria-label={`${c.emoji} ${c.n}${on ? ', yours, tap to remove' : ', tap to add yours'}`} style={{ ...PILL, padding: '0 10px', gap: 5, fontSize: 14, background: on ? 'var(--lt, #D4FA4F)' : 'transparent' }}><span className={i === 0 ? 'wig' : undefined} style={i === 0 ? { animationDelay: `${-delay * 0.35}s` } : undefined}>{c.emoji}</span><span>{c.n}</span></button>;
            })}
          </form>
        ) : null}
        <button type="button" onClick={() => { setPick(!pick); setMore(false); }} aria-expanded={pick ? 'true' : 'false'} aria-label={count ? 'Add an emoji' : 'React with an emoji'} style={{ ...PILL, padding: '0 10px', gap: 4, fontSize: 14, background: pick ? 'var(--lt, #D4FA4F)' : 'transparent' }}>
          {count ? null : <Smile />}
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="2.13" strokeLinecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
        </button>
        <button type="button" aria-label={`Reply to ${toName} by text`} aria-expanded={open ? 'true' : 'false'} onClick={() => setOpen(!open)} style={{ ...PILL, width: 48, padding: 0, background: open ? 'var(--inv-bg, #000000)' : 'transparent' }}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={open ? 'var(--inv-fg, #FFFFFF)' : 'var(--ink, #000000)'} strokeWidth="1.64" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16v11H9l-5 4z" /></svg>
        </button>
        <Link href={href} style={{ marginLeft: 2, display: 'flex', alignItems: 'center', gap: 4, height: 40, padding: '0 14px', borderRadius: 999, background: 'var(--inv-bg, #000000)', color: 'var(--inv-fg, #FFFFFF)', textDecoration: 'none', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>{see}<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--inv-fg, #FFFFFF)" strokeWidth="1.96" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg></Link>
      </div>
      {pick ? (
        <form action={react} onSubmit={() => { setPick(false); setMore(false); }} className="a1up" role="group" aria-label="Pick a reaction" style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
          <input type="hidden" name="contributionId" value={cid} />
          {(more ? [...QUICK, ...MORE] : QUICK).map((e) => (
            <button key={e} name="emoji" value={e} aria-pressed={mine.includes(e) ? 'true' : 'false'} aria-label={`React ${e}`} style={{ width: 44, height: 40, borderRadius: 999, border: '1.5px solid var(--edge, #000000)', background: mine.includes(e) ? 'var(--lt, #D4FA4F)' : 'var(--surface, #FFFFFF)', fontSize: 18, cursor: 'pointer', padding: 0 }}>{e}</button>
          ))}
          {more ? null : <button type="button" onClick={() => setMore(true)} aria-label="More emojis" style={{ height: 40, padding: '0 12px', borderRadius: 999, border: '1.5px dashed var(--edge, #000000)', background: 'transparent', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: 'var(--ink, #000)' }}>More</button>}
        </form>
      ) : null}
      {open ? (
        sent ? (
          <p className="a1up" role="status" style={{ margin: '4px 0 0', fontSize: 13 }}><span style={{ background: 'var(--lt, #D4FA4F)', padding: '3px 8px' }}>Sent. {state.to} sees it here and gets it by text.</span></p>
        ) : (
          <form action={act} className="a1up" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
            <input type="hidden" name="contributionId" value={cid} />
            <label htmlFor={`r-${cid}`} className="sr">Reply to {toName}</label>
            <input id={`r-${cid}`} name="body" autoFocus maxLength={280} placeholder={`Text ${toName} back`} required
              style={{ flexGrow: 1, minWidth: 0, height: 40, border: '1.5px solid var(--line, #000000)', background: 'var(--surface, #FFFFFF)', fontFamily: 'inherit', fontSize: 15, padding: '0 12px', borderRadius: 0, color: 'var(--ink, #000)' }} />
            <button disabled={pending} style={{ height: 40, padding: '0 14px', borderRadius: 999, border: 0, background: 'var(--inv-bg, #000000)', color: 'var(--inv-fg, #FFFFFF)', fontFamily: 'inherit', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>{pending ? 'Sending…' : 'Send'}</button>
          </form>
        )
      ) : null}
      {state?.error && open ? <span className="err" style={{ fontSize: 13 }}>{state.error}</span> : null}
    </>
  );
}
