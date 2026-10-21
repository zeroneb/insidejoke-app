'use client';

import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import { requestCode, confirmCode } from '@/lib/actions';
import { Blob } from '@/components/ui';
import CodeBoxes from '@/components/code-boxes';

// +1 numbers show as +1 (917) 555-0123; anything else as typed.
function formatPhone(p) {
  const d = (p || '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) return `+1 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return p;
}
const CAP = { fontSize: 11, letterSpacing: '0.18em' };
const FOOT = { marginTop: 'auto', padding: '24px 16px 0', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' };
const BTN = { display: 'block', width: '100%', boxSizing: 'border-box', textAlign: 'center', textDecoration: 'none', background: '#000000', color: '#FFFFFF', fontWeight: 800, fontSize: 16, padding: '19px 0', borderRadius: 999, border: 0, fontFamily: 'inherit', cursor: 'pointer' };

function Back({ href, label = 'Back' }) {
  return (
    <Link href={href} aria-label={label} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg>
    </Link>
  );
}

function Step({ n }) {
  return <span className="wide" style={CAP}>Step <span className="dot" style={{ fontSize: 14, letterSpacing: 0 }}>{n}</span> of <span className="dot" style={{ fontSize: 14, letterSpacing: 0 }}>2</span></span>;
}

// Lives inside the confirm form: formAction re-sends using that form's phone/name/next fields.
function Resend({ onCode }) {
  const [state, act, pending] = useActionState(requestCode, null);
  const [left, setLeft] = useState(0);
  useEffect(() => { if (state?.step === 'code') { setLeft(30); onCode?.(state.testCode); } }, [state]); // eslint-disable-line
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  if (left > 0) return <span style={{ padding: '10px 0' }}>Sent again. Resend in <span className="dot" style={{ fontSize: 14 }}>0:{String(left).padStart(2, '0')}</span></span>;
  return (
    <button formAction={act} formNoValidate disabled={pending} style={{ border: 0, background: 'transparent', padding: '10px 0', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer', color: '#000' }}>{pending ? 'Sending…' : 'Send it again'}</button>
  );
}

export default function SignupForm({ next = '/home', title = 'Sign up' }) {
  const [s1, act1, p1] = useActionState(requestCode, { next });
  const [s2, act2, p2] = useActionState(confirmCode, null);
  const login = title === 'Log in';
  const codeStep = s1?.step === 'code';
  const [fresh, setFresh] = useState(null);

  if (codeStep) {
    const code = fresh || s1.testCode;
    const shown = formatPhone(s1.phone);
    return (
      <form action={act2} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <input type="hidden" name="phone" value={s1.phone} />
        <input type="hidden" name="name" value={s1.name || ''} />
        <input type="hidden" name="next" value={s1.next || next} />
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px 0 8px' }}>
          <Back href={login ? '/login' : '/signup'} />
          <Step n={2} />
        </header>

        <section style={{ padding: '22px 20px 0' }}>
          <h1 style={{ margin: 0, fontWeight: 400, fontSize: 46, lineHeight: 0.96, letterSpacing: '-0.03em' }}>Check your <span className="serif" style={{ fontStyle: 'italic', letterSpacing: 0 }}>texts</span></h1>
          <p style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.45, maxWidth: 320 }}>Six digits, and you are in.</p>
        </section>

        <section aria-label="Sent to" style={{ position: 'relative', height: 170, marginTop: 8 }}>
          <Blob seed={14} width={346} height={170} style={{ left: 22, top: 0 }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span className="wide" style={CAP}>Sent to</span>
            <span className="dot" style={{ fontSize: 26, lineHeight: 1 }}>{shown}</span>
            <a href={login ? '/login' : '/signup'} style={{ fontSize: 13, fontWeight: 700, textUnderlineOffset: 3, padding: '8px 0', color: '#000' }}>Wrong number?</a>
          </div>
        </section>

        <section style={{ padding: '8px 20px 0', display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>
          <CodeBoxes />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
            <span style={{ color: '#4A4A4A' }}>Did not get it?</span>
            <Resend onCode={(c) => { setFresh(c); document.getElementById('code-input')?.focus(); }} />
          </div>
          {s2?.error ? <div className="err">{s2.error}</div> : null}
        </section>

        {code ? (
          <section aria-label="Test mode" style={{ padding: '20px 20px 0' }}>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}><span style={{ background: '#D4FA4F', padding: '3px 8px', WebkitBoxDecorationBreak: 'clone', boxDecorationBreak: 'clone' }}><span className="wide" style={CAP}>Test mode:</span> your code is <span className="dot" style={{ fontSize: 17 }}>{code}</span></span></p>
          </section>
        ) : null}

        <div style={FOOT}>
          <button className="a1-cta" style={BTN} disabled={p2}>{p2 ? 'Checking…' : 'Confirm'}</button>
          <span style={{ fontSize: 12, color: '#4A4A4A', textAlign: 'center' }}>{login ? 'Confirming logs you in.' : 'Confirming makes your insidejoke account.'}</span>
        </div>
        <div style={{ height: 34 }} />
      </form>
    );
  }

  return (
    <form action={act1} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <input type="hidden" name="next" value={next} />
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px 0 8px' }}>
        <Back href="/" />
        <Step n={1} />
      </header>

      <section aria-label="Welcome" style={{ position: 'relative', height: 276, marginTop: 6 }}>
        <Blob seed={14} width={362} height={256} style={{ left: 14, top: 10 }} />
        <h1 style={{ position: 'absolute', left: 54, right: 54, top: 84, margin: 0, fontWeight: 400, fontSize: 46, lineHeight: 0.96, letterSpacing: '-0.03em', textAlign: 'center' }}>
          {login ? <>Welcome<br /><span className="serif" style={{ fontStyle: 'italic', letterSpacing: 0 }}>back.</span></> : <>What should<br />we <span className="serif" style={{ fontStyle: 'italic', letterSpacing: 0 }}>call you?</span></>}
        </h1>
      </section>

      <div style={{ padding: '8px 20px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {login ? null : (
          <label htmlFor="name" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="wide" style={CAP}>Your name</span>
            <input id="name" name="name" defaultValue={s1?.name || ''} autoComplete="name" placeholder="Maya Haddad" required
              style={{ height: 56, border: '1.5px solid #000000', background: '#FFFFFF', fontFamily: 'inherit', fontSize: 18, padding: '0 16px', boxSizing: 'border-box', width: '100%', borderRadius: 0, color: '#000' }} />
          </label>
        )}
        <label htmlFor="phone" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="wide" style={CAP}>Phone number</span>
          <span style={{ display: 'flex', height: 56, border: '1.5px solid #000000', background: '#FFFFFF', boxSizing: 'border-box' }}>
            <span className="dot" style={{ display: 'flex', alignItems: 'center', padding: '0 14px', borderRight: '1.5px solid #000000', fontSize: 20 }}>+1</span>
            <input id="phone" name="phone" inputMode="tel" autoComplete="tel" placeholder="(917) 555-0123" required
              style={{ flexGrow: 1, minWidth: 0, border: 0, background: 'transparent', fontFamily: "'Doto', monospace", fontWeight: 900, fontSize: 22, padding: '0 16px', borderRadius: 0, color: '#000', outline: 'none' }} />
          </span>
        </label>
        <p style={{ margin: '-4px 0 0', fontSize: 15, lineHeight: 1.45, maxWidth: 330 }}>Your number is your account. <span style={{ background: '#13286B', color: '#FFFFFF', padding: '1px 6px 2px', whiteSpace: 'nowrap' }}>No passwords, ever.</span> It is also how invites and thank-yous reach you.</p>
        {s1?.error ? <div className="err">{s1.error}</div> : null}
        {login ? <p style={{ margin: 0, fontSize: 13, color: '#4A4A4A' }}>New here? <Link href={`/signup?next=${encodeURIComponent(next)}`} style={{ fontWeight: 700 }}>Sign up</Link></p> : <p style={{ margin: 0, fontSize: 13, color: '#4A4A4A' }}>Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`} style={{ fontWeight: 700 }}>Log in</Link></p>}
      </div>

      <div style={FOOT}>
        <button style={BTN} disabled={p1}>{p1 ? 'Sending…' : 'Text me a code'}</button>
        <span style={{ fontSize: 12, color: '#4A4A4A', textAlign: 'center' }}>We only text about lists you are part of.</span>
      </div>
      <div style={{ height: 34 }} />
    </form>
  );
}
