'use client';

// a3: the dashed "Add photo" square from Option 13 Covered. A real file input under the button.
import { useState } from 'react';

export function PhotoPick({ name = 'photo', size = 84 }) {
  const [url, setUrl] = useState(null);
  const on = !!url;
  return (
    <label className="a3-photo" style={{ width: size, height: size, flexShrink: 0, border: `1.5px ${on ? 'solid' : 'dashed'} var(--line, #000000)`, background: on ? 'var(--lt, #D8F75A)' : 'transparent', color: 'var(--ink, #000000)', fontWeight: 700, fontSize: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, cursor: 'pointer', overflow: 'hidden', boxSizing: 'border-box' }}>
      {on ? <img src={url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }} /> : null}
      <svg aria-hidden="true" style={{ position: 'relative' }} width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.56" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
      <span style={{ position: 'relative', background: on ? 'var(--lt, #D8F75A)' : 'transparent', padding: on ? '1px 4px' : 0 }}>{on ? 'Photo added' : 'Add photo'}</span>
      <input type="file" name={name} accept="image/*" aria-label="Add a photo (optional)" onChange={(e) => { const f = e.target.files?.[0]; setUrl(f ? URL.createObjectURL(f) : null); }} />
    </label>
  );
}
