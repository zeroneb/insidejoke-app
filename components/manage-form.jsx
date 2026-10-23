'use client';
// a2: list settings (from the Option 10 Manage board): rename, visibility, date.

import { useActionState, useState } from 'react';
import { saveListSettings } from '@/lib/actions-a2';

const pill = (on) => ({ border: `1.5px solid ${on ? '#E2452B' : '#000000'}`, background: on ? '#F4D3EE' : 'transparent', color: on ? '#E2452B' : '#000000', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, minHeight: 44, padding: '0 18px', borderRadius: 999, cursor: 'pointer' });
const LBL = { fontWeight: 800, fontSize: 14 };

export default function ManageForm({ slug, title, visibility, date, surprise, ring = '', ringDefault = '', treats = false, canTreat = false }) {
  const [state, action, pending] = useActionState(saveListSettings, null);
  const [t, setT] = useState(title);
  const [vis, setVis] = useState(visibility);
  const [d, setD] = useState(date || '');
  const [r, setR] = useState(ring || '');
  const [tr, setTr] = useState(!!treats);
  const dirty = t !== title || vis !== visibility || d !== (date || '') || r !== (ring || '') || tr !== !!treats;
  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="visibility" value={vis} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="mtitle" style={LBL}>Name</label>
        <input id="mtitle" name="title" value={t} onChange={(e) => setT(e.target.value)} className="a2-input serif" style={{ fontSize: 22 }} />
      </div>
      {canTreat ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={LBL}>What goes on it</span>
          <input type="hidden" name="treats" value={tr ? '1' : '0'} />
          <div role="radiogroup" aria-label="What goes on it" style={{ display: 'flex', gap: 8 }}>
            {[[false, 'Wishes'], [true, 'Unlimited']].map(([k, l]) => <button key={l} type="button" role="radio" aria-checked={tr === k} onClick={() => setTr(k)} style={pill(tr === k)}>{l}</button>)}
          </div>
          <span style={{ fontSize: 13, lineHeight: 1.45, color: '#4A4A4A' }}>Unlimited lists get the treats cover: things friends can give again and again.</span>
        </div>
      ) : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="mring" style={LBL}>Circle text <span style={{ fontWeight: 400, color: '#4A4A4A' }}>optional</span></label>
        <input id="mring" name="ring" value={r} maxLength={70} onChange={(e) => setR(e.target.value)} placeholder={ringDefault} className="a2-input serif" style={{ fontSize: 18 }} />
        <span style={{ fontSize: 13, lineHeight: 1.45, color: '#4A4A4A' }}>The words that spin around the top of your list. Leave it empty for the default.</span>
      </div>
      {!surprise ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={LBL}>Who can see it</span>
          <div role="radiogroup" aria-label="Visibility" style={{ display: 'flex', gap: 8 }}>
            {[['public', 'Public'], ['private', 'Private']].map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={vis === k} onClick={() => setVis(k)} style={pill(vis === k)}>{l}</button>)}
          </div>
          <span style={{ fontSize: 13, lineHeight: 1.45, color: '#4A4A4A' }}>{vis === 'public' ? 'On your profile. Anyone you share it with, or who finds it, can give.' : 'Only the people you share it with. Nobody else knows it exists.'}</span>
        </div>
      ) : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor="mdate" style={LBL}>{surprise ? 'Send it on' : 'Date'} {!surprise ? <span style={{ fontWeight: 400, color: '#4A4A4A' }}>optional</span> : null}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input id="mdate" name="date" type="date" value={d} onChange={(e) => setD(e.target.value)} className="a2-input" style={{ fontFamily: "'Doto', monospace", fontWeight: 900, fontSize: 18, flexGrow: 1, minWidth: 0 }} />
          {d && !surprise ? <button type="button" onClick={() => setD('')} style={{ flexShrink: 0, border: '1.5px solid #000', background: 'transparent', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, padding: '0 14px', borderRadius: 999, cursor: 'pointer', color: '#000' }}>No date</button> : null}
        </div>
        <span style={{ fontSize: 13, lineHeight: 1.45, color: '#4A4A4A' }}>{surprise ? 'It goes out at midnight their time.' : d ? 'Reminders go out a week after sharing and 2 hours before.' : 'No date: one reminder goes out a week after you share it.'}</span>
      </div>
      {state?.error ? <div className="err">{state.error}</div> : null}
      {dirty ? (
        <button className="btn" disabled={pending} style={{ height: 54, padding: 0 }}>{pending ? 'Saving…' : 'Save changes'}</button>
      ) : (
        <a href={`/l/${slug}`} className="btn" style={{ height: 54, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>Done</a>
      )}
    </form>
  );
}
