'use client';

import { useActionState, useEffect, useRef, useState, startTransition } from 'react';
import { inviteMembers, setSurpriseMode, sendBlast, chooseHandoff, thankGroup } from '@/lib/actions-a4';
import { requestCode, confirmCode } from '@/lib/actions';

const RED = '#E2452B';
const RUST_C = '#C8743A';

// Collab: "Invite by text" box with the iMessage preview.
export function InviteBox({ slug, preview }) {
  const [state, action, pending] = useActionState(inviteMembers, null);
  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input type="hidden" name="slug" value={slug} />
      <div style={{ display: 'flex', gap: 8 }}>
        <label htmlFor="phones" className="sr">Phone number</label>
        <input id="phones" name="phones" inputMode="tel" autoComplete="tel" placeholder="(917) 555-0148" required style={{ flexGrow: 1, minWidth: 0, height: 48, border: '2px solid #000', borderRadius: 0, fontFamily: "'Doto', monospace", fontWeight: 900, fontSize: 17, padding: '0 12px', background: '#fff', color: '#000' }} />
        <button disabled={pending} style={{ flexShrink: 0, height: 48, border: 0, background: RED, color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, padding: '0 16px', cursor: 'pointer' }}>{pending ? 'Sending…' : 'Send invite'}</button>
      </div>
      {state?.error ? <div className="err">{state.error}</div> : null}
      <div style={{ background: '#ECECEC', borderRadius: 18, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ textAlign: 'center', fontSize: 11, color: '#6A6A6A' }}>iMessage · Today {new Date(state?.at || Date.now()).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M/, '')}</span>
        <div key={state?.at || 0} className="a4-slide" style={{ alignSelf: 'flex-end', maxWidth: '86%', background: '#1E88FF', color: '#fff', borderRadius: '18px 18px 4px 18px', padding: '10px 13px', fontSize: 14, lineHeight: 1.4 }}>{preview}</div>
        {state?.ok ? (
          <span style={{ alignSelf: 'flex-end', fontSize: 11, color: '#6A6A6A' }}>Delivered to {state.count === 1 ? '1 person' : `${state.count} people`}</span>
        ) : (
          <div aria-label="Typing" style={{ alignSelf: 'flex-start', background: '#fff', borderRadius: 18, padding: '10px 14px', display: 'flex', gap: 4 }}>
            <span className="a4-t1" style={{ width: 7, height: 7, borderRadius: '50%', background: '#8A8A8A' }} /><span className="a4-t2" style={{ width: 7, height: 7, borderRadius: '50%', background: '#8A8A8A' }} /><span className="a4-t3" style={{ width: 7, height: 7, borderRadius: '50%', background: '#8A8A8A' }} />
          </div>
        )}
      </div>
    </form>
  );
}

