'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { sendMessage } from '@/lib/actions-a1';

// The composer at the bottom of a message thread (/messages/<id>). Saves in the app, never texts.
// Keeps the newest message in view, clears after sending, and checks for replies while the page is open.
export default function MessageForm({ userId, name, count }) {
  const [state, act, pending] = useActionState(sendMessage, null);
  const form = useRef(null);
  const field = useRef(null);
  const router = useRouter();

  useEffect(() => { if (state?.ok) { form.current?.reset(); field.current?.focus(); } }, [state]);
  useEffect(() => { window.scrollTo(0, document.documentElement.scrollHeight); }, [count]);
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') router.refresh(); }, 8000);
    return () => clearInterval(t);
  }, [router]);

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); form.current?.requestSubmit(); }
  };

  return (
    <form ref={form} action={act} className="dm-compose" style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 16px 12px', boxSizing: 'border-box', background: 'var(--bg, #ECECEF)', borderTop: '1px solid var(--line, #000000)' }}>
      <input type="hidden" name="userId" value={userId} />
      <span style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <label htmlFor="dm-body" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Message {name}</label>
        <textarea ref={field} id="dm-body" name="body" rows={1} maxLength={500} required onKeyDown={onKey} placeholder={`Message ${name}`}
          style={{ flexGrow: 1, minWidth: 0, minHeight: 44, maxHeight: 120, resize: 'none', fieldSizing: 'content', border: '1.5px solid var(--line, #000000)', background: 'var(--surface, #FFFFFF)', fontFamily: 'inherit', fontSize: 16, lineHeight: 1.35, padding: '10px 12px', borderRadius: 0, color: 'var(--ink, #000)' }} />
        <button disabled={pending} aria-label="Send" style={{ height: 44, padding: '0 18px', borderRadius: 999, border: 0, background: 'var(--inv-bg, #000000)', color: 'var(--inv-fg, #FFFFFF)', fontFamily: 'inherit', fontWeight: 800, fontSize: 15, cursor: 'pointer', flexShrink: 0 }}>{pending ? 'Sending…' : 'Send'}</button>
      </span>
      {state?.error ? <span className="err">{state.error}</span> : null}
    </form>
  );
}
