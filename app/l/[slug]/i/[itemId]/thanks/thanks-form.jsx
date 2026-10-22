'use client';

// r3: Option 10 Covered "Send a thank uuuuu text" box, and its sent state.
import { useActionState, useState } from 'react';
import Link from 'next/link';
import { sendItemThanks } from '@/lib/actions-a3';

export default function ThanksForm({ slug, itemId, word, count, already, listHref }) {
  const [state, action, pending] = useActionState(sendItemThanks, null);
  const [photo, setPhoto] = useState('');
  const done = state?.sent ? state : already;
  const everyone = count === 1 ? 'Your friend' : count === 2 ? 'Both friends' : `All ${count} friends`;

  if (done) {
    const n = done.count;
    return (
      <section className="r3-pop" role="status" style={{ margin: '24px 16px 0', background: '#D8F75A', padding: '26px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10 }}>
        <svg aria-hidden="true" width="56" height="56" viewBox="0 0 64 64" fill="none" stroke="#000000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="32" cy="32" r="28" /><path d="M20 33l8 8 16-17" /></svg>
        <span style={{ fontFamily: "'EB Garamond', serif", fontSize: 30, lineHeight: 1 }}>Thank-you <span style={{ fontWeight: 600 }}>sent</span></span>
        <span style={{ fontSize: 15 }}>{n === 1 ? 'Your friend' : n === 2 ? 'Both friends' : `All ${n} friends`} {done.held ? 'will get it from you: tap below to text them from your phone.' : `got your text${done.photo ? ' and your photo' : ''}.`}</span>
        {done.held && done.phones?.length ? (
          <a href={`sms:${done.phones.join(',')}?&body=${encodeURIComponent(done.text || '')}`} style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 52, padding: '0 22px', borderRadius: 999, background: '#000000', color: '#FFFFFF', textDecoration: 'none', fontWeight: 800, fontSize: 16 }}>Send it from your phone</a>
        ) : null}
        <Link href={listHref} style={{ marginTop: 4, fontSize: 14, color: '#000000', textDecoration: 'underline', textUnderlineOffset: 3, padding: 8 }}>Back to your list</Link>
      </section>
    );
  }

  return (
    <form action={action} style={{ margin: '24px 16px 0', background: '#5546A0', color: '#FFFFFF', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="itemId" value={itemId} />
      <h2 style={{ margin: 0, fontFamily: "'EB Garamond', serif", fontWeight: 400, fontSize: 30, lineHeight: 1 }}>Send a <span style={{ fontWeight: 600 }}>thank uuuuu text</span></h2>
      <span style={{ fontSize: 14, color: '#E4DEFA' }}>Goes to {count === 1 ? 'them' : `all ${count}`} by text, privately to each.</span>
      <label htmlFor="msg" style={{ fontSize: 13 }}>Your message</label>
      <textarea id="msg" name="message" rows={4} required maxLength={600} placeholder={`You all got me the ${word}!! Thank you for celebrating me, I love you guys.`} style={{ width: '100%', boxSizing: 'border-box', border: 0, background: '#FFFFFF', color: '#000000', resize: 'none', fontFamily: "'EB Garamond', serif", fontSize: 19, lineHeight: 1.3, padding: '12px 14px', borderRadius: 0 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <label className="r3-file" style={{ width: 84, height: 84, flexShrink: 0, boxSizing: 'border-box', border: `1.5px dashed ${photo ? '#F0895A' : '#FFFFFF'}`, background: photo ? '#F0895A' : 'transparent', color: photo ? '#000000' : '#FFFFFF', fontSize: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer' }}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
          {photo ? 'Photo added' : 'Add photo'}
          <input type="file" name="photo" accept="image/*" aria-label="Add a photo" onChange={(e) => setPhoto(e.target.files?.[0]?.name || '')} />
        </label>
        <span style={{ fontSize: 14, lineHeight: 1.4 }}>Add a photo of you with it. Totally optional, very encouraged.</span>
      </div>
      {state?.error ? <p className="err" style={{ margin: 0 }}>{state.error}</p> : null}
      <button type="submit" disabled={pending} style={{ marginTop: 6, height: 54, border: 0, background: '#D8F75A', color: '#000000', fontFamily: 'inherit', fontSize: 17, borderRadius: 999, cursor: 'pointer', opacity: pending ? 0.6 : 1 }}>{pending ? 'Sending…' : `Send to ${count} ${count === 1 ? 'friend' : 'friends'}`}</button>
      <span className="sr">{everyone} get it as their own text.</span>
    </form>
  );
}