// Collab: surprise mode switch, saves on change.
export function SurpriseSwitch({ slug, on, name }) {
  const ref = useRef(null);
  const [val, setVal] = useState(!!on);
  return (
    <form ref={ref} action={setSurpriseMode} style={{ margin: '14px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderTop: `1.5px solid ${RED}`, borderBottom: `1.5px solid ${RED}`, padding: '12px 4px' }}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="on" value={val ? '1' : '0'} />
      <label htmlFor="surpriseSw" style={{ display: 'flex', flexDirection: 'column', gap: 2, cursor: 'pointer' }}><span style={{ fontWeight: 800, fontSize: 16 }}>Surprise mode</span><span style={{ fontSize: 12, color: '#8A2414' }}>{val ? `${name} can't see this list until you send it` : `${name} can see this list if you share it`}</span></label>
      <span className="a4-sw"><input id="surpriseSw" type="checkbox" role="switch" checked={val} onChange={(e) => { setVal(e.target.checked); setTimeout(() => ref.current?.requestSubmit(), 0); }} /><span /></span>
    </form>
  );
}

// Invite: pick friends, or type numbers. One text each with the join link.
export function ContactPicker({ slug, friends, link, name, surprise }) {
  const [state, action, pending] = useActionState(inviteMembers, null);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState({});
  const [typed, setTyped] = useState('');
  const [copied, setCopied] = useState(false);
  const typedN = typed.split(/[\n,;]+/).filter((x) => x.replace(/\D/g, '').length >= 7).length;
  const n = Object.values(sel).filter(Boolean).length + typedN;
  const shown = friends.filter((f) => !q || f.name.toLowerCase().includes(q.toLowerCase()));
  const Row = ({ f }) => (
    <label className="a4-pick" style={{ opacity: f.member ? 0.55 : 1 }}>
      <input type="checkbox" name="userId" value={f.id} disabled={f.member} checked={!!sel[f.id] || f.member} onChange={(e) => setSel({ ...sel, [f.id]: e.target.checked })} />
      {f.avatar}
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1 }}><span style={{ fontWeight: 800, fontSize: 16 }}>{f.name}</span><span style={{ fontSize: 12, color: '#8A2414' }}>{f.member ? 'Already on this list' : f.sub}</span></span>
      <span className="a4-tick"><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg></span>
    </label>
  );
  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <input type="hidden" name="slug" value={slug} />
      <div style={{ margin: '18px 20px 0', display: 'flex', alignItems: 'center', gap: 10, height: 46, border: `2px solid ${RED}`, borderRadius: 999, padding: '0 16px', background: '#fff' }}>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
        <label htmlFor="q" className="sr">Search friends</label>
        <input id="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search friends" style={{ flexGrow: 1, minWidth: 0, border: 0, outline: 'none', fontFamily: 'inherit', fontSize: 15, background: 'transparent', color: '#000' }} />
      </div>
      <section aria-label="Friends" style={{ padding: '18px 20px 0', display: 'flex', flexDirection: 'column' }}>
        <h2 className="wide" style={{ margin: '0 0 6px', fontSize: 13, letterSpacing: '0.16em' }}>On insidejoke</h2>
        {shown.length === 0 ? <p className="a4-pick" style={{ margin: 0, fontSize: 14 }}>{friends.length ? 'No friend by that name.' : 'No friends on insidejoke yet. Text them below.'}</p> : null}
        {shown.map((f) => <Row key={f.id} f={f} />)}
        <h2 className="wide" style={{ margin: '18px 0 6px', fontSize: 13, letterSpacing: '0.16em' }}>Invite by text</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: `1.5px solid ${RED}` }}>
          <span aria-hidden="true" style={{ width: 42, height: 42, flexShrink: 0, borderRadius: '50%', border: `2px dashed ${RED}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: RED }}>+</span>
          <label htmlFor="phones" className="sr">Phone numbers</label>
          <input id="phones" name="phones" value={typed} onChange={(e) => setTyped(e.target.value)} inputMode="tel" placeholder="(917) 555-0193, (646) 555-0117" style={{ flexGrow: 1, minWidth: 0, border: 0, borderBottom: '1.5px solid #000', background: 'transparent', fontFamily: "'Doto', monospace", fontWeight: 900, fontSize: 16, padding: '8px 0', color: '#000', outline: 'none' }} />
        </div>
      </section>
      <div style={{ marginTop: 24, padding: '22px 16px 28px', display: 'flex', flexDirection: 'column', gap: 10, borderTop: `1.5px solid ${RED}` }}>
        {state?.error ? <div className="err">{state.error}</div> : null}
        {state?.ok ? <p className="pop" style={{ margin: 0, textAlign: 'center', fontWeight: 800, fontSize: 15 }}>Texted {state.count === 1 ? '1 person' : `${state.count} people`}. They can join with one tap.</p> : null}
        <button className="a4-btn" disabled={pending || n === 0}>{pending ? 'Sending…' : n === 0 ? 'Pick someone to invite' : n === 1 ? 'Invite 1 person' : `Invite ${n} people`}</button>
        <button type="button" className="a4-ghost" onClick={async () => { try { await navigator.clipboard.writeText(link); } catch {} setCopied(true); }}>{copied ? `Link copied · ${link.replace(/^https?:\/\//, '')}` : 'Copy link and text it yourself'}</button>
        <span style={{ textAlign: 'center', fontSize: 12, color: '#8A2414' }}>{surprise ? `Surprise mode is on, so ${name} is hidden from this list.` : `Anyone with the link can join and add to ${name}'s list.`}</span>
      </div>
    </form>
  );
}

// Six boxes over one real input (one-time-code autofill works).
export function CodeBoxes({ name = 'code', border = '#000', accent = RED, height = 58, fontSize = 28, gap = 8, bg = '#fff', autoFocus = true }) {
  const [v, setV] = useState('');
  return (
    <div className="a4-digits" style={{ gap }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <span key={i} aria-hidden="true" className={i === Math.min(v.length, 5) ? 'cur' : ''} style={{ height, fontSize, background: bg, borderColor: i === Math.min(v.length, 5) ? accent : border }}>{v[i] || ''}</span>
      ))}
      <input name={name} aria-label="Six-digit code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" required autoFocus={autoFocus} value={v} onChange={(e) => setV(e.target.value.replace(/\D/g, '').slice(0, 6))} />
    </div>
  );
}

