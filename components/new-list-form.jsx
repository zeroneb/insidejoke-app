'use client';

import { useActionState, useState } from 'react';
import { createList } from '@/lib/actions';
import { Blob, Avatar } from '@/components/ui';
import { defaultListTitle } from '@/lib/list-title';
import { CoverField } from '@/components/cover-picker';

const OCC = ['Birthday', 'Holidays', 'Just because', 'New place', "Dinner I'm hosting", 'Secret Santa'];
const VIS = [['public', 'Public', 'On your profile. Anyone you share it with, or who finds it, can give.'], ['private', 'Private', 'Only the people you pick']];

// r2: Option 10 NewList board headings (no numbers).
const H2 = ({ children }) => <h2 className="wide" style={{ margin: 0, fontSize: 14, letterSpacing: '0.14em' }}>{children}</h2>;
const Plus = () => <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>;
const pillStyle = (on) => ({ border: '1.5px solid #000000', background: on ? '#D8F75A' : 'transparent', color: '#000000', fontFamily: 'inherit', fontSize: 14, minHeight: 40, padding: '0 14px', borderRadius: 999, cursor: 'pointer' });
const Section = ({ children }) => (
  <section style={{ padding: '26px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</section>
);
// Two side-by-side choice cards (Who's it for, Who can see it).
function Cards({ label, opts, value, onPick }) {
  return (
    <div role="radiogroup" aria-label={label} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
      {opts.map(([k, l, sub]) => {
        const on = value === k;
        return (
          <button key={k} type="button" role="radio" aria-checked={on} onClick={() => onPick(k)} style={{ textAlign: 'left', border: '1.5px solid #000000', background: on ? '#000000' : 'transparent', color: on ? '#FFFFFF' : '#000000', fontFamily: 'inherit', padding: '14px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: 4, cursor: 'pointer', borderRadius: 0 }}>
            <span style={{ fontWeight: 700, fontSize: 17 }}>{l}</span><span style={{ fontSize: 12, lineHeight: 1.35 }}>{sub}</span>
          </button>
        );
      })}
    </div>
  );
}

function Switch({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} style={{ position: 'relative', width: 56, height: 32, flexShrink: 0, borderRadius: 999, border: '1.5px solid #000000', background: on ? '#000000' : 'transparent', padding: 0, cursor: 'pointer', margin: '6px 0' }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 27 : 3, width: 24, height: 24, borderRadius: '50%', background: on ? '#D8F75A' : '#000000', transition: 'left .15s' }} />
    </button>
  );
}

function Chip({ user, onRemove }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1.5px solid #000000', borderRadius: 999, padding: '4px 6px 4px 4px', fontSize: 14, height: 40, boxSizing: 'border-box' }}>
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
  const [occ, setOccRaw] = useState('Birthday');
  const [title, setTitleRaw] = useState(defaultListTitle('Birthday'));
  // Until the person types their own name, the name follows the occasion.
  const [titleEdited, setTitleEdited] = useState(false);
  const setTitle = (v) => { setTitleRaw(v); setTitleEdited(v.trim() !== ''); };
  const setOcc = (o) => { setOccRaw(o); if (!titleEdited && forWho === 'me') setTitleRaw(defaultListTitle(o)); };
  const pickFor = (k) => { setForWho(k); if (k !== 'me') setListType('wishes'); if (titleEdited) return; setTitleRaw(k === 'me' ? defaultListTitle(occ) : ''); };
  const [surprise, setSurprise] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [listType, setListType] = useState('wishes');
  const [extra, setExtra] = useState([]);
  const [adding, setAdding] = useState(false);
  const [newOcc, setNewOcc] = useState('');
  const [collabs, setCollabs] = useState([]);
  const [phones, setPhones] = useState([]);
  const [picking, setPicking] = useState(false);
  const [phone, setPhone] = useState('');
  const [hasDate, setHasDate] = useState(true);
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
      <section style={{ padding: '14px 20px 0' }}>
        <input type="hidden" name="listType" value={listType} />
        <div role="radiogroup" aria-label="List type" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[['wishes', 'Wishes', 'Things to get. Pick any cover'], ['treats', 'Treat · unlimited', forWho === 'me' ? 'Coffee, rides, nights out' : 'Only on your own lists']].map(([k, l, sub]) => {
            const on = listType === k, off = k === 'treats' && forWho !== 'me';
            return (
              <button key={k} type="button" role="radio" aria-checked={on} disabled={off} onClick={() => setListType(k)} style={{ textAlign: 'left', border: '1.5px solid #000000', background: on ? '#000000' : 'transparent', color: on ? '#FFFFFF' : '#000000', opacity: off ? 0.45 : 1, fontFamily: 'inherit', padding: '12px', display: 'flex', flexDirection: 'column', gap: 2, cursor: off ? 'default' : 'pointer', borderRadius: 0 }}>
                <strong style={{ fontSize: 15 }}>{l}</strong><span style={{ fontSize: 12 }}>{sub}</span>
              </button>
            );
          })}
        </div>
      </section>

      <CoverField title={title || (forWho === 'other' ? (recipient ? `For ${recipient}` : 'For someone') : defaultListTitle(occ))} onTitle={(t) => setTitle(t)} treat={listType === 'treats' && forWho === 'me'}
        flags={{ surprise: sur, forOther: forWho === 'other', collab: collabs.length + phones.length > 0, occasion: occ }}
        ctx={{ visibility: vis, recipient: recipient || null, people: ['You', ...collabs.map((c) => (c.name || '').split(/\s+/)[0])].filter(Boolean), handle: me?.handle || null }} />

      <section style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label htmlFor="lname" className="wide" style={{ fontSize: 11, letterSpacing: '0.18em' }}>Name your list</label>
        <input id="lname" name="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder={forWho === 'other' ? 'For Mom' : defaultListTitle(occ)} style={{ background: '#FFFFFF', border: '1.5px solid #000000', borderRadius: 0, padding: '10px 14px', fontFamily: "'EB Garamond', serif", fontSize: 30, lineHeight: 1.1, width: '100%', boxSizing: 'border-box', outline: 'none' }} />
        <span style={{ fontSize: 12, color: '#4A4A4A' }}>{listType === 'treats' && forWho === 'me' ? 'Treats are unlimited: friends can send one again and again.' : 'The name goes on your cover as you type. Tap the pencil to edit the cover.'}</span>
      </section>

      <Section>
        <H2>Who's it for</H2>
        <input type="hidden" name="forWho" value={forWho} />
        <Cards label="Who it's for" opts={[['me', 'Me', 'A list for you'], ['other', 'Someone else', 'Mom, a friend, your kid']]} value={forWho} onPick={pickFor} />
        {forWho === 'other' ? (
          <div className="pop" style={{ display: 'flex', flexDirection: 'column', gap: 8, background: '#D8F75A', padding: 14 }}>
            <label htmlFor="theirname" style={{ fontSize: 17, fontWeight: 700 }}>Who is it for? Write their name.</label>
            <input id="theirname" name="recipient" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Their name, like Mom or Leila" style={{ height: 50, border: '2px solid #000000', background: '#FFFFFF', fontFamily: "'EB Garamond', serif", fontSize: 22, padding: '0 14px', borderRadius: 0, width: '100%', boxSizing: 'border-box' }} />
            <span style={{ fontSize: 13, lineHeight: 1.4 }}>Their name goes on the list, like “For Mom.” You'll add their number when you hand it off.</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingTop: 10, borderTop: '1.5px solid #000000' }}>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontWeight: 700, fontSize: 16 }}>Keep it a surprise?</span><span style={{ fontSize: 13 }}>They won't see it until you send it.</span></span>
              <Switch on={surprise} onChange={setSurprise} label="Keep it a surprise" />
              {surprise ? <input type="hidden" name="surprise" value="1" /> : null}
            </div>
            {surprise ? (
              <div className="pop" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="theirphone" style={{ fontWeight: 700, fontSize: 15 }}>Their number <span style={{ fontWeight: 400, fontSize: 13 }}>(optional)</span></label>
                <input id="theirphone" name="recipientPhone" inputMode="tel" autoComplete="off" placeholder="(917) 555-0100" className="dot" style={{ height: 48, border: '2px solid #000000', background: '#FFFFFF', fontSize: 18, padding: '0 14px', borderRadius: 0, width: '100%', boxSizing: 'border-box' }} />
                <span style={{ fontSize: 13, lineHeight: 1.4 }}>So we can keep it from them: this number can't open the list, even with the link, until you send it. Never texted before then.</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </Section>

      <Section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><H2>Occasion</H2><span style={{ fontSize: 12, color: '#4A4A4A' }}>Optional</span></div>
        <input type="hidden" name="occasion" value={occ} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {OCC.concat(extra).map((o) => (
            <button key={o} type="button" aria-pressed={occ === o} onClick={() => setOcc(occ === o ? '' : o)} style={pillStyle(occ === o)}>{o}</button>
          ))}
          {!adding ? (
            <button type="button" onClick={() => setAdding(true)} aria-label="Add your own occasion" style={{ border: '1.5px dashed #000000', background: 'transparent', color: '#000000', fontFamily: 'inherit', fontSize: 14, minHeight: 40, padding: '0 14px', borderRadius: 999, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><span aria-hidden="true" style={{ fontWeight: 700, fontSize: 16, lineHeight: 1 }}>+</span>Add your own</button>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><H2>Collaborators</H2><span style={{ fontSize: 12, color: '#4A4A4A' }}>Optional</span></div>
        {collabs.map((c) => <input key={c.id} type="hidden" name="collab" value={c.id} />)}
        {phones.map((p, i) => <input key={i} type="hidden" name="collabPhone" value={p} />)}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          {collabs.map((c) => <Chip key={c.id} user={c} onRemove={() => setCollabs((x) => x.filter((y) => y.id !== c.id))} />)}
          {phones.map((p, i) => <Chip key={p + i} user={{ name: p, color: '#D7D7DC', seed: 50 + i }} onRemove={() => setPhones((x) => x.filter((_, j) => j !== i))} />)}
          <button type="button" onClick={() => setPicking((p) => !p)} aria-expanded={picking} style={{ border: '1.5px dashed #000000', background: picking ? '#FFFFFF' : 'transparent', fontFamily: 'inherit', fontSize: 14, height: 40, padding: '0 14px', borderRadius: 999, cursor: 'pointer', color: '#000000' }}>{collabs.length + phones.length ? '+ Add more' : '+ Add'}</button>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><H2>{sur ? 'Send it on' : 'Add a date'}</H2><span style={{ fontSize: 12, color: '#4A4A4A' }}>{sur ? 'The reveal' : 'Optional'}</span></div>
          {!sur ? <Switch on={hasDate} onChange={setHasDate} label="Add a date" /> : null}
        </div>
        {showDate ? <input type="hidden" name="hasDate" value="1" /> : null}
        {showDate ? (
          <div className="pop" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label htmlFor="ldate" className="sr">Date</label>
            <input id="ldate" name="date" type="date" required={sur} style={{ height: 48, border: '1.5px solid #000000', background: '#FFFFFF', fontFamily: "'Doto', monospace", fontWeight: 900, fontSize: 18, padding: '0 14px', borderRadius: 0, width: '100%', boxSizing: 'border-box' }} />
            <span style={{ fontSize: 13, lineHeight: 1.45 }}>{sur ? 'It goes out at midnight their time. Reminders go to everyone helping: about 3 days before, and a last call the day before. Never to them.' : 'Reminders go to everyone you share it with: a week after sharing and 2 hours before. The list stays open after.'}</span>
          </div>
        ) : <span style={{ fontSize: 13, lineHeight: 1.45, color: '#4A4A4A' }}>No date: one reminder goes out a week after you share it.</span>}
      </Section>

      <Section>
        <H2>Who can see it</H2>
        <input type="hidden" name="visibility" value={vis} />
        {sur ? (
          <div className="pop" style={{ border: '1.5px solid #000000', background: '#FFFFFF', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}><span style={{ fontWeight: 700, fontSize: 17 }}>Only the people you invite</span><span style={{ fontSize: 12, lineHeight: 1.35 }}>It stays off your profile, and they can't find it, until you send it.</span></div>
        ) : (
          <Cards label="Visibility" opts={VIS} value={vis} onPick={setVis} />
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
            <span style={{ paddingTop: 10, fontSize: 13, color: '#4A4A4A' }}>{nPicked} {nPicked === 1 ? 'person' : 'people'} can see it. Nobody else will know it exists.</span>
          </div>
        ) : null}
      </Section>

      {state?.error ? <div className="err" style={{ margin: '24px 20px 0' }}>{state.error}</div> : null}
      <div style={{ padding: '28px 16px 36px' }}>
        <button className="btn" disabled={pending} style={{ fontWeight: 700, fontSize: 17, padding: '17px 0' }}>{pending ? 'Making it…' : 'Make it, then add things'}</button>
      </div>
    </form>
  );
}
