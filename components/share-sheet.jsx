'use client';

import { useActionState, useState } from 'react';
import { shareByText } from '@/lib/actions';
import { Blob } from '@/components/ui';

export default function ShareSheet({ slug, title, ownerName, url, whose }) {
  const [tab, setTab] = useState('text');
  const [copied, setCopied] = useState(false);
  const [state, action, pending] = useActionState(shareByText, null);
  const line = `${ownerName} shared ${whose} list with you`;

  const Card = () => (
    <div style={{ borderRadius: 18, overflow: 'hidden', background: '#E9E9EB' }}>
      <div style={{ position: 'relative', height: 130, background: '#13286B', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Blob seed={22} width={220} height={106} style={{ left: 30, top: 12 }} />
        <span className="serif" style={{ position: 'relative', fontSize: 26, color: '#000', textAlign: 'center', padding: '0 20px' }}>{title}</span>
      </div>
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontWeight: 700, fontSize: 14 }}>{line}</span><span className="muted" style={{ fontSize: 12 }}>insidejoke</span></div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <section role="tablist" style={{ margin: '18px 20px 0', display: 'flex', borderBottom: '2px solid #000' }}>
        {[['text', 'In a text'], ['invite', 'Party invite'], ['bio', 'Your bio']].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className="tab" style={{ background: tab === k ? '#000' : 'transparent', color: tab === k ? '#fff' : '#000' }}>{l}</button>
        ))}
      </section>

      {tab === 'text' ? (
        <section className="pop" style={{ margin: '18px 16px 0', background: '#fff', borderRadius: 22, padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="muted" style={{ textAlign: 'center', fontSize: 11 }}>To: Birthday crew</span>
          <div style={{ alignSelf: 'flex-end', maxWidth: '80%', background: '#1E88FF', color: '#fff', borderRadius: '18px 18px 4px 18px', padding: '10px 13px', fontSize: 15, lineHeight: 1.4 }}>made you a list so nobody has to guess 🎂</div>
          <div style={{ alignSelf: 'flex-end', width: '78%' }}><Card /></div>
        </section>
      ) : null}
      {tab === 'invite' ? (
        <section className="pop" style={{ margin: '18px 16px 0', background: '#F4D3EE', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em', color: '#E2452B' }}>Your party invite</span>
          <span className="tall" style={{ fontSize: 44, lineHeight: 0.9, color: '#E2452B' }}>{title}</span>
          <span style={{ fontSize: 14 }}>Sat · 8pm · bring yourself</span>
          <div style={{ background: '#fff', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}><span style={{ fontWeight: 700, fontSize: 14 }}>Gift list</span><span className="dot" style={{ fontSize: 13 }}>insidejoke →</span></div>
          <span className="muted" style={{ fontSize: 12 }}>Paste the link into any invite. Guests tap through to the list.</span>
        </section>
      ) : null}
      {tab === 'bio' ? (
        <section className="pop" style={{ margin: '18px 16px 0', background: '#fff', padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
          <span className="wide" style={{ alignSelf: 'flex-start', fontSize: 11, letterSpacing: '0.18em' }}>Your profile, anywhere</span>
          <span style={{ position: 'relative', width: 72, height: 72, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <Blob seed={8} color="#B36EE0" width={84} height={84} style={{ left: -6, top: -6 }} />
            <span className="serif" style={{ position: 'relative', color: '#D8F75A', fontSize: 36 }}>{(ownerName[0] || '?').toUpperCase()}</span>
          </span>
          <span style={{ fontWeight: 800, fontSize: 16 }}>{ownerName}</span>
          <span className="muted" style={{ fontSize: 13 }}>things I'd actually love ↓</span>
          <span className="dot" style={{ fontSize: 15, color: '#13286B' }}>{url.replace(/^https?:\/\//, '')}</span>
        </section>
      ) : null}

      <section style={{ padding: '22px 20px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span className="lbl">Your list link</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <input readOnly value={url} className="input dot" style={{ fontSize: 14, minWidth: 0 }} aria-label="List link" onFocus={(e) => e.target.select()} />
          <button type="button" className="btn" style={{ width: 'auto', padding: '0 18px', fontSize: 15 }} onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {} }}>{copied ? 'Copied' : 'Copy'}</button>
        </div>
      </section>

      <form action={action} style={{ padding: '22px 20px 40px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input type="hidden" name="slug" value={slug} />
        <label htmlFor="to" className="lbl">Text it to a number</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input id="to" name="to" className="input dot" style={{ fontSize: 18, minWidth: 0 }} inputMode="tel" placeholder="(917) 555-0148" required />
          <button className="btn lime" disabled={pending} style={{ width: 'auto', padding: '0 18px', fontSize: 15, whiteSpace: 'nowrap' }}>{pending ? 'Sending…' : 'Send'}</button>
        </div>
        {state?.error ? <div className="err">{state.error}</div> : null}
        {state?.ok ? <p className="pop" style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Sent to {state.to}. They'll get "{line}" with the link.</p> : null}
      </form>
    </div>
  );
}