// /join/[slug] when signed out: name + number, then the code.
// r4: (917) 555-0148 instead of +19175550148
const prettyPhone = (p = '') => { const d = String(p).replace(/\D/g, '').slice(-10); return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : p; };
export function JoinSignup({ next, title, invite, children }) {
  const [s1, act1, p1] = useActionState(requestCode, { next });
  const [s2, act2, p2] = useActionState(confirmCode, null);
  const codeStep = s1?.step === 'code';
  return (
    <div className="a4-up" style={{ display: 'flex', flexDirection: 'column' }}>
      <section style={{ margin: '18px 16px 0', background: '#fff', borderRadius: 18, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ textAlign: 'center', fontSize: 11, color: '#6A6A6A' }}>Messages · insidejoke</span>
        <div style={{ alignSelf: 'flex-start', maxWidth: '86%', background: '#ECECEC', color: '#000', borderRadius: '18px 18px 18px 4px', padding: '10px 13px', fontSize: 14, lineHeight: 1.4 }}>{invite}</div>
      </section>
      {children}
      {codeStep ? (
        <form action={act2} style={{ display: 'flex', flexDirection: 'column' }}>
          <input type="hidden" name="phone" value={s1.phone} /><input type="hidden" name="name" value={s1.name || ''} /><input type="hidden" name="next" value={next} />
          <p style={{ margin: '14px 28px 0', textAlign: 'center', fontSize: 15, lineHeight: 1.4, color: '#000' }}>Enter the code we just texted to {prettyPhone(s1.phone)}. That's it, you're in.</p>
          <div style={{ margin: '20px 20px 0' }}><CodeBoxes /></div>
          {s2?.error ? <div className="err" style={{ margin: '12px 20px 0' }}>{s2.error}</div> : null}
          {s1.testCode ? <p style={{ margin: '12px 20px 0', fontSize: 14, padding: '10px 12px', background: '#D8F75A', color: '#000' }}>Test mode, nothing was really texted. Your code is <span className="dot" style={{ fontSize: 18 }}>{s1.testCode}</span></p> : null}
          <button className="a4-btn" disabled={p2} style={{ margin: '22px 16px 0', width: 'auto' }}>{p2 ? 'Checking…' : 'Open the list'}</button>
          <span style={{ margin: '12px 20px 0', textAlign: 'center', fontSize: 12, color: '#8A2414' }}>No password. Your number is your account. Already on insidejoke? The invite is waiting in the app too.</span>
        </form>
      ) : (
        <form action={act1} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '14px 20px 0' }}>
          <input type="hidden" name="next" value={next} />
          <p style={{ margin: 0, textAlign: 'center', fontSize: 15, lineHeight: 1.4, color: '#000' }}>Add your name and number to join {title}. We text you a code, no password.</p>
          <label className="sr" htmlFor="jname">Your name</label>
          <input id="jname" name="name" defaultValue={s1?.name || ''} placeholder="Your name" autoComplete="given-name" required style={{ height: 52, border: '2px solid #000', background: '#fff', fontFamily: 'inherit', fontSize: 17, padding: '0 14px', color: '#000', borderRadius: 0 }} />
          <label className="sr" htmlFor="jphone">Phone number</label>
          <input id="jphone" name="phone" inputMode="tel" autoComplete="tel" placeholder="(917) 555-0148" required style={{ height: 52, border: '2px solid #000', background: '#fff', fontFamily: "'Doto', monospace", fontWeight: 900, fontSize: 20, padding: '0 14px', color: '#000', borderRadius: 0 }} />
          {s1?.error ? <div className="err">{s1.error}</div> : null}
          <button className="a4-btn" disabled={p1} style={{ marginTop: 10 }}>{p1 ? 'Sending…' : 'Text me a code'}</button>
          <span style={{ textAlign: 'center', fontSize: 12, color: '#8A2414' }}>No password. Your number is your account.</span>
        </form>
      )}
    </div>
  );
}

