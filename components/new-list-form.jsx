'use client';

import { useActionState } from 'react';
import { createList } from '@/lib/actions';
import { Blob } from '@/components/ui';

const OCC = ['Birthday', 'Holidays', 'Just because', 'New place', "Dinner I'm hosting", 'Secret Santa'];

export default function NewListForm() {
  const [state, action, pending] = useActionState(createList, null);
  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column' }}>
      <section style={{ position: 'relative', height: 250, margin: '6px 16px 0', background: '#13286B', overflow: 'hidden' }}>
        <Blob seed={22} width={300} height={206} style={{ left: 30, top: 22 }} />
        <label htmlFor="title" style={{ position: 'absolute', left: 0, top: 18, width: '100%', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>Name your list</label>
        <input id="title" name="title" defaultValue="For my birthday" className="serif" style={{ position: 'absolute', left: 50, top: 92, width: 'calc(100% - 100px)', border: 0, borderBottom: '1.5px solid #13286B', background: 'transparent', textAlign: 'center', fontSize: 40, color: '#000', padding: '4px 0', outline: 'none' }} />
        <span style={{ position: 'absolute', left: 0, bottom: 16, width: '100%', textAlign: 'center', fontSize: 12, color: '#fff' }}>Tap to rename anytime</span>
      </section>

      <section className="sec">
        <h2 className="wide seclbl">Who's it for</h2>
        <div role="radiogroup" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <label className="choice"><input type="radio" name="forWho" id="forMe" value="me" defaultChecked /><span style={{ fontWeight: 700, fontSize: 17 }}>Me</span><span style={{ fontSize: 12, lineHeight: 1.35 }}>A list for you</span></label>
          <label className="choice"><input type="radio" name="forWho" id="forOther" value="other" /><span style={{ fontWeight: 700, fontSize: 17 }}>Someone else</span><span style={{ fontSize: 12, lineHeight: 1.35 }}>Mom, a friend, your kid</span></label>
        </div>
        <div className="reveal if-other pop" style={{ flexDirection: 'column', gap: 8, background: '#D8F75A', padding: 14 }}>
          <label htmlFor="recipient" style={{ fontSize: 17, fontWeight: 700 }}>Who is it for? Write their name.</label>
          <input id="recipient" name="recipient" className="input serif" style={{ fontSize: 22 }} placeholder="Their name, like Mom or Leila" />
          <span style={{ fontSize: 13, lineHeight: 1.4 }}>Their name goes on the list, like "For Mom." You'll add their number when you hand it off.</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingTop: 10, borderTop: '1.5px solid #000' }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontWeight: 700, fontSize: 16 }}>Keep it a surprise?</span><span style={{ fontSize: 13 }}>They won't see it until you send it.</span></span>
            <label className="switch" aria-label="Keep it a surprise"><input type="checkbox" id="surprise" name="surprise" /><span /></label>
          </div>
        </div>
      </section>

      <section className="sec">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><h2 className="wide seclbl">Occasion</h2><span className="muted" style={{ fontSize: 12 }}>Optional</span></div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {OCC.map((o) => (
            <label key={o} className="pill chip"><input type="radio" name="occasion" value={o} defaultChecked={o === 'Birthday'} />{o}</label>
          ))}
          <label className="pill chip" style={{ borderStyle: 'dashed', padding: '4px 4px 4px 14px', gap: 6 }}>
            <input type="radio" name="occasion" value="" aria-label="Your own occasion" id="occCustom" />
            <span aria-hidden="true" style={{ fontWeight: 700 }}>+</span>
            <input placeholder="Add your own" onChange={(e) => { const r = document.getElementById('occCustom'); r.value = e.target.value; if (e.target.value) r.checked = true; }} style={{ width: 120, border: 0, background: 'transparent', font: 'inherit', fontSize: 14, outline: 'none' }} />
          </label>
        </div>
      </section>

      <section className="sec">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <h2 className="wide seclbl if-not-surprise">Add a date</h2>
            <h2 className="wide seclbl reveal if-surprise">Send it on</h2>
            <span className="muted if-not-surprise" style={{ fontSize: 12 }}>Optional</span>
            <span className="muted reveal if-surprise" style={{ fontSize: 12 }}>The reveal</span>
          </div>
          <label className="switch if-not-surprise" aria-label="Add a date"><input type="checkbox" id="hasDate" name="hasDate" /><span /></label>
        </div>
        <div className="reveal if-date pop" style={{ flexDirection: 'column', gap: 8 }}>
          <label htmlFor="date" className="sr">Date</label>
          <input id="date" name="date" type="date" className="input dot" style={{ fontSize: 18 }} />
          <span className="if-not-surprise" style={{ fontSize: 13, lineHeight: 1.4 }}>Reminders go to everyone you share it with: a week after sharing and 2 hours before. The list stays open after.</span>
        </div>
        <div className="reveal if-surprise pop" style={{ flexDirection: 'column', gap: 8 }}>
          <label htmlFor="sdate" className="sr">Send on</label>
          <input id="sdate" name="date" type="date" className="input dot" style={{ fontSize: 18 }} />
          <span style={{ fontSize: 13, lineHeight: 1.4 }}>It goes out at midnight their time. Reminders go to everyone helping: about 3 days before, and a last call the day before. Never to them.</span>
        </div>
        <span className="muted if-not-surprise" style={{ fontSize: 13 }}>No date: one reminder goes out a week after you share it.</span>
      </section>

      <section className="sec">
        <h2 className="wide seclbl">Who can see it</h2>
        <div className="reveal if-surprise" style={{ border: '1.5px solid #000', background: '#fff', padding: '14px 12px', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontWeight: 700, fontSize: 17 }}>Only the people you invite</span>
          <span style={{ fontSize: 12, lineHeight: 1.35 }}>It stays off your profile, and they can't find it, until you send it.</span>
        </div>
        <div role="radiogroup" className="if-not-surprise" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <label className="choice"><input type="radio" name="visibility" id="vpublic" value="public" defaultChecked /><span style={{ fontWeight: 700, fontSize: 17 }}>Public</span><span style={{ fontSize: 12, lineHeight: 1.35 }}>On your profile. Anyone you share it with, or who finds it, can give.</span></label>
          <label className="choice"><input type="radio" name="visibility" id="vprivate" value="private" /><span style={{ fontWeight: 700, fontSize: 17 }}>Private</span><span style={{ fontSize: 12, lineHeight: 1.35 }}>Only the people you pick</span></label>
        </div>
        <span className="reveal if-private muted" style={{ fontSize: 13 }}>You pick who sees it when you share. Nobody else will know it exists.</span>
      </section>

      {state?.error ? <div className="err" style={{ margin: '20px 20px 0' }}>{state.error}</div> : null}
      <div style={{ padding: '28px 16px 36px' }}>
        <button className="btn" disabled={pending}>{pending ? 'Making it…' : 'Make it, then add things'}</button>
      </div>
    </form>
  );
}
