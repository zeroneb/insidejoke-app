'use client';

import { useActionState, useState } from 'react';
import { updateProfile } from '@/lib/actions';
import { startPhoneChange, confirmPhoneChange } from '@/lib/actions-a1';
import { PhotoBlob } from '@/components/ui';
import CodeBoxes from '@/components/code-boxes';

const SWATCHES = ['#B36EE0', '#F0895A', '#E8642C', '#E3C552', '#D8F75A', '#93EC75', '#5FC3D9', '#A9CDF5', '#AAB4EC', '#F4D3EE', '#C8743A'];

// a1: Settings, profile section (photo + name + bio) from Option 13 Settings.
export function ProfileForm({ me }) {
  const [state, act, pending] = useActionState(updateProfile, null);
  const [preview, setPreview] = useState(null);
  const [remove, setRemove] = useState(false);
  const [color, setColor] = useState(me.color || '#B36EE0');
  const shown = { ...me, color, photo: remove ? null : preview || me.photo };
  return (
    <form action={act} style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--lt, #D4FA4F)', padding: '14px 16px', margin: '0 -20px' }}>
        <PhotoBlob user={shown} owner size={56} pad={6} uid="setme" fontSize={28} />
        <span className="a1-lab" style={{ flexGrow: 1 }}>
          <span className="a1-t">Photo</span>
          <span className="a1-s" style={{ color: 'var(--navy-ink, #13286B)' }}>{remove ? 'Removed when you save.' : preview ? 'Looks good? Save profile.' : 'Shown washed in your color, below.'}</span>
          {(me.photo || preview) && !remove ? <button type="button" onClick={() => { setRemove(true); setPreview(null); }} style={{ alignSelf: 'flex-start', border: 0, background: 'transparent', padding: '4px 0', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, color: 'var(--navy-ink, #13286B)', cursor: 'pointer' }}>Remove photo</button> : null}
        </span>
        <label className="a1-ghost" style={{ position: 'relative' }}>
          Change
          <input type="file" name="photo" accept="image/*" aria-label="Change photo" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) { setPreview(URL.createObjectURL(f)); setRemove(false); } }} />
        </label>
      </div>
      {remove ? <input type="hidden" name="removePhoto" value="1" /> : null}
      {shown.photo ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 16 }}>
          <span className="a1-cap" style={{ fontSize: 10 }}>Photo color</span>
          <input type="hidden" name="color" value={color} />
          <div role="radiogroup" aria-label="Photo color" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {SWATCHES.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={`Color ${c}`} onClick={() => setColor(c)}
                style={{ width: 36, height: 36, borderRadius: '50%', background: c, border: color === c ? '3px solid var(--edge, #000000)' : '1.5px solid rgba(0,0,0,.25)', boxShadow: color === c ? 'inset 0 0 0 3px #FFFFFF' : 'none', cursor: 'pointer', padding: 0 }} />
            ))}
          </div>
          <span className="a1-s">Friends see your photo washed in this color.</span>
        </div>
      ) : null}
      <label className="a1-field" style={{ borderTop: 0, paddingTop: 18 }}><span className="a1-cap" style={{ fontSize: 10 }}>Name</span><input type="text" name="name" defaultValue={me.name} autoComplete="name" maxLength={60} required /></label>
      <label className="a1-field"><span className="a1-cap" style={{ fontSize: 10 }}>Your link</span><span style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}><span style={{ color: 'var(--muted, #4A4A4A)', flexShrink: 0 }}>insidejoke.club/</span><input type="text" name="handle" defaultValue={me.handle || ''} maxLength={30} autoCapitalize="none" autoCorrect="off" spellCheck={false} style={{ flexGrow: 1, minWidth: 0 }} /></span><span className="a1-s">Letters, numbers, dots and underscores. Share it so friends find your lists.</span></label>
      <label className="a1-field"><span className="a1-cap" style={{ fontSize: 10 }}>Bio · one line</span><input type="text" name="bio" defaultValue={me.bio || ''} maxLength={60} placeholder="ceramics, natural wine, long walks" /><span className="a1-s">Friends see this under your name.</span></label>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, paddingTop: 4, borderTop: '1px solid var(--line, #000000)' }}>
        {state?.error ? <span className="a1-s" style={{ color: '#E2452B', fontWeight: 700, marginTop: 12 }}>{state.error}</span> : state?.ok && !pending ? <span role="status" className="a1-s" style={{ marginTop: 12 }}>Saved.</span> : null}
        <button className="a1-ghost" style={{ marginTop: 12 }} disabled={pending}>{pending ? 'Saving…' : 'Save profile'}</button>
      </div>
    </form>
  );
}

