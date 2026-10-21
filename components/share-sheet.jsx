'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { shareByText } from '@/lib/actions';

const fmt = (p) => { const d = String(p || '').replace(/\D/g, ''); return d.length === 11 && d[0] === '1' ? `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}` : p; };
const W = { fontSize: 11, letterSpacing: '0.18em' };
const shareBtn = { height: 56, border: '1.5px solid #000000', background: 'transparent', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', padding: 0, borderRadius: 0, color: '#000', textDecoration: 'none', boxSizing: 'border-box' };
const ico = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: '#000000', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

export default function ShareSheet({ slug, title, url, body, back }) {
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState('');
  const [state, action, pending] = useActionState(shareByText, null);
  const [sent, setSent] = useState(null);
  useEffect(() => { if (state?.ok) setSent(state.to); }, [state]);
  const pretty = url.replace(/^https?:\/\//, '');
  const full = `${body} ${url}`;
  const words = String(title || '').trim().split(/\s+/);
  const copy = async (msg) => {
    try { await navigator.clipboard.writeText(url); } catch { /* ignore */ }
    setCopied(true); setNote(msg || '');
    setTimeout(() => { setCopied(false); setNote(''); }, 2400);
  };

  return (
    <>
      <Link href={back} aria-label="Close share sheet" style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'block', zIndex: 10 }} />
      <section role="dialog" aria-modal="true" aria-labelledby="sharetitle" className="rise" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 11, background: '#FFFFFF', borderTop: '1.5px solid #000000', padding: '10px 20px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginRight: -12 }}>
          <h1 id="sharetitle" style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span className="wide" style={W}>Share</span>
            <span className="serif" style={{ fontWeight: 400, fontSize: 24, lineHeight: 1 }}>{words.length > 1 ? <>{words.slice(0, -1).join(' ')} <span style={{ fontWeight: 600 }}>{words[words.length - 1]}</span></> : <span style={{ fontWeight: 600 }}>{title}</span>}</span>
          </h1>
          <Link href={back} aria-label="Close" className="iconbtn"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg></Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid #000000', borderBottom: '1px solid #000000' }}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}><span className="wide" style={W}>The link</span><span style={{ fontSize: 15, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pretty}</span></span>
          <button type="button" onClick={() => copy()} style={{ flexShrink: 0, border: '1.5px solid #000000', background: copied ? '#D4FA4F' : 'transparent', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, height: 44, padding: '0 18px', borderRadius: 999, cursor: 'pointer', color: '#000' }}>{copied ? 'Copied' : 'Copy'}</button>
        </div>

        <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input type="hidden" name="slug" value={slug} />
          <label htmlFor="tonum" className="wide" style={W}>Text it to a number</label>
          {!sent ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ display: 'flex', flexGrow: 1, minWidth: 0, height: 48, border: '1.5px solid #000000', background: '#FFFFFF', boxSizing: 'border-box' }}>
                <span className="dot" style={{ display: 'flex', alignItems: 'center', padding: '0 12px', borderRight: '1.5px solid #000000', fontSize: 17 }}>+1</span>
                <input id="tonum" name="to" placeholder="(917) 555-0100" inputMode="tel" autoComplete="tel" required className="dot" style={{ flexGrow: 1, minWidth: 0, border: 0, background: 'transparent', fontSize: 18, padding: '0 12px', borderRadius: 0, outline: 'none' }} />
              </span>
              <button disabled={pending} style={{ flexShrink: 0, border: 0, background: '#000000', color: '#FFFFFF', fontFamily: 'inherit', fontWeight: 800, fontSize: 15, height: 48, padding: '0 20px', borderRadius: 999, cursor: 'pointer', opacity: pending ? 0.5 : 1 }}>{pending ? 'Sending…' : 'Send'}</button>
            </div>
          ) : (
            <div className="pop" role="status" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 48, padding: '0 14px', background: '#D4FA4F', boxSizing: 'border-box' }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Sent to <span className="dot" style={{ fontSize: 16 }}>{fmt(sent)}</span></span>
              <button type="button" onClick={() => setSent(null)} style={{ border: 0, background: 'transparent', padding: '10px 0', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer', color: '#000' }}>Another</button>
            </div>
          )}
          {state?.error && !sent ? <span role="alert" style={{ fontSize: 13, fontWeight: 700, color: '#E2452B' }}>{state.error}</span> : null}
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="wide" style={W}>Or share to</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            <a href={`sms:?&body=${encodeURIComponent(full)}`} style={shareBtn}><svg {...ico}><path d="M4 5h16v11H9l-5 4z" /></svg>Messages</a>
            <a href={`whatsapp://send?text=${encodeURIComponent(full)}`} style={shareBtn}><svg {...ico}><path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3z" /><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.5-1.5-2-1-1 1a4 4 0 0 1-2.5-2.5l1-1-1-2z" /></svg>WhatsApp</a>
            <button type="button" onClick={() => copy('Link copied. Paste it in your Instagram story or bio.')} style={shareBtn}><svg {...ico}><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="12" cy="12" r="3.5" /><path d="M16.5 7.5h.01" /></svg>Instagram</button>
          </div>
          {note ? <span role="status" className="pop" style={{ fontSize: 13, fontWeight: 700 }}>{note}</span> : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="wide" style={W}>What they get</span>
          <p className="serif" style={{ margin: 0, padding: '14px 16px', background: '#ECECEF', fontSize: 18, lineHeight: 1.3 }}>{body} <span style={{ display: 'block', marginTop: 6, fontFamily: "'Inter Tight', sans-serif", fontSize: 14, fontWeight: 500, wordBreak: 'break-all' }}>{pretty}</span></p>
        </div>
      </section>
    </>
  );
}
