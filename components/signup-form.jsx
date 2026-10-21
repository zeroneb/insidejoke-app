'use client';

import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import { requestCode } from '@/lib/actions';
import { confirmCodeR1 } from '@/lib/actions-r1';
import { Blob, Avatar } from '@/components/ui';
import CodeBoxes from '@/components/code-boxes';

// r1: Option 10 SignUp (step 1: name + number, gray, lime blob) and PhoneConfirm (code step, sky blue).
// /login uses the same form with title "Log in": no name field, two steps.

function formatPhone(p) {
  const d = (p || '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return p;
}
const CAP = { fontSize: 11, letterSpacing: '0.18em' };
const BTN = { height: 56, border: 0, background: '#000000', color: '#FFFFFF', fontFamily: 'inherit', fontWeight: 700, fontSize: 17, borderRadius: 999, cursor: 'pointer', width: '100%' };
const FIELD = { height: 54, border: '1.5px solid #000000', background: '#FFFFFF', fontFamily: 'inherit', fontSize: 17, padding: '0 14px', boxSizing: 'border-box', width: '100%', borderRadius: 0, color: '#000000', fontWeight: 400 };

function Back({ href, label = 'Back', onClick }) {
  const inner = <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg>;
  const st = { width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 0, background: 'transparent', padding: 0, cursor: 'pointer' };
  return onClick ? <button type="button" aria-label={label} onClick={onClick} style={st}>{inner}</button> : <Link href={href} aria-label={label} style={st}>{inner}</Link>;
}

// "Send it again" lives inside the confirm form: formAction re-sends using that form's phone/name/next.
function Resend({ onCode }) {
  const [state, act, pending] = useActionState(requestCode, null);
  const [left, setLeft] = useState(24);
  useEffect(() => { if (state?.step === 'code') { setLeft(30); onCode?.(state.testCode); } }, [state]); // eslint-disable-line
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  if (left > 0) return <span>Resend in <span className="dot" style={{ fontSize: 14 }}>0:{String(left).padStart(2, '0')}</span></span>;
  return <button formAction={act} formNoValidate disabled={pending} style={{ border: 0, background: 'transparent', padding: 0, fontFamily: 'inherit', fontSize: 13, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer', color: '#000000' }}>{pending ? 'Sending…' : 'Send it again'}</button>;
}

export default function SignupForm({ next = '/home', title = 'Sign up' }) {
  const login = title === 'Log in';
  const [s1, act1, p1] = useActionState(requestCode, { next });
  const [s2, act2, p2] = useActionState(confirmCodeR1, null);
  const [editing, setEditing] = useState(false);
  const [fresh, setFresh] = useState(null);
  const codeStep = s1?.step === 'code' && !editing;
  const steps = login ? 2 : 3;

  if (codeStep) {
    const code = fresh || s1.testCode;
    const shown = formatPhone(s1.phone);
    const who = (s1.name || '').trim();
    return (
      <form action={act2} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, background: '#A9CDF5', margin: '0 0 -104px', paddingBottom: 104, minHeight: '100vh', boxSizing: 'border-box' }}>
        <input type="hidden" name="phone" value={s1.phone} />
        <input type="hidden" name="name" value={s1.name || ''} />
        <input type="hidden" name="next" value={s1.next || next} />
        <input type="hidden" name="flow" value={login ? 'login' : 'signup'} />
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 0 8px' }}>
          <Back label="Change number" onClick={() => setEditing(true)} />
          <span className="wide" style={CAP}>Step 2 of {steps}</span>
          <div style={{ width: 44 }} />
        </header>

        <section style={{ padding: '18px 20px 0' }}>
          <h1 style={{ margin: 0, fontWeight: 400, fontSize: 44, lineHeight: 0.98, letterSpacing: '-0.04em' }}>Check your <span className="serif" style={{ fontStyle: 'italic' }}>texts</span></h1>
          <p style={{ margin: '12px 0 0', fontSize: 16, lineHeight: 1.4, maxWidth: 320 }}>{login ? 'Type the 6 digits and you’re back in.' : 'Type the 6 digits and you’re in. Your lists are one step away.'}</p>
        </section>

        <section style={{ position: 'relative', marginTop: 18, height: 150 }}>
          <Blob seed={14} width={350} height={150} style={{ left: 20, top: 0 }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '0 40px' }}>
            <Avatar user={{ name: who || 'You', seed: 8 }} size={46} owner />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span style={{ fontSize: 13 }}>{login ? 'Welcome back' : 'Your account'}</span>
              <span style={{ fontSize: 18, letterSpacing: '-0.01em' }}>{login ? shown : who || shown}</span>
            </span>
          </div>
        </section>

        <section className="pop" style={{ position: 'relative', padding: '26px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: 15 }}>Enter the code we sent to {shown}</span>
          <CodeBoxes height={64} fontSize={30} activeBg="#D8F75A" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
            <button type="button" onClick={() => setEditing(true)} style={{ border: 0, background: 'transparent', padding: 0, fontFamily: 'inherit', fontSize: 13, textDecoration: 'underline', cursor: 'pointer', color: '#000000' }}>Change number</button>
            <Resend onCode={(c) => { setFresh(c); document.getElementById('code-input')?.focus(); }} />
          </div>
          {s2?.error ? <div className="err" role="alert">{s2.error}</div> : null}
          {code ? <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}><span style={{ background: '#D4FA4F', padding: '3px 8px' }}><span className="wide" style={CAP}>Test mode:</span> your code is <span className="dot" style={{ fontSize: 17 }}>{code}</span></span></p> : null}
        </section>
        <div style={{ padding: '26px 16px 0' }}>
          <button style={{ ...BTN, fontWeight: 400, height: 'auto', padding: '17px 0' }} disabled={p2}>{p2 ? 'Checking…' : 'Confirm'}</button>
        </div>

        <p style={{ margin: '22px 20px 0', paddingTop: 14, borderTop: '1px solid #000000', fontFamily: "'EB Garamond', serif", fontSize: 18, lineHeight: 1.3 }}>{login ? 'Confirming logs you in on this phone. We only text about lists you’re part of.' : 'Confirming makes your insidejoke account, so friends know who’s celebrating. We only text about lists you’re part of.'}</p>
        <div style={{ height: 36 }} />
      </form>
    );
  }

  return (
    <form action={(fd) => { setEditing(false); setFresh(null); return act1(fd); }} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <input type="hidden" name="next" value={next} />
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px 0 8px' }}>
        <Back href="/" />
        <span className="wide" style={CAP}>Step 1 of {steps}</span>
      </header>
      <div aria-hidden="true" style={{ display: 'flex', gap: 6, padding: '8px 20px 0' }}>
        {Array.from({ length: steps }, (_, i) => <span key={i} style={{ flex: '1 1 0', height: 4, borderRadius: 999, background: i === 0 ? '#000000' : '#C9C9CF' }} />)}
      </div>

      <section style={{ position: 'relative', height: 230, marginTop: 10 }}>
        <Blob seed={14} width={300} height={220} style={{ left: 20, top: 0 }} />
        <h1 className="serif" style={{ position: 'absolute', left: 44, right: 60, top: 58, margin: 0, fontWeight: 400, fontSize: 44, lineHeight: 0.95 }}>
          {login ? <>Welcome <span style={{ fontWeight: 600 }}>back</span></> : <>Let’s celebrate <span style={{ fontWeight: 600 }}>you</span></>}
        </h1>
      </section>

      <section className="pop" style={{ padding: '8px 20px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {login ? null : (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontWeight: 700, fontSize: 14 }}>Your name
            <input name="name" defaultValue={s1?.name || ''} autoComplete="name" placeholder="Maya Haddad" required style={FIELD} />
          </label>
        )}
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontWeight: 700, fontSize: 14 }}>Phone number
          <input name="phone" defaultValue={s1?.phone ? formatPhone(s1.phone) : ''} inputMode="tel" autoComplete="tel" placeholder="(917) 555-0123" required style={{ ...FIELD, fontFamily: "'Doto', monospace", fontWeight: 900, fontSize: 20 }} />
        </label>
        <span style={{ fontSize: 13, lineHeight: 1.4, color: '#3A3A3A' }}>Your number is your account. No passwords, ever. It’s also how thank-yous and invites reach you.</span>
        {s1?.error ? <div className="err" role="alert">{s1.error}</div> : null}
        <button style={{ ...BTN, marginTop: 8 }} disabled={p1}>{p1 ? 'Sending…' : 'Text me a code'}</button>
        <span style={{ fontSize: 13, color: '#3A3A3A', textAlign: 'center' }}>
          {login ? <>New here? <Link href={`/signup?next=${encodeURIComponent(next)}`} style={{ fontWeight: 700, textUnderlineOffset: 3 }}>Sign up</Link></> : <>Already on insidejoke? <Link href={`/login?next=${encodeURIComponent(next)}`} style={{ fontWeight: 700, textUnderlineOffset: 3 }}>Log in</Link></>}
        </span>
      </section>
      <div style={{ height: 40 }} />
    </form>
  );
}
