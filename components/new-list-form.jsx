'use client';

import { useActionState, useState } from 'react';
import { createList } from '@/lib/actions';
import { Blob, Avatar } from '@/components/ui';

const OCC = ['Birthday', 'Holidays', 'Just because', 'New place', "Dinner I'm hosting", 'Secret Santa'];
const VIS = [['public', 'Public', 'On your profile. Anyone you share it with, or who finds it, can give.'], ['private', 'Private', 'Only the people you pick. Nobody else knows it exists.']];

const H2 = ({ n, children }) => (
  <h2 style={{ margin: 0, display: 'flex', alignItems: 'baseline', gap: 10 }}><span className="dot" style={{ fontSize: 14 }}>{n}</span><span className="wide" style={{ fontSize: 12, letterSpacing: '0.18em' }}>{children}</span></h2>
);
const Plus = () => <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>;
const Dash = () => <svg aria-hidden="true" width="18" height="8" viewBox="0 0 18 8"><path d="M1 4h16" stroke="#000000" strokeWidth="1.5" strokeDasharray="1.5 4" strokeLinecap="round" /></svg>;
const pillStyle = (on) => ({ border: `1.5px solid ${on ? '#E2452B' : '#000000'}`, background: on ? '#F4D3EE' : 'transparent', color: on ? '#E2452B' : '#000000', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, minHeight: 44, padding: '0 16px', borderRadius: 999, cursor: 'pointer' });
const Section = ({ children, first }) => (
  <section style={first ? { padding: '28px 20px 0', display: 'flex', flexDirection: 'column', gap: 12 } : { margin: '28px 20px 0', paddingTop: 24, borderTop: '1px solid #000000', display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</section>
);

function Switch({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} style={{ position: 'relative', width: 56, height: 32, flexShrink: 0, borderRadius: 999, border: '1.5px solid #000000', background: on ? '#000000' : 'transparent', padding: 0, cursor: 'pointer', margin: '6px 0' }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 27 : 3, width: 24, height: 24, borderRadius: '50%', background: on ? '#D8F75A' : '#000000', transition: 'left .15s' }} />
    </button>
  );
}

function Chip({ user, onRemove }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1.5px solid #000000', borderRadius: 999, padding: '4px 6px 4px 4px', fontSize: 14, fontWeight: 700, height: 40, boxSizing: 'border-box' }}>
      <Avatar user={user} size={30} />{user.name}
      <button type="button" onClick={onRemove} aria-label={`Remove ${user.name}`} style={{ width: 28, height: 28, border: 0, background: 'transparent', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: -2 }}>
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
      </button>
    </span>
  );
}

