'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { react } from '@/lib/actions';
import { replyToGiver } from '@/lib/actions-a1';

// r1: the Lately row's buttons (Option 10 Home): emoji reactions (each emoji + count), comment (adds to the row's
// thread), See item / See list. Reactions sit on their own row above the buttons so they never pile into them.
// Tapping the smiley opens the quick picks plus a field for any emoji (the phone's own emoji keyboard);
// picking the same emoji again takes the reaction back.
const QUICK = ['❤️', '😋', '🎉', '🙌', '🥹', '👀'];
const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;
// The first emoji typed, kept whole (flags, skin tones and families are several characters).
export function firstEmoji(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  const g = typeof Intl !== 'undefined' && Intl.Segmenter ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s)].map((x) => x.segment) : Array.from(s);
  return g.find((x) => EMOJI.test(x)) || '';
}
const PILL = { border: '1.5px solid var(--edge, #000000)', background: 'transparent', height: 34, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--ink, #000000)' };
const Smile = ({ on }) => <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={on ? '#000000' : 'var(--ink, #000000)'} strokeWidth="1.64" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5c1 1.4 2.2 2 3.5 2s2.5-.6 3.5-2" /><path d="M9 9.5h.01" /><path d="M15 9.5h.01" /></svg>;

export default function LatelyActions({ cid, chips = [], mine = [], href, see = 'See item', give = null, toName = 'them', delay = 0 }) {
  const [pick, setPick] = useState(false);
  const count = chips.reduce((t, c) => t + c.n, 0);
  const [open, setOpen] = useState(false);
  const [state, act, pending] = useActionState(replyToGiver, null);
  const sent = state?.ok && !pending;
  return (
    <>
      {chips.length ? (
        <form action={react} aria-label="Reactions" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          <input type="hidden" name="contributionId" value={cid} />
          {chips.map((c, i) => {
            const on = mine.includes(c.emoji);
            return <button key={c.emoji} name="emoji" value={c.emoji} aria-pressed={on ? 'true' : 'false'} aria-label={`${c.emoji} ${c.n}${on ? ', yours, tap to remove' : ', tap to add yours'}`} style={{ ...PILL, height: 36, padding: '0 12px', gap: 6, fontSize: 15, fontWeight: 700, background: on ? 'var(--lt, #D4FA4F)' : 'transparent', color: on ? '#000000' : 'var(--ink, #000000)', borderColor: on ? '#000000' : undefined }}><span className={i === 0 ? 'wig' : undefined} style={{ fontSize: 18, lineHeight: 1, ...(i === 0 ? { animationDelay: `${-delay * 0.35}s` } : {}) }}>{c.emoji}</span><span>{c.n}</span></button>;
          })}
        </form>
      ) : null}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
        <button type="button" onClick={() => setPick(!pick)} aria-expanded={pick ? 'true' : 'false'} aria-label={count ? 'Add an emoji' : 'React with an emoji'} style={{ ...PILL, height: 36, padding: '0 10px', gap: 2, flexShrink: 0, background: pick ? 'var(--lt, #D4FA4F)' : 'transparent' }}>
          <Smile on={pick} />
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={pick ? '#000000' : 'var(--ink, #000000)'} strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
        </button>
        <button type="button" aria-label="Comment" aria-expanded={open ? 'true' : 'false'} onClick={() => setOpen(!open)} style={{ ...PILL, width: 44, height: 36, padding: 0, flexShrink: 0, background: open ? 'var(--inv-bg, #000000)' : 'transparent' }}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={open ? 'var(--inv-fg, #FFFFFF)' : 'var(--ink, #000000)'} strokeWidth="1.64" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16v11H9l-5 4z" /></svg>
        </button>
        <span style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 'auto' }}>
        <Link href={href} style={{ display: 'flex', alignItems: 'center', gap: 4, height: 36, padding: '0 12px', borderRadius: 999, background: 'var(--inv-bg, #000000)', color: 'var(--inv-fg, #FFFFFF)', textDecoration: 'none', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>{see}<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--inv-fg, #FFFFFF)" strokeWidth="1.96" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg></Link>
        {give ? <Link href={give} style={{ display: 'flex', alignItems: 'center', height: 36, padding: '0 12px', borderRadius: 999, background: '#D4FA4F', color: '#000000', border: '1.5px solid #000000', textDecoration: 'none', fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap' }}>Give</Link> : null}
        </span>
      </div>
      {pick ? <EmojiPicker cid={cid} mine={mine} onDone={() => setPick(false)} /> : null}
      {open ? (
        (
          <form key={state?.at || 0} action={act} className="a1up" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
            <input type="hidden" name="contributionId" value={cid} />
            <label htmlFor={`r-${cid}`} className="sr">Comment</label>
            <input id={`r-${cid}`} name="body" autoFocus maxLength={280} placeholder="Add a comment" required
              style={{ flexGrow: 1, minWidth: 0, height: 34, border: '1.5px solid var(--line, #000000)', background: 'var(--surface, #FFFFFF)', fontFamily: 'inherit', fontSize: 15, padding: '0 10px', borderRadius: 0, color: 'var(--ink, #000)' }} />
            <button disabled={pending} style={{ height: 34, padding: '0 11px', borderRadius: 999, border: 0, background: 'var(--inv-bg, #000000)', color: 'var(--inv-fg, #FFFFFF)', fontFamily: 'inherit', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>{pending ? 'Sending…' : 'Send'}</button>
          </form>
        )
      ) : null}
      {state?.error && open ? <span className="err" style={{ fontSize: 13 }}>{state.error}</span> : null}
    </>
  );
}

// Quick picks, plus a text field that brings up the phone's full emoji keyboard (or the laptop's emoji viewer).
// The first emoji typed is sent as the reaction; anything else typed is ignored.
function EmojiPicker({ cid, mine, onDone }) {
  const form = useRef(null);
  const field = useRef(null);
  const [typed, setTyped] = useState('');
  useEffect(() => { field.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => { if (typed) form.current?.requestSubmit(); }, [typed]);
  return (
    <form ref={form} action={react} onSubmit={() => { setTimeout(() => { setTyped(''); onDone(); }, 0); }} className="a1up" role="group" aria-label="Pick a reaction" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
      <input type="hidden" name="contributionId" value={cid} />
      {typed ? <input type="hidden" name="emoji" value={typed} /> : null}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {QUICK.map((e) => (
          <button key={e} name="emoji" value={e} aria-pressed={mine.includes(e) ? 'true' : 'false'} aria-label={`React ${e}`} style={{ width: 46, height: 40, borderRadius: 999, border: '1.5px solid var(--edge, #000000)', background: mine.includes(e) ? 'var(--lt, #D4FA4F)' : 'var(--surface, #FFFFFF)', fontSize: 20, cursor: 'pointer', padding: 0 }}>{e}</button>
        ))}
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44, border: '1.5px solid var(--line, #000000)', background: 'var(--surface, #FFFFFF)', padding: '0 12px', borderRadius: 999 }}>
        <span aria-hidden="true" style={{ fontSize: 18 }}>☺︎</span>
        <span className="sr">Any emoji</span>
        <input ref={field} enterKeyHint="send" autoComplete="off" autoCorrect="off" spellCheck={false} placeholder="Type any emoji" value=""
          onChange={(e) => { const g = firstEmoji(e.target.value); if (g) setTyped(g); }}
          onKeyDown={(e) => { if (e.key === 'Escape') onDone(); if (e.key === 'Enter') e.preventDefault(); }}
          style={{ flexGrow: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: 16, color: 'var(--ink, #000000)' }} />
      </label>
    </form>
  );
}
