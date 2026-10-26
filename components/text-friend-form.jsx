'use client';

import { useActionState } from 'react';
import { textFriend } from '@/lib/actions-a1';

// a1: the header's text button on a friend's profile opens this (via #text). Goes out through sendText.
export default function TextFriendForm({ userId, name }) {
  const [state, act, pending] = useActionState(textFriend, null);
  if (state?.ok && !pending) return <p role="status" className="a1up" style={{ margin: 0, fontSize: 14 }}><span style={{ background: 'var(--lt, #D4FA4F)', padding: '3px 8px' }}>Texted to {state.to}.</span></p>;
  return (
    <form action={act} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input type="hidden" name="userId" value={userId} />
      <label htmlFor="tf-body" className="a1-cap" style={{ fontSize: 10 }}>Text {name}</label>
      <span style={{ display: 'flex', gap: 8 }}>
        <input id="tf-body" name="body" maxLength={280} required placeholder={`Say hi to ${name}`} style={{ flexGrow: 1, minWidth: 0, height: 44, border: '1.5px solid var(--line, #000000)', background: 'var(--surface, #FFFFFF)', fontFamily: 'inherit', fontSize: 15, padding: '0 12px', borderRadius: 0, color: 'var(--ink, #000)' }} />
        <button disabled={pending} style={{ height: 44, padding: '0 16px', borderRadius: 999, border: 0, background: 'var(--inv-bg, #000000)', color: 'var(--inv-fg, #FFFFFF)', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>{pending ? 'Sending…' : 'Send'}</button>
      </span>
      {state?.error ? <span className="err">{state.error}</span> : null}
      <span className="a1-s">Your numbers stay private. We pass it on by text.</span>
    </form>
  );
}
