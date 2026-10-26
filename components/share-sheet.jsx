'use client';
// r2: Share (Option 10 ShareSheet board): Text / Party invite / Profile tabs, preview, list link + Copy.

import { useActionState, useEffect, useState } from 'react';
import { shareByText } from '@/lib/actions';
import { Blob } from '@/components/ui';
import CoverDesign from '@/components/cover-design';

const fmt = (p) => { const d = String(p || '').replace(/\D/g, ''); return d.length === 11 && d[0] === '1' ? `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}` : p; };
const bigBtn = { width: '100%', height: 56, border: 0, background: 'var(--inv-bg, #000000)', color: 'var(--inv-fg, #FFFFFF)', fontFamily: 'inherit', fontWeight: 700, fontSize: 17, borderRadius: 999, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', boxSizing: 'border-box' };

async function copyText(t) { try { await navigator.clipboard.writeText(t); return true; } catch { return false; } }

export default function ShareSheet({ slug, title, url, profileUrl, ownerFirst, kind, sharer, invite, profile, canProfile, canText = true, design = null, coverCtx = {} }) {
  const [tab, setTab] = useState('text');
  const [copied, setCopied] = useState('');
  const [msg, setMsg] = useState(kind === 'birthday' ? 'made you guys a list so nobody has to guess 🎂' : 'made you guys a list so nobody has to guess');
  const [byNumber, setByNumber] = useState(false);
  const [state, action, pending] = useActionState(shareByText, null);
  const [sent, setSent] = useState(null);
  useEffect(() => { if (state?.ok) setSent(state.to); }, [state]);
  const pretty = url.replace(/^https?:\/\//, '');
  const prettyProfile = (profileUrl || '').replace(/^https?:\/\//, '');
  const host = pretty.split('/')[0];
  const words = String(title || '').trim().split(/\s+/);
  const lower = ownerFirst.toLowerCase();
  const doCopy = async (what, text) => { await copyText(text); setCopied(what); setTimeout(() => setCopied(''), 2400); };
  const tabs = [['text', 'Text'], ['invite', 'Party invite']].concat(canProfile ? [['profile', 'Profile']] : []);

  return (
    <>
      <section role="tablist" aria-label="Share to" style={{ margin: '20px 20px 0', display: 'flex', border: '1.5px solid var(--edge, #000000)', borderRadius: 999, overflow: 'hidden' }}>
        {tabs.map(([k, l]) => {
          const on = tab === k;
          return <button key={k} type="button" role="tab" aria-selected={on} onClick={() => setTab(k)} style={{ flex: '1 1 0', border: 0, background: on ? 'var(--inv-bg, #000000)' : 'transparent', color: on ? 'var(--inv-fg, #FFFFFF)' : 'var(--ink, #000000)', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, padding: '12px 4px', cursor: 'pointer', borderRadius: 0 }}>{l}</button>;
        })}
      </section>

      {tab === 'text' ? (
        <>
          <section className="pop" style={{ margin: '18px 16px 0', background: 'var(--surface, #FFFFFF)', borderRadius: 22, padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ textAlign: 'center', fontSize: 11, color: 'var(--mute2, #6A6A6A)' }}>To: whoever you pick in Messages</span>
            <label htmlFor="sharemsg" className="sr">Your message</label>
            <textarea id="sharemsg" value={msg} onChange={(e) => setMsg(e.target.value)} rows={2} style={{ alignSelf: 'flex-end', width: '80%', boxSizing: 'border-box', resize: 'none', border: 0, outline: 'none', background: 'var(--lt, #1E88FF)', color: 'var(--inv-fg, #FFFFFF)', borderRadius: '18px 18px 4px 18px', padding: '10px 13px', fontFamily: 'inherit', fontSize: 15, lineHeight: 1.4 }} />
            <div style={{ alignSelf: 'flex-end', width: '78%', borderRadius: 18, overflow: 'hidden', background: 'var(--surface2, #E9E9EB)' }}>
              {design ? <CoverDesign design={design} title={title} ctx={coverCtx} fluid label={title} /> : (
              <div style={{ position: 'relative', height: 150, background: 'var(--dk, #13286B)', overflow: 'hidden' }}>
                <Blob seed={9} width={200} height={130} style={{ left: 40, top: 10 }} />
                <div aria-hidden="true" style={{ position: 'absolute', left: 69, top: 4, width: 142, height: 142 }}><svg className="slow" width="142" height="142" viewBox="0 0 142 142"><defs><path id="sharearc" d="M71 71 m-54 0 a54 54 0 1 1 108 0 a54 54 0 1 1 -108 0" /></defs><text style={{ fontFamily: "'EB Garamond', serif", fontSize: 10, fill: '#13286B' }}><textPath href="#sharearc">{`${lower}'s list · things ${lower} would actually loveeee ·`}</textPath></text></svg></div>
                <span className="serif" style={{ position: 'absolute', left: 92, width: 96, top: 75, transform: 'translateY(-50%)', textAlign: 'center', fontSize: Math.min(24, Math.floor(96 / (Math.max(...words.map((w) => w.length), 1) * 0.5))), lineHeight: 0.95, color: 'var(--ink, #000000)' }}>{words.length > 1 ? <>{words.slice(0, -1).join(' ')}<br /><span style={{ fontWeight: 600 }}>{words[words.length - 1]}</span></> : <span style={{ fontWeight: 600 }}>{title}</span>}</span>
              </div>
              )}
              <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontWeight: 700, fontSize: 14 }}>{sharer} shared {kind ? `${/^[aeiou]/i.test(kind) ? 'an' : 'a'} ${kind}` : 'a'} list with you</span><span style={{ fontSize: 12, color: 'var(--mute2, #6A6A6A)' }}>{host}</span></div>
            </div>
          </section>
          <div style={{ padding: '18px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a href={`sms:?&body=${encodeURIComponent(`${msg} ${url}`)}`} style={bigBtn}>Send by text</a>
            {!canText ? null : !byNumber ? (
              <button type="button" onClick={() => setByNumber(true)} style={{ alignSelf: 'center', border: 0, background: 'transparent', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, padding: '10px 0', cursor: 'pointer', color: 'var(--ink, #000000)' }}>Or let us text it to a number</button>
            ) : (
              <form action={action} className="pop" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 4px' }}>
                <input type="hidden" name="slug" value={slug} />
                <label htmlFor="tonum" style={{ fontWeight: 800, fontSize: 14 }}>Their number</label>
                {!sent ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input id="tonum" name="to" placeholder="(917) 555-0100" inputMode="tel" autoComplete="tel" required className="a2-input dot" style={{ flexGrow: 1, minWidth: 0, fontSize: 18 }} />
                    <button disabled={pending} style={{ flexShrink: 0, border: 0, background: 'var(--inv-bg, #000000)', color: 'var(--inv-fg, #FFFFFF)', fontFamily: 'inherit', fontWeight: 700, fontSize: 15, height: 50, padding: '0 20px', borderRadius: 999, cursor: 'pointer', opacity: pending ? 0.5 : 1 }}>{pending ? 'Sending…' : 'Send'}</button>
                  </div>
                ) : (
                  <div role="status" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 50, padding: '0 14px', background: 'var(--lt, #D8F75A)', boxSizing: 'border-box' }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>Sent to <span className="dot" style={{ fontSize: 16 }}>{fmt(sent)}</span></span>
                    <button type="button" onClick={() => setSent(null)} style={{ border: 0, background: 'transparent', padding: '10px 0', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer', color: 'var(--ink, #000000)' }}>Another</button>
                  </div>
                )}
                {state?.error && !sent ? <span role="alert" style={{ fontSize: 13, fontWeight: 700, color: '#E2452B' }}>{state.error}</span> : null}
                <span style={{ fontSize: 12, color: 'var(--muted, #4A4A4A)' }}>We text them the link from insidejoke{invite.isPrivate ? ', and that number can open this private list' : ''}.</span>
              </form>
            )}
          </div>
        </>
      ) : null}

      {tab === 'invite' ? (
        <>
          <section className="pop" style={{ margin: '18px 16px 0', background: 'var(--lt, #F4D3EE)', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 12, color: '#E2452B' }}>
            <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em' }}>Your party invite</span>
            <span style={{ fontWeight: 700, fontSize: 30, lineHeight: 1, letterSpacing: '-0.02em' }}>{invite.headline}</span>
            <span style={{ fontSize: 14, color: 'var(--warm-ink, #8A2414)' }}>{invite.when || 'Your date · time · place'}</span>
            <div style={{ background: 'var(--surface, #FFFFFF)', color: 'var(--ink, #000000)', display: 'flex', gap: 12, alignItems: 'center', padding: 10 }}>
              <div style={{ width: 64, height: 64, flexShrink: 0, background: 'var(--dk, #13286B)', position: 'relative', overflow: 'hidden' }}><Blob seed={33} width={52} height={48} style={{ left: 6, top: 8 }} /></div>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}><span style={{ fontWeight: 700, fontSize: 15 }}>Gift list</span><span style={{ fontSize: 12, color: 'var(--muted, #4A4A4A)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pretty}</span></span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--warm-ink, #8A2414)' }}>Paste the link into any invite. The list holds no party details.</span>
          </section>
          <div style={{ padding: '18px 16px 0' }}><button type="button" onClick={() => doCopy('invite', url)} style={{ ...bigBtn, background: copied === 'invite' ? 'var(--lt, #D8F75A)' : 'var(--inv-bg, #000000)', color: copied === 'invite' ? 'var(--ink, #000000)' : 'var(--inv-fg, #FFFFFF)' }}>{copied === 'invite' ? 'Copied' : 'Copy link for the invite'}</button></div>
        </>
      ) : null}

      {tab === 'profile' && canProfile ? (
        <>
          <section className="pop" style={{ margin: '18px 16px 0', background: 'var(--surface, #FFFFFF)', padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
            <span className="wide" style={{ alignSelf: 'flex-start', fontSize: 11, letterSpacing: '0.18em' }}>Your profile, anywhere</span>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{profile.handle}</span>
            {profile.bio ? <span style={{ fontSize: 14, lineHeight: 1.4 }}>{profile.bio}</span> : null}
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 700, color: 'var(--navy-ink, #13286B)', wordBreak: 'break-all' }}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--navy-ink, #13286B)" strokeWidth="1.96" strokeLinecap="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>{prettyProfile}</span>
            <span style={{ marginTop: 6, fontSize: 12, color: 'var(--muted, #4A4A4A)' }}>This link always shows your public lists, so you only add it once.</span>
          </section>
          <div style={{ padding: '18px 16px 0' }}><button type="button" onClick={() => doCopy('profile', profileUrl)} style={{ ...bigBtn, background: copied === 'profile' ? 'var(--lt, #D8F75A)' : 'var(--inv-bg, #000000)', color: copied === 'profile' ? 'var(--ink, #000000)' : 'var(--inv-fg, #FFFFFF)' }}>{copied === 'profile' ? 'Copied' : 'Copy profile link'}</button></div>
        </>
      ) : null}

      <section style={{ margin: '22px 20px 0', paddingTop: 14, borderTop: '1.5px solid var(--line, #000000)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}><span style={{ fontSize: 12, color: 'var(--muted, #4A4A4A)' }}>List link</span><span style={{ fontSize: 15, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pretty}</span></span>
        <button type="button" onClick={() => doCopy('link', url)} style={{ flexShrink: 0, border: '1.5px solid var(--edge, #000000)', background: copied === 'link' ? 'var(--lt, #D8F75A)' : 'transparent', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, padding: '9px 16px', borderRadius: 999, cursor: 'pointer', color: 'var(--ink, #000000)' }}>{copied === 'link' ? 'Copied' : 'Copy'}</button>
      </section>
      <div style={{ height: 40 }} />
    </>
  );
}
