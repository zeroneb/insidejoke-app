'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { react } from '@/lib/actions';
import { replyToGiver } from '@/lib/actions-a1';

// a1: the Lately row's buttons (Option 13 Home): heart (react ❤️), reply by text, See item / See list.
// Reply opens a small form under the row; the text goes to the friend through sendText.
export default function LatelyActions({ cid, hearts = 0, mine = false, href, see = 'See item', toName = 'them' }) {
  const [open, setOpen] = useState(false);
  const [state, act, pending] = useActionState(replyToGiver, null);
  const sent = state?.ok && !pending;
  return (
    <>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
        <form action={react}>
          <input type="hidden" name="contributionId" value={cid} />
          <input type="hidden" name="emoji" value="❤️" />
          <button className="a1-heart" aria-label={hearts ? `Like, ${hearts} so far` : 'Like'} aria-pressed={mine ? 'true' : 'false'}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill={mine ? '#000000' : 'none'} stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>
            {hearts ? <span className="dot" style={{ fontSize: 14 }}>{hearts}</span> : null}
          </button>
        </form>
        <button type="button" className="a1-reply" aria-label={`Reply to ${toName} by text`} aria-expanded={open ? 'true' : 'false'} onClick={() => setOpen(!open)}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={open ? '#FFFFFF' : '#000000'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16v11H9l-5 4z" /></svg>
        </button>
        <Link href={href} className="a1-see">{see}<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg></Link>
      </div>
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
