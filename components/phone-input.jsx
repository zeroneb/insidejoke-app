'use client';
// A phone field that formats as you type, e.g. (415) 555-0123, and still submits what the server expects:
// the number in E.164 (+14155550123) under `name`, from a hidden input. Numbers starting with + keep their
// country code; anything that isn't a full number is sent as typed (digits only) so the server can say what's wrong.
import { useEffect, useRef, useState } from 'react';

const digitsOf = (v) => String(v || '').replace(/\D/g, '');
// A saved US number (+14155550123) shows as (415) 555-0123.
const fromSaved = (v) => (/^\+1\d{10}$/.test(String(v || '').replace(/[^\d+]/g, '')) ? digitsOf(v).slice(1) : v);

// Pretty form for display while typing.
export function formatPhoneTyping(raw) {
  const v = String(raw || '');
  const plus = v.trim().startsWith('+');
  let d = digitsOf(v).slice(0, 15);
  if (plus && !d.startsWith('1')) return d ? `+${d}` : '+'; // other countries: as typed, digits only
  let cc = '';
  if (plus || (d.length > 10 && d.startsWith('1'))) { cc = '+1 '; d = d.slice(1); }
  d = d.slice(0, 10);
  if (!d) return cc.trim();
  if (d.length < 4) return cc + d;
  if (d.length < 7) return `${cc}(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `${cc}(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

// What the server gets: E.164 when the number is complete.
export function phoneValue(raw) {
  const v = String(raw || '').trim();
  const d = digitsOf(v);
  if (!d) return '';
  if (v.startsWith('+')) return '+' + d;
  if (d.length === 10) return '+1' + d;
  if (d.length === 11 && d.startsWith('1')) return '+' + d;
  return d;
}

// Put the caret after the same number of digits it was after before formatting.
function caretAfterDigits(text, n) {
  if (n <= 0) return text.startsWith('+') ? 1 : 0;
  let seen = 0;
  for (let i = 0; i < text.length; i++) { if (/\d/.test(text[i])) { seen++; if (seen === n) return i + 1; } }
  return text.length;
}

// Controlled (value + onChange(formatted)) or uncontrolled (defaultValue). Other props go to the visible input.
export default function PhoneInput({ name, value, defaultValue = '', onChange, inputRef, ...rest }) {
  const controlled = value !== undefined;
  const [inner, setInner] = useState(() => formatPhoneTyping(fromSaved(defaultValue)));
  const shown = controlled ? value : inner;
  const ref = useRef(null);
  const caret = useRef(null);
  const set = (v) => { if (!controlled) setInner(v); onChange?.(v); };

  // A form reset (e.g. after "Add") clears the field too.
  useEffect(() => {
    const form = ref.current?.form;
    if (!form) return;
    const reset = () => set(formatPhoneTyping(fromSaved(defaultValue)));
    form.addEventListener('reset', reset);
    return () => form.removeEventListener('reset', reset);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (caret.current == null || !ref.current || document.activeElement !== ref.current) return;
    ref.current.setSelectionRange(caret.current, caret.current);
    caret.current = null;
  });

  const handle = (e) => {
    const el = e.target;
    let v = el.value;
    const pos = el.selectionStart ?? v.length;
    let before = digitsOf(v.slice(0, pos)).length;
    // Backspace over a ")" "-" or space: take the digit before it instead, so the caret never gets stuck.
    if (v.length < shown.length && digitsOf(v) === digitsOf(shown) && before > 0) {
      const ds = digitsOf(v);
      const plus = v.trim().startsWith('+') ? '+' : '';
      v = plus + ds.slice(0, before - 1) + ds.slice(before);
      before -= 1;
    }
    const f = formatPhoneTyping(v);
    caret.current = caretAfterDigits(f, before);
    set(f);
  };

  return (
    <>
      <input ref={(n) => { ref.current = n; if (typeof inputRef === 'function') inputRef(n); else if (inputRef) inputRef.current = n; }}
        type="tel" inputMode="tel" autoComplete="tel" {...rest} value={shown} onChange={handle} />
      {name ? <input type="hidden" name={name} value={phoneValue(shown)} /> : null}
    </>
  );
}

// Several numbers in one field ("(917) 555-0193, (646) 555-0117"): each one formatted, separators kept.
export function formatPhoneList(v) {
  return String(v || '').split(/([,;\n]+\s*)/).map((part, i) => (i % 2 || !/\d/.test(part) ? part : formatPhoneTyping(part.trim()))).join('');
}