export default function NewListForm({ me, friends = [] }) {
  const [state, action, pending] = useActionState(createList, null);
  const [forWho, setForWho] = useState('me');
  const [title, setTitle] = useState('For my birthday');
  const pickFor = (k) => { setForWho(k); if (k === 'other' && title === 'For my birthday') setTitle(''); if (k === 'me' && title === '') setTitle('For my birthday'); };
  const [surprise, setSurprise] = useState(false);
  const [occ, setOcc] = useState('Birthday');
  const [extra, setExtra] = useState([]);
  const [adding, setAdding] = useState(false);
  const [newOcc, setNewOcc] = useState('');
  const [collabs, setCollabs] = useState([]);
  const [phones, setPhones] = useState([]);
  const [picking, setPicking] = useState(false);
  const [phone, setPhone] = useState('');
  const [hasDate, setHasDate] = useState(false);
  const [vis, setVis] = useState('public');
  const [picked, setPicked] = useState({});

  const sur = forWho === 'other' && surprise;
  const showDate = hasDate || sur;
  const isPrivate = !sur && vis === 'private';
  const nPicked = Object.values(picked).filter(Boolean).length;
  const pool = friends.filter((f) => !collabs.some((c) => c.id === f.id));
  const saveOcc = () => { const v = newOcc.trim(); if (v) { setExtra((x) => x.concat([v])); setOcc(v); } setAdding(false); setNewOcc(''); };
  const addPhone = () => { const v = phone.trim(); if (v) setPhones((p) => p.concat([v])); setPhone(''); };

  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <section aria-label="Name" style={{ position: 'relative', height: 250, margin: '8px 0 0', background: '#13286B', overflow: 'hidden' }}>
        <Blob seed={22} width={314} height={210} style={{ left: 38, top: 24 }} />
        <label htmlFor="lname" className="wide" style={{ position: 'absolute', left: 0, top: 16, width: '100%', textAlign: 'center', fontSize: 11, letterSpacing: '0.18em', color: '#FFFFFF' }}>Name your list</label>
        <input id="lname" name="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={forWho === 'other' ? 'For Mom' : 'For my birthday'} style={{ position: 'absolute', left: 60, right: 60, top: 96, border: 0, borderBottom: '1.5px solid #000000', background: 'transparent', textAlign: 'center', fontFamily: "'EB Garamond', serif", fontSize: 40, color: '#000000', padding: '4px 0', boxSizing: 'border-box', width: 'calc(100% - 120px)', borderRadius: 0, outline: 'none' }} />
        <span style={{ position: 'absolute', left: 0, bottom: 16, width: '100%', textAlign: 'center', fontSize: 12, color: '#FFFFFF' }}>You can rename it anytime</span>
      </section>

      <Section first>
        <H2 n="01">Who is it for</H2>
        <input type="hidden" name="forWho" value={forWho} />
        <div role="radiogroup" aria-label="Who it is for" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[['me', 'Me', 'A list for you'], ['other', 'Someone else', 'Mom, a friend, your kid']].map(([k, l, sub]) => {
            const on = forWho === k;
            return (
              <button key={k} type="button" role="radio" aria-checked={on} onClick={() => pickFor(k)} style={{ textAlign: 'left', border: '1.5px solid #000000', background: on ? '#000000' : 'transparent', color: on ? '#FFFFFF' : '#000000', fontFamily: 'inherit', padding: '14px 12px', minHeight: 72, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, cursor: 'pointer', borderRadius: 0 }}>
                <span style={{ fontWeight: 800, fontSize: 16 }}>{l}</span><span style={{ fontSize: 12, lineHeight: 1.35 }}>{sub}</span>
              </button>
            );
          })}
        </div>
        {forWho === 'other' ? (
          <div className="pop" style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#D8F75A', padding: '16px 14px' }}>
            <label htmlFor="theirname" style={{ fontSize: 16, fontWeight: 800 }}>Write their name</label>
            <input id="theirname" name="recipient" placeholder="Mom, Leila, the twins" style={{ height: 52, border: '1.5px solid #000000', background: '#FFFFFF', fontFamily: "'EB Garamond', serif", fontSize: 22, padding: '0 14px', borderRadius: 0, width: '100%' }} />
            <span style={{ fontSize: 13, lineHeight: 1.4 }}>It goes on the list, like “For Mom.” You add their number when you hand it off.</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingTop: 12, borderTop: '1px solid #000000' }}>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontWeight: 800, fontSize: 15 }}>Keep it a surprise?</span><span style={{ fontSize: 13 }}>They will not see it until you send it.</span></span>
              <Switch on={surprise} onChange={setSurprise} label="Keep it a surprise" />
              {surprise ? <input type="hidden" name="surprise" value="1" /> : null}
            </div>
          </div>
        ) : null}
      </Section>

      <Section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><H2 n="02">Occasion</H2><span style={{ fontSize: 12, color: '#4A4A4A' }}>Optional</span></div>
        <input type="hidden" name="occasion" value={occ} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {OCC.concat(extra).map((o) => (
            <button key={o} type="button" aria-pressed={occ === o} onClick={() => setOcc(occ === o ? '' : o)} style={pillStyle(occ === o)}>{o}</button>
          ))}
          {!adding ? (
            <button type="button" onClick={() => setAdding(true)} aria-label="Add your own occasion" style={{ border: '1.5px dashed #000000', background: 'transparent', color: '#000000', fontFamily: 'inherit', fontSize: 14, minHeight: 44, padding: '0 16px', borderRadius: 999, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><Plus />Your own</button>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid #000000', background: '#FFFFFF', borderRadius: 999, padding: '3px 3px 3px 14px' }}>
              <label htmlFor="occnew" className="sr">New occasion</label>
              <input id="occnew" autoFocus value={newOcc} onChange={(e) => setNewOcc(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveOcc(); } }} placeholder="Housewarming" style={{ width: 130, border: 0, background: 'transparent', fontFamily: 'inherit', fontSize: 14, outline: 'none' }} />
              <button type="button" onClick={saveOcc} style={{ border: 0, background: '#000000', color: '#FFFFFF', fontFamily: 'inherit', fontWeight: 800, fontSize: 13, height: 36, padding: '0 14px', borderRadius: 999, cursor: 'pointer' }}>Add</button>
            </span>
          )}
        </div>
      </Section>

      <Section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><H2 n="03">Collaborators</H2><span style={{ fontSize: 12, color: '#4A4A4A' }}>Optional</span></div>
        {collabs.map((c) => <input key={c.id} type="hidden" name="collab" value={c.id} />)}
        {phones.map((p, i) => <input key={i} type="hidden" name="collabPhone" value={p} />)}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', rowGap: 10 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1.5px solid #000000', background: '#000000', color: '#FFFFFF', borderRadius: 999, padding: '4px 14px 4px 4px', fontSize: 14, fontWeight: 700, height: 40, boxSizing: 'border-box' }}><Avatar user={me} size={30} owner />You</span>
          {collabs.map((c) => <span key={c.id} style={{ display: 'contents' }}><Dash /><Chip user={c} onRemove={() => setCollabs((x) => x.filter((y) => y.id !== c.id))} /></span>)}
          {phones.map((p, i) => <span key={p + i} style={{ display: 'contents' }}><Dash /><Chip user={{ name: p, color: '#D7D7DC', seed: 50 + i }} onRemove={() => setPhones((x) => x.filter((_, j) => j !== i))} /></span>)}
          <Dash />
          <button type="button" onClick={() => setPicking((p) => !p)} aria-expanded={picking} style={{ border: '1.5px dashed #000000', background: picking ? '#FFFFFF' : 'transparent', fontFamily: 'inherit', fontSize: 14, height: 40, padding: '0 16px', borderRadius: 999, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><Plus />{collabs.length + phones.length ? 'Add' : 'Add someone'}</button>
        </div>
        {picking ? (
          <div className="pop" style={{ display: 'flex', flexDirection: 'column', background: '#FFFFFF', border: '1.5px solid #000000', padding: '4px 12px 12px' }}>
            {pool.length ? pool.map((f) => (
              <button key={f.id} type="button" onClick={() => { setCollabs((x) => x.concat([f])); setPicking(false); }} style={{ display: 'flex', alignItems: 'center', gap: 12, border: 0, borderBottom: '1px solid #000000', background: 'transparent', fontFamily: 'inherit', padding: '8px 0', minHeight: 52, cursor: 'pointer', textAlign: 'left' }}>
                <Avatar user={f} size={36} /><span style={{ flexGrow: 1, fontSize: 15, fontWeight: 700 }}>{f.name}</span><Plus />
              </button>
            )) : <span style={{ fontSize: 13, color: '#4A4A4A', padding: '10px 0', borderBottom: '1px solid #000000' }}>{friends.length ? 'Everyone is on it.' : 'No friends on insidejoke yet. Add them by number.'}</span>}
            <label htmlFor="collabphone" style={{ fontWeight: 800, fontSize: 13, marginTop: 12 }}>Or a phone number</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <input id="collabphone" name="collabPhone" value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPhone(); } }} inputMode="tel" placeholder="(917) 555-0100" className="dot" style={{ flexGrow: 1, minWidth: 0, height: 44, border: '1.5px solid #000000', background: '#FFFFFF', fontSize: 17, padding: '0 12px', borderRadius: 0 }} />
              <button type="button" onClick={addPhone} style={{ border: 0, background: '#000000', color: '#FFFFFF', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, height: 44, padding: '0 16px', borderRadius: 999, cursor: 'pointer' }}>Add</button>
            </div>
            <span style={{ fontSize: 12, color: '#4A4A4A', marginTop: 6 }}>They get a text with the invite.</span>
          </div>
        ) : null}
        <span style={{ fontSize: 13, lineHeight: 1.4, color: '#4A4A4A' }}>They can add things, share it and send text blasts with you.</span>
      </Section>

      <Section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><H2 n="04">{sur ? 'Send it on' : 'Add a date'}</H2><span style={{ fontSize: 12, color: '#4A4A4A' }}>{sur ? 'The reveal' : 'Optional'}</span></div>
          {!sur ? <Switch on={hasDate} onChange={setHasDate} label="Add a date" /> : null}
        </div>
        {showDate ? <input type="hidden" name="hasDate" value="1" /> : null}
        {showDate ? (
          <div className="pop" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label htmlFor="ldate" className="sr">Date</label>
            <input id="ldate" name="date" type="date" required={sur} style={{ height: 52, border: '1.5px solid #000000', background: '#FFFFFF', fontFamily: "'Doto', monospace", fontWeight: 900, fontSize: 18, padding: '0 14px', borderRadius: 0, width: '100%' }} />
            <span style={{ fontSize: 13, lineHeight: 1.45 }}>{sur ? 'It goes out at midnight their time. Reminders go to everyone helping: about 3 days before, and a last call the day before. Never to them.' : 'Reminders go to everyone you share it with: a week after sharing and 2 hours before. The list stays open after.'}</span>
          </div>
        ) : <span style={{ fontSize: 13, lineHeight: 1.45, color: '#4A4A4A' }}>No date: one reminder goes out a week after you share it.</span>}
      </Section>

      <Section>
        <H2 n="05">Who can see it</H2>
        <input type="hidden" name="visibility" value={vis} />
        {sur ? (
          <div className="pop" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ alignSelf: 'flex-start', border: '1.5px solid #E2452B', background: '#F4D3EE', color: '#E2452B', borderRadius: 999, padding: '0 16px', height: 44, display: 'flex', alignItems: 'center', fontWeight: 700, fontSize: 14 }}>Only the people you invite</span>
            <span style={{ fontSize: 13, lineHeight: 1.45, color: '#4A4A4A' }}>It stays off your profile, and they cannot find it, until you send it.</span>
          </div>
        ) : (
          <>
            <div role="radiogroup" aria-label="Visibility" style={{ display: 'flex', gap: 8 }}>
              {VIS.map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={vis === k} onClick={() => setVis(k)} style={{ ...pillStyle(vis === k), padding: '0 18px' }}>{l}</button>)}
            </div>
            <span style={{ fontSize: 13, lineHeight: 1.45, color: '#4A4A4A' }}>{(VIS.find((v) => v[0] === vis) || VIS[0])[2]}</span>
          </>
        )}
        {isPrivate ? (
          <div className="pop" style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid #000000', marginTop: 4 }}>
            {friends.map((p) => {
              const on = !!picked[p.id];
              return (
                <button key={p.id} type="button" onClick={() => setPicked((x) => ({ ...x, [p.id]: !on }))} aria-pressed={on} style={{ display: 'flex', alignItems: 'center', gap: 12, border: 0, borderBottom: '1px solid #000000', background: 'transparent', fontFamily: 'inherit', padding: '8px 0', minHeight: 52, cursor: 'pointer', textAlign: 'left' }}>
                  <Avatar user={p} size={36} />
                  <span style={{ flexGrow: 1, fontSize: 15, fontWeight: 700 }}>{p.name}</span>
                  <span style={{ width: 24, height: 24, border: '1.5px solid #000000', borderRadius: '50%', background: on ? '#000000' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={on ? '#D8F75A' : 'transparent'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg></span>
                  {on ? <input type="hidden" name="viewer" value={p.id} /> : null}
                </button>
              );
            })}
            {!friends.length ? <span style={{ fontSize: 13, color: '#4A4A4A', padding: '10px 0', borderBottom: '1px solid #000000' }}>No friends on insidejoke yet. You pick who sees it when you share.</span> : null}
            <span style={{ paddingTop: 10, fontSize: 13, color: '#4A4A4A' }}>{nPicked} {nPicked === 1 ? 'person' : 'people'} can see it.</span>
          </div>
        ) : null}
      </Section>

      {state?.error ? <div className="err" style={{ margin: '24px 20px 0' }}>{state.error}</div> : null}
      <div style={{ marginTop: 'auto', padding: '36px 16px 36px' }}>
        <button className="btn" disabled={pending} style={{ fontSize: 16, padding: '19px 0' }}>{pending ? 'Making it…' : 'Make it, then add things'}</button>
      </div>
    </form>
  );
}