export function BlastForm({ slug, suggestion, count, people, children, list, prefix, link }) {
  const [state, action, pending] = useActionState(sendBlast, null);
  const [body, setBody] = useState(suggestion); // r4: live "What people get" preview
  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column' }}>
      <input type="hidden" name="slug" value={slug} />
      <section style={{ margin: '22px 16px 0', background: '#fff', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 12, color: '#000' }}>
        <label htmlFor="blast" className="wide" style={{ fontSize: 12, letterSpacing: '0.16em', color: RED }}>Your message</label>
        <textarea id="blast" name="body" rows={4} maxLength={320} value={body} onChange={(e) => setBody(e.target.value)} required style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #000', background: '#fff', resize: 'none', fontFamily: "'EB Garamond', serif", fontSize: 20, lineHeight: 1.3, padding: '12px 14px', color: '#000', borderRadius: 0 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingTop: 4 }}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontWeight: 800, fontSize: 15 }}>{people}</span><span style={{ fontSize: 12, color: '#4A4A4A' }}>By text · people who already gave get it too</span></span>
          {children}
        </div>
        <label htmlFor="pin" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderTop: '1px solid #000', padding: '14px 0 2px', cursor: 'pointer' }}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontWeight: 800, fontSize: 15 }}>Pin it on the list</span><span style={{ fontSize: 12, color: '#4A4A4A' }}>Anyone who opens the list sees it at the top</span></span>
          <span className="a4-sw" style={{ width: 52, height: 30 }}><input id="pin" name="pin" type="checkbox" role="switch" defaultChecked /><span /></span>
        </label>
      </section>
      <p style={{ margin: '12px 24px 0', textAlign: 'center', fontSize: 13, color: '#8A2414' }}>People can reply STOP to opt out.</p>
      {state?.error ? <div className="err" style={{ margin: '12px 16px 0' }}>{state.error}</div> : null}
      <div style={{ padding: '20px 16px 34px' }}>
        <button className="a4-btn" disabled={pending || count === 0}>{pending ? 'Sending…' : count === 0 ? 'Nobody to text yet' : `Send blast to ${count}`}</button>
      </div>
      {list}
      {prefix ? (
        <section style={{ margin: '22px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 className="wide" style={{ margin: 0, fontSize: 13, letterSpacing: '0.16em' }}>What people get</h2>
          <div style={{ background: '#ECECEC', borderRadius: 18, padding: 14, display: 'flex', flexDirection: 'column', gap: 6, color: '#000' }}>
            <span style={{ textAlign: 'center', fontSize: 11, color: '#6A6A6A' }}>Text message · insidejoke</span>
            <div style={{ alignSelf: 'flex-start', maxWidth: '88%', background: '#FFFFFF', borderRadius: '18px 18px 18px 4px', padding: '10px 13px', fontSize: 14, lineHeight: 1.4, overflowWrap: 'anywhere' }}>{prefix} {body} {link}</div>
            <span style={{ alignSelf: 'flex-start', fontSize: 11, color: '#6A6A6A' }}>Reply STOP to opt out</span>
          </div>
        </section>
      ) : null}
      {prefix ? <div style={{ height: 36 }} /> : null}
    </form>
  );
}

