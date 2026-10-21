'use client';

import { useEffect, useRef, useState } from 'react';

// Six Doto digit boxes over one real (offscreen) input, from the Option 13 PhoneConfirm board.
// Submits the surrounding form on the sixth digit.
export default function CodeBoxes({ name = 'code', autoSubmit = true }) {
  const [typed, setTyped] = useState('');
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const onChange = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 6);
    setTyped(v);
    if (autoSubmit && v.length === 6) setTimeout(() => e.target.form?.requestSubmit(), 50);
  };
  return (
    <>
      <div role="group" aria-label="6-digit code" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 6 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const v = typed[i] || '';
          const active = i === typed.length || (typed.length === 6 && i === 5 && false);
          return (
            <button type="button" key={i} onClick={() => { setTyped(typed.slice(0, i)); ref.current?.focus(); }} aria-label={`Digit ${i + 1}${v ? ', ' + v : ', empty'}`}
              style={{ height: 66, border: '1.5px solid #000000', background: active ? '#D4FA4F' : '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}>
              <span className={'dot' + (active ? ' caret' : '')} style={{ fontSize: 32, lineHeight: 1 }}>{active ? '|' : v}</span>
            </button>
          );
        })}
      </div>
      <label htmlFor="code-input" style={{ position: 'absolute', left: -9999 }}>Code</label>
      <input ref={ref} id="code-input" name={name} value={typed} onChange={onChange} inputMode="numeric" autoComplete="one-time-code" maxLength={6} required
        style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }} />
    </>
  );
}
