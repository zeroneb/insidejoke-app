'use client';

import { useActionState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { addFriendByPhone } from '@/lib/actions-a1';

// a1: add a friend by phone. On insidejoke: friends both ways. Not yet: we text them an invite.
export default function AddFriendForm({ defaultPhone = '' }) {
  const [state, act, pending] = useActionState(addFriendByPhone, null);
  const ref = useRef(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={act} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label htmlFor="friendphone" className="a1-cap" style={{ fontSize: 10 }}>Add a friend by number</label>
      <span style={{ display: 'flex', height: 56, border: '1.5px solid var(--line, #000000)', background: 'var(--surface, #FFFFFF)', boxSizing: 'border-box' }}>
        <span className="dot" style={{ display: 'flex', alignItems: 'center', padding: '0 14px', borderRight: '1.5px solid var(--line, #000000)', fontSize: 20 }}>+1</span>
        <input id="friendphone" name="phone" defaultValue={defaultPhone} inputMode="tel" autoComplete="tel" placeholder="(917) 555-0123" required
          style={{ flexGrow: 1, minWidth: 0, border: 0, background: 'transparent', fontFamily: "'Doto', monospace", fontWeight: 900, fontSize: 22, padding: '0 12px', color: 'var(--ink, #000)', outline: 'none', borderRadius: 0 }} />
        <button disabled={pending} style={{ border: 0, borderLeft: '1.5px solid var(--inv-bg, #000000)', background: 'var(--inv-bg, #000000)', color: 'var(--inv-fg, #FFFFFF)', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, padding: '0 16px', cursor: 'pointer' }}>{pending ? '…' : 'Add'}</button>
      </span>
      {state?.error ? <div className="err" role="alert">{state.error}</div> : null}
      {state?.ok && state.added ? (
        <p role="status" className="a1up" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}><span style={{ background: 'var(--lt, #D4FA4F)', padding: '3px 8px' }}>You and {state.added} are friends now. <Link href={`/u/${state.id}`} style={{ fontWeight: 700 }}>See profile</Link></span></p>
      ) : null}
      {state?.ok && state.invited ? (
        <p role="status" className="a1up" style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}><span style={{ background: 'var(--lt, #D4FA4F)', padding: '3px 8px' }}>Not on insidejoke yet. We texted them an invite.</span></p>
      ) : null}
      <span className="a1-s">If they are on insidejoke you become friends right away. If not, we text them one invite from you.</span>
    </form>
  );
}
