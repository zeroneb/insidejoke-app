'use client';

import { useActionState, useState } from 'react';
import { sendWeeklyThanks } from '@/lib/actions-a3';

const SAMPLE = 'Bagels, lattes and flowers all week. Thank you for celebrating me on a random Tuesday.';

export default function WeeklyForm({ count, first, link }) {
  const [state, action, pending] = useActionState(sendWeeklyThanks, null);
  const [msg, setMsg] = useState('');
  const [photo, setPhoto] = useState(null);
  const [fname, setFname] = useState('');

  if (state?.sent) {
    return (
      <section className="a3-pop" role="status" style={{ margin: '22px 16px 0', background: 'var(--dk, #13286B)', color: 'var(--inv-fg, #FFFFFF)', padding: '22px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span className="dot" style={{ fontSize: 40, color: '#D8F75A' }}>{state.count}/{state.count}</span>
        <p style={{ margin: 0, fontSize: 20, lineHeight: 1.25 }}>{state.held ? 'Saved. Tap below to text it to them from your phone.' : `Sent. Each of them got it as their own text${state.photo ? ', photo and all' : ''}.`}</p>
        {state.held && state.phones?.length ? <a href={`sms:${state.phones.join(',')}?&body=${encodeURIComponent(state.text || '')}`} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', height: 50, padding: '0 22px', borderRadius: 999, background: 'var(--lt, #D8F75A)', color: 'var(--ink, #000000)', textDecoration: 'none', fontWeight: 800, fontSize: 16 }}>Send it from your phone</a> : null}
      </section>
    );
  }
  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column' }}>
      <section style={{ margin: '20px 16px 0', background: 'var(--surface, #FFFFFF)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label htmlFor="msg" className="wide" style={{ fontSize: 12, letterSpacing: '0.16em', color: '#C8743A' }}>Your message</label>
        <textarea id="msg" name="message" rows={4} required maxLength={600} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Bagels, lattes and flowers all week. Thank you for celebrating me on a random Tuesday." style={{ border: '2px solid var(--line, #000000)', fontFamily: "'EB Garamond', serif", fontSize: 20, lineHeight: 1.3, padding: 12, resize: 'none', borderRadius: 0, color: 'var(--ink, #000000)' }} />
        <div style={{ position: 'relative', display: photo ? 'block' : 'none', height: 190, background: 'var(--lt, #F4D3EE)', overflow: 'hidden' }}>
          {photo ? <img src={photo} alt="Your photo" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : null}
          <span style={{ position: 'absolute', left: 8, bottom: 8, background: 'var(--inv-bg, #000000)', color: 'var(--inv-fg, #FFFFFF)', fontSize: 11, fontWeight: 700, padding: '3px 6px', maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fname}</span>
          <button type="button" onClick={() => { setPhoto(null); setFname(''); const i = document.getElementById('wkphoto'); if (i) i.value = ''; }} aria-label="Remove photo" style={{ position: 'absolute', right: 8, top: 8, width: 40, height: 40, border: 0, borderRadius: '50%', background: 'var(--surface, #FFFFFF)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="2.13" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        </div>
        <label className="a3-photo" style={{ display: photo ? 'none' : 'block', border: '2px dashed var(--line, #000000)', fontWeight: 800, fontSize: 14, padding: 18, textAlign: 'center', cursor: 'pointer' }}>
          Add a photo (optional)
          <input id="wkphoto" type="file" name="photo" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; setPhoto(f ? URL.createObjectURL(f) : null); setFname(f ? f.name : ''); }} />
        </label>
      </section>
      <section style={{ margin: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span className="wide" style={{ fontSize: 12, letterSpacing: '0.16em' }}>Each friend gets</span>
        <div style={{ background: 'var(--surface, #FFFFFF)', borderRadius: 18, padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ textAlign: 'center', fontSize: 11, color: 'var(--mute2, #6A6A6A)' }}>Text message</span>
          <div style={{ alignSelf: 'flex-start', maxWidth: '86%', background: 'var(--surface2, #E9E9EB)', borderRadius: '18px 18px 18px 4px', padding: '10px 13px', fontSize: 14, lineHeight: 1.4, wordBreak: 'break-word' }}>{first} sent you a thank-you for this week’s treats 💛 “{msg.trim() || SAMPLE}”{photo ? ' (with a photo)' : ''} Open it: {link.replace(/^https?:\/\//, '')}</div>
        </div>
      </section>
      {state?.error ? <p className="err" style={{ margin: '14px 16px 0' }}>{state.error}</p> : null}
      <div style={{ padding: '20px 16px 0' }}>
        <button type="submit" disabled={pending} style={{ width: '100%', border: 0, background: 'var(--inv-bg, #000000)', color: 'var(--inv-fg, #FFFFFF)', fontFamily: 'inherit', fontWeight: 800, fontSize: 17, padding: '17px 0', borderRadius: 999, cursor: 'pointer', opacity: pending ? 0.6 : 1 }}>{pending ? 'Sending…' : count === 1 ? 'Send it' : `Send to all ${count}`}</button>
      </div>
    </form>
  );
}