// a1: change number. The code goes to the NEW number; nothing switches until it is confirmed.
export function PhoneChange({ shown }) {
  const [open, setOpen] = useState(false);
  const [s1, act1, p1] = useActionState(startPhoneChange, null);
  const [s2, act2, p2] = useActionState(confirmPhoneChange, null);
  const codeStep = s1?.step === 'code';
  return (
    <>
      <div className="a1-row">
        <span className="a1-lab"><span className="dot" style={{ fontSize: 20, letterSpacing: '0.04em' }}>{shown}</span><span className="a1-s">Your login. Friends never see it.</span></span>
        <button type="button" className="a1-ghost" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Cancel' : 'Change'}</button>
      </div>
      {open && !codeStep ? (
        <form action={act1} className="a1up" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 0', borderTop: '1px solid var(--line, #000000)' }}>
          <label htmlFor="newphone" className="a1-cap" style={{ fontSize: 10 }}>New number</label>
          <span style={{ display: 'flex', height: 56, border: '1.5px solid var(--line, #000000)', background: 'var(--surface, #FFFFFF)', boxSizing: 'border-box' }}>
            <span className="dot" style={{ display: 'flex', alignItems: 'center', padding: '0 14px', borderRight: '1.5px solid var(--line, #000000)', fontSize: 20 }}>+1</span>
            <input id="newphone" name="phone" inputMode="tel" autoComplete="tel" placeholder="(917) 555-0123" required autoFocus style={{ flexGrow: 1, minWidth: 0, border: 0, background: 'transparent', fontFamily: "'Doto', monospace", fontWeight: 900, fontSize: 22, padding: '0 16px', color: 'var(--ink, #000)', outline: 'none' }} />
          </span>
          {s1?.error ? <div className="err">{s1.error}</div> : null}
          <button className="a1-ghost" style={{ alignSelf: 'flex-end', background: 'var(--inv-bg, #000)', color: 'var(--inv-fg, #fff)', borderColor: 'var(--inv-bg, #000)' }} disabled={p1}>{p1 ? 'Sending…' : 'Text a code to it'}</button>
        </form>
      ) : null}
      {open && codeStep ? (
        <form action={act2} className="a1up" style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0', borderTop: '1px solid var(--line, #000000)' }}>
          <input type="hidden" name="phone" value={s1.phone} />
          <span className="a1-s">Type the 6 digits we texted to the new number.</span>
          <CodeBoxes />
          {s2?.error ? <div className="err">{s2.error}</div> : null}
          {s1.testCode ? <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}><span style={{ background: 'var(--lt, #D4FA4F)', padding: '3px 8px' }}><span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em' }}>Test mode:</span> your code is <span className="dot" style={{ fontSize: 17 }}>{s1.testCode}</span></span></p> : null}
          <button className="a1-ghost" style={{ alignSelf: 'flex-end', background: 'var(--inv-bg, #000)', color: 'var(--inv-fg, #fff)', borderColor: 'var(--inv-bg, #000)' }} disabled={p2}>{p2 ? 'Checking…' : 'Switch my number'}</button>
        </form>
      ) : null}
    </>
  );
}
