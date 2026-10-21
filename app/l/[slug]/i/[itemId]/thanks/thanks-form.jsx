'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Blob } from '@/components/ui';
import { PhotoPick } from '@/components/photo-pick';
import { sendItemThanks } from '@/lib/actions-a3';

export default function ThanksForm({ slug, itemId, word, count, already, listHref }) {
  const [state, action, pending] = useActionState(sendItemThanks, null);
  const done = state?.sent ? state : already;
  if (done) {
    const n = done.count;
    return (
      <>
        <section className="a3-pop" style={{ position: 'relative', margin: '24px 16px 0', height: 250 }}>
          <Blob seed={41} color="#D8F75A" style={{ left: 0, top: 0 }} width="100%" height={250} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 8, padding: '0 50px' }}>
            <span style={{ fontSize: 26, lineHeight: 1.05, letterSpacing: '-0.02em' }}>Thank-you <span className="it">sent</span></span>
            <span role="status" style={{ fontSize: 14, lineHeight: 1.35 }}>{n === 1 ? 'Your friend got' : n === 2 ? 'Both friends got' : `All ${n} friends got`} your text{done.photo ? ' and your photo' : ''}.</span>
            <Link href={listHref} style={{ marginTop: 4, fontSize: 14, color: '#000000', textDecoration: 'underline', textUnderlineOffset: 3, padding: 12 }}>Back to your list</Link>
          </div>
        </section>
      </>
    );
  }
  return (
    <form action={action} style={{ padding: '24px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="itemId" value={itemId} />
      <label htmlFor="msg" style={{ fontSize: 15, fontWeight: 700 }}>Your thank-you, to {count === 1 ? 'them' : `all ${count}`}</label>
      <textarea id="msg" name="message" rows={4} required maxLength={600} placeholder={`You all got me the ${word}!! Thank you for celebrating me.`} style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #000000', background: '#FFFFFF', color: '#000000', resize: 'none', fontFamily: "'EB Garamond', serif", fontStyle: 'italic', fontSize: 20, lineHeight: 1.3, padding: '12px 14px', borderRadius: 0 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 6 }}>
        <PhotoPick />
        <span style={{ fontSize: 14, lineHeight: 1.4, color: '#4A4A4A' }}>A photo of you with the {word}. Optional, and the thing they want most.</span>
      </div>
      {state?.error ? <p className="err" style={{ margin: 0 }}>{state.error}</p> : null}
      <button type="submit" disabled={pending} style={{ marginTop: 14, height: 58, border: 0, background: '#000000', color: '#FFFFFF', fontFamily: 'inherit', fontWeight: 800, fontSize: 16, borderRadius: 999, cursor: 'pointer', opacity: pending ? 0.6 : 1 }}>{pending ? 'Sending…' : `Send to ${count} ${count === 1 ? 'friend' : 'friends'}`}</button>
      <span style={{ textAlign: 'center', fontSize: 13, color: '#4A4A4A' }}>Goes to each of them privately, by text.</span>
    </form>
  );
}