// Handoff: cash out (who) or send as a surprise (number + when).
export function HandoffForm({ slug, team, meId, name, list }) {
  const [state, action, pending] = useActionState(chooseHandoff, null);
  const [pick, setPick] = useState(state?.pick || (list.handoff === 'surprise' ? 'surprise' : 'cashout'));
  const [who, setWho] = useState(list.cashout_user_id || meId);
  const [when, setWhen] = useState(list.send_at ? 'date' : 'now');
  const [date, setDate] = useState(list.send_at ? new Date(list.send_at).toISOString().slice(0, 10) : '');
  const whoName = team.find((m) => m.id === who)?.first || 'them';
  const sendAtMs = date ? new Date(date + 'T00:00').getTime() : '';
  const today = new Date(); today.setDate(today.getDate() + 1);
  const cta = pick === 'cashout' ? (who === meId ? 'Cash out to my wallet' : `Let ${whoName} cash out`) : 'Set up the surprise';
  const Opt = ({ k, n, title, sub }) => (
    <label className="a4-opt">
      <input type="radio" name="pick" value={k} checked={pick === k} onChange={() => setPick(k)} />
      <span className="wide" style={{ fontSize: 12, letterSpacing: '0.16em' }}>{n}</span>
      <span style={{ fontWeight: 800, fontSize: 21, lineHeight: 1.15 }}>{title}</span>
      <span style={{ fontSize: 14, lineHeight: 1.4 }}>{sub}</span>
    </label>
  );
  const inputStyle = { height: 48, border: '2px solid #000', background: '#fff', fontFamily: 'inherit', fontSize: 16, padding: '0 12px', color: '#000', borderRadius: 0, minWidth: 0 };
  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column' }}>
      <input type="hidden" name="slug" value={slug} />
      <section role="radiogroup" aria-label="Handoff" style={{ padding: '20px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Opt k="cashout" n="Option one" title="One of us cashes out and buys the gifts" sub={`The money goes to one wallet. Show ${name} the list whenever you like.`} />
        {pick === 'cashout' ? (
          <div className="pop" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '2px 4px 6px' }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Who cashes out?</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {team.map((m) => (
                <label key={m.id} className="a4-who" style={{ minWidth: 120 }}>
                  <input type="radio" name="who" value={m.id} checked={who === m.id} onChange={() => setWho(m.id)} />
                  {m.avatar}{m.id === meId ? 'You' : m.first}
                </label>
              ))}
            </div>
            <span style={{ fontSize: 12, color: '#8A2414' }}>The 7% fee comes out at cash-out.</span>
          </div>
        ) : null}
        <Opt k="surprise" n="Option two" title={`Send it to ${name} as a surprise`} sub={`${name} gets one text, opens the gifts and notes, and claims them.`} />
        {pick === 'surprise' ? (
          <div className="pop" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '2px 4px 6px', color: '#000' }}>
            <label htmlFor="rphone" style={{ fontSize: 13, fontWeight: 700, color: RED }}>{name}'s number</label>
            <input id="rphone" name="phone" inputMode="tel" autoComplete="off" defaultValue={list.recipient_phone || ''} placeholder="(646) 555-0192" style={{ ...inputStyle, fontFamily: "'Doto', monospace", fontWeight: 900, fontSize: 18 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: RED }}>When does it go out?</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {[['now', 'Right away'], ['date', 'On a day']].map(([k, l]) => (
                <label key={k} className="a4-who"><input type="radio" name="when" value={k} checked={when === k} onChange={() => setWhen(k)} />{l}</label>
              ))}
            </div>
            {when === 'date' ? (
              <>
                <label htmlFor="sdate" className="sr">Day it goes out</label>
                <input id="sdate" type="date" name="date" value={date} min={today.toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
                <input type="hidden" name="sendAtMs" value={sendAtMs} />
                <span style={{ fontSize: 12, color: '#8A2414' }}>It goes out at midnight, the moment the day starts.</span>
              </>
            ) : <span style={{ fontSize: 12, color: '#8A2414' }}>You send it from the next screen, after the card.</span>}
          </div>
        ) : null}
      </section>
      {state?.error ? <div className="err" style={{ margin: '14px 16px 0' }}>{state.error}</div> : null}
      <div style={{ padding: '24px 16px 30px' }}>
        <button className="a4-btn" disabled={pending}>{pending ? 'Saving…' : cta}</button>
      </div>
    </form>
  );
}

