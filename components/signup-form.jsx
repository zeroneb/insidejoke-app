'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { requestCode, confirmCode } from '@/lib/actions';

export default function SignupForm({ next = '/home', testMode = false, title = 'Sign up' }) {
  const [s1, act1, p1] = useActionState(requestCode, { next });
  const [s2, act2, p2] = useActionState(confirmCode, null);
  const codeStep = s1?.step === 'code';
  const state = codeStep ? { ...s1, ...(s2 || {}) } : s1;

  if (codeStep) {
    return (
      <form action={act2} className="sec" style={{ gap: 14 }}>
        <input type="hidden" name="phone" value={s1.phone} />
        <input type="hidden" name="name" value={s1.name || ''} />
        <input type="hidden" name="next" value={s1.next || next} />
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.4 }}>We texted a code to <span className="dot" style={{ fontSize: 18 }}>{s1.phone}</span>. Type it here and you are in.</p>
        <div className="field">
          <label htmlFor="code">6-digit code</label>
          <input id="code" name="code" className="input code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus required />
        </div>
        {state?.error ? <div className="err">{state.error}</div> : null}
        {s1?.testCode ? <p style={{ margin: 0, fontSize: 14, padding: '10px 12px', background: '#D8F75A' }}>Test mode, nothing was really texted. Your code is <span className="dot" style={{ fontSize: 18 }}>{s1.testCode}</span></p> : testMode ? <p className="muted" style={{ margin: 0, fontSize: 13 }}>Test mode: your code is in the <Link href="/dev/texts">Outbox</Link>.</p> : null}
        <button className="btn" disabled={p2}>{p2 ? 'Checking…' : 'Confirm'}</button>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>No password. Your number is your account.</p>
      </form>
    );
  }

  return (
    <form action={act1} className="sec" style={{ gap: 14 }}>
      <input type="hidden" name="next" value={next} />
      <div className="field">
        <label htmlFor="name">Your name</label>
        <input id="name" name="name" className="input" defaultValue={s1?.name || ''} placeholder="Maya" autoComplete="given-name" required={title !== 'Log in'} />
      </div>
      <div className="field">
        <label htmlFor="phone">Phone number</label>
        <input id="phone" name="phone" className="input dot" style={{ fontSize: 20 }} inputMode="tel" autoComplete="tel" placeholder="(917) 555-0148" required />
      </div>
      {s1?.error ? <div className="err">{s1.error}</div> : null}
      <button className="btn" disabled={p1}>{p1 ? 'Sending…' : 'Text me a code'}</button>
      <p className="muted" style={{ margin: 0, fontSize: 13 }}>We text you a 6-digit code. Thank-yous and invites reach you the same way.</p>
    </form>
  );
}