// A voice note: round play button + waveform + "Name · 0:14".
export function VoicePlayer({ src, who, dark = false, seed = 37 }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [len, setLen] = useState('');
  const ink = dark ? '#FFE34D' : '#000';
  const bars = Array.from({ length: 22 }, (_, i) => ({ h: 8 + ((i * seed) % 18), d: `${-(i * 0.11)}s` }));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: dark ? '#000' : '#ECECEF', color: dark ? '#fff' : '#000', padding: dark ? 12 : '10px 12px' }}>
      <button type="button" aria-label={`${playing ? 'Pause' : 'Play'} ${who}'s voice note`} onClick={() => { const a = ref.current; if (!a) return; if (a.paused) a.play(); else a.pause(); }} style={{ width: dark ? 40 : 32, height: dark ? 40 : 32, flexShrink: 0, borderRadius: '50%', border: 0, background: dark ? '#FFE34D' : '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
        {playing ? <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill={dark ? '#000' : '#fff'}><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg> : <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill={dark ? '#000' : '#fff'}><path d="M6 4l14 8-14 8z" /></svg>}
      </button>
      <span aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 3, flexGrow: 1, height: 28, overflow: 'hidden' }}>
        {bars.map((b, i) => <span key={i} className={playing || dark ? 'a4-w' : ''} style={{ width: 3, flexShrink: 0, height: b.h, background: ink, animationDelay: b.d }} />)}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{who}{len ? ` · ${len}` : ''}</span>
      <audio ref={ref} src={src} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
        onLoadedMetadata={(e) => { const d = e.currentTarget.duration; if (Number.isFinite(d)) setLen(`${Math.floor(d / 60)}:${String(Math.round(d % 60)).padStart(2, '0')}`); }} />
    </div>
  );
}

// /reveal/[token] sign-up: the code goes to the number the organisers entered; confirming it opens the surprise.
export function RevealSignup({ phone, name, next, masked, auto }) {
  const [s1, act1, p1] = useActionState(requestCode, { next });
  const [s2, act2, p2] = useActionState(confirmCode, null);
  const [resent, setResent] = useState(false);
  const sent = s1?.step === 'code';
  const ask = () => { const fd = new FormData(); fd.set('phone', phone); fd.set('name', name); fd.set('next', next); startTransition(() => act1(fd)); };
  useEffect(() => { if (auto) ask(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <section style={{ margin: '26px 16px 0', background: '#fff', padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {sent ? (
        <form action={act2} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input type="hidden" name="phone" value={s1.phone} /><input type="hidden" name="name" value={name} /><input type="hidden" name="next" value={next} />
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.4 }}>One code and it's yours. We just texted it to <span style={{ fontWeight: 800 }}>{masked}</span>.</p>
          <CodeBoxes height={54} fontSize={26} gap={6} bg="transparent" accent={RUST_C} />
          {s2?.error ? <div className="err">{s2.error}</div> : null}
          {s1.testCode ? <p style={{ margin: 0, fontSize: 14, padding: '10px 12px', background: '#D8F75A' }}>Test mode, nothing was really texted. The code is <span className="dot" style={{ fontSize: 18 }}>{s1.testCode}</span></p> : null}
          <button disabled={p2} style={{ border: 0, background: RUST_C, color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 18, padding: '17px 0', borderRadius: 999, cursor: 'pointer' }}>{p2 ? 'Opening…' : 'Open it'}</button>
        </form>
      ) : (
        <>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.4 }}>One code and it's yours. We text it to <span style={{ fontWeight: 800 }}>{masked}</span>.</p>
          {s1?.error ? <div className="err">{s1.error}</div> : null}
          <button type="button" onClick={ask} disabled={p1} style={{ border: 0, background: p1 ? '#ECECEF' : RUST_C, color: p1 ? '#4A4A4A' : '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 18, padding: '17px 0', borderRadius: 999, cursor: 'pointer' }}>{p1 ? 'Texting the code…' : 'Text me the code'}</button>
        </>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
        <button type="button" onClick={() => { ask(); setResent(true); }} style={{ border: 0, background: 'transparent', padding: 0, fontFamily: 'inherit', fontSize: 13, textDecoration: 'underline', cursor: 'pointer', color: '#000' }}>{resent ? 'Sent again' : 'Send a new code'}</button>
        <span style={{ color: '#4A4A4A' }}>Not {name}? Ignore this.</span>
      </div>
    </section>
  );
}

// The receiver thanks the whole group: one message (and an optional photo), texted to everyone.
export function ThankGroupForm({ slug, count, suggestion, name, link }) {
  const [state, action, pending] = useActionState(thankGroup, null);
  const [photo, setPhoto] = useState('');
  const [editing, setEditing] = useState(true);
  const fileRef = useRef(null);
  const sent = state?.ok && editing !== 'again';
  if (sent) {
    return (
      <section className="a4-up" style={{ margin: '22px 16px 0', background: '#13286B', color: '#fff', padding: '22px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span className="dot" style={{ fontSize: 40, color: '#D8F75A' }}>{state.count}/{count}</span>
        <p style={{ margin: 0, fontSize: 20, lineHeight: 1.25 }}>Thank-you sent. Each friend opens it in insidejoke{state.photo ? ', photo and all' : ''}.</p>
        <button type="button" onClick={() => setEditing('again')} style={{ alignSelf: 'flex-start', border: '1.5px solid #fff', background: 'transparent', color: '#fff', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, padding: '8px 14px', borderRadius: 999, cursor: 'pointer' }}>See what you sent</button>
      </section>
    );
  }
  return (
    <form action={(fd) => { setEditing(true); return action(fd); }} style={{ display: 'flex', flexDirection: 'column' }}>
      <input type="hidden" name="slug" value={slug} />
      <section style={{ margin: '20px 16px 0', background: '#fff', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label htmlFor="msg" className="wide" style={{ fontSize: 12, letterSpacing: '0.16em', color: RUST_C }}>Your message</label>
        <textarea id="msg" name="message" rows={4} maxLength={500} defaultValue={state?.message || suggestion} required style={{ border: '2px solid #000', fontFamily: "'EB Garamond', serif", fontSize: 20, lineHeight: 1.3, padding: 12, resize: 'none', borderRadius: 0, color: '#000' }} />
        <input ref={fileRef} id="tphoto" type="file" name="photo" accept="image/*" className="sr" onChange={(e) => { const f = e.target.files?.[0]; setPhoto(f ? URL.createObjectURL(f) : ''); }} />
        {photo ? (
          <div style={{ position: 'relative', height: 190, background: '#F4D3EE', overflow: 'hidden' }}>
            <img src={photo} alt="Your photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <button type="button" onClick={() => { if (fileRef.current) fileRef.current.value = ''; setPhoto(''); }} aria-label="Remove photo" style={{ position: 'absolute', right: 8, top: 8, width: 32, height: 32, border: 0, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
          </div>
        ) : (
          <label htmlFor="tphoto" style={{ border: '2px dashed #000', fontWeight: 800, fontSize: 14, padding: 18, textAlign: 'center', cursor: 'pointer' }}>Add a photo (optional)</label>
        )}
      </section>
      <section style={{ margin: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span className="wide" style={{ fontSize: 12, letterSpacing: '0.16em' }}>Each friend gets</span>
        <div style={{ background: '#fff', borderRadius: 18, padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ textAlign: 'center', fontSize: 11, color: '#6A6A6A' }}>Text message</span>
          <div style={{ alignSelf: 'flex-start', maxWidth: '86%', background: '#E9E9EB', borderRadius: '18px 18px 18px 4px', padding: '10px 13px', fontSize: 14, lineHeight: 1.4 }}>{name} sent you a thank-you for the surprise 💛 Open it: {link}</div>
        </div>
      </section>
      {state?.error ? <div className="err" style={{ margin: '12px 16px 0' }}>{state.error}</div> : null}
      <div style={{ padding: '20px 16px 0' }}>
        <button disabled={pending || count === 0} style={{ width: '100%', border: 0, background: '#000', color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 17, padding: '17px 0', borderRadius: 999, cursor: 'pointer' }}>{pending ? 'Sending…' : count === 0 ? 'Nobody to thank yet' : `Send to all ${count}`}</button>
      </div>
    </form>
  );
}
