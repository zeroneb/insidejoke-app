'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { setListCover } from '@/lib/actions';

const Camera = ({ color = '#000000', size = 20 }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.6" /></svg>
);

// Phone photos can be bigger than an upload allows, so shrink them in the browser first
// (longest side 1600px, JPEG) and swap the smaller file into the input.
async function shrinkInto(input) {
  const f = input?.files?.[0];
  if (!f || !/^image\//.test(f.type) || f.size < 900 * 1024) return f;
  try {
    const bmp = await createImageBitmap(f);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.86));
    if (!blob) return f;
    const small = new File([blob], (f.name || 'cover').replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
    const dt = new DataTransfer(); dt.items.add(small); input.files = dt.files;
    return small;
  } catch { return f; }
}

// New list form: an optional cover photo, previewed in the cover's own shape.
export function CoverPhotoField({ shape = 'circle' }) {
  const input = useRef(null);
  const [preview, setPreview] = useState(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const pick = async (e) => {
    const f = await shrinkInto(e.target);
    if (!f) return;
    if (f.size >= 4 * 1024 * 1024) { alert('That photo is too big. Try another one.'); e.target.value = ''; return; }
    setPreview(URL.createObjectURL(f));
  };
  const clear = () => { if (input.current) input.current.value = ''; setPreview(null); };
  const frame = shape === 'diamond'
    ? { width: 46, height: 46, transform: 'rotate(45deg)', margin: 8 }
    : { width: 60, height: 60, borderRadius: '50%' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <input ref={input} id="coverphoto" name="coverPhoto" type="file" accept="image/*" onChange={pick} className="sr" />
      <span aria-hidden="true" style={{ ...frame, flexShrink: 0, overflow: 'hidden', border: '1.5px solid var(--line, #000000)', background: 'var(--surface, #FFFFFF)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {preview
          ? <img src={preview} alt="" style={shape === 'diamond' ? { position: 'absolute', left: '-21%', top: '-21%', width: '142%', height: '142%', objectFit: 'cover', transform: 'rotate(-45deg)' } : { width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={shape === 'diamond' ? { transform: 'rotate(-45deg)', display: 'flex' } : { display: 'flex' }}><Camera /></span>}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label htmlFor="coverphoto" style={{ fontWeight: 700, fontSize: 15, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>{preview ? 'Change photo' : 'Add a cover photo'}</label>
        {preview
          ? <button type="button" onClick={clear} style={{ border: 0, background: 'transparent', padding: 0, fontFamily: 'inherit', fontSize: 13, textAlign: 'left', cursor: 'pointer', color: 'var(--muted, #4A4A4A)' }}>Back to art</button>
          : <span style={{ fontSize: 13, color: 'var(--muted, #4A4A4A)' }}>It sits inside the {shape === 'diamond' ? 'diamond' : 'circle'} on your cover.</span>}
      </span>
    </div>
  );
}

// List page: a camera button on the cover to add, change or remove the photo.
export function ChangeCover({ slug, hasPhoto, color = '#000000' }) {
  const [state, action, pending] = useActionState(setListCover, null);
  const form = useRef(null);
  const file = useRef(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { if (state?.ok) setOpen(false); if (state?.error) alert(state.error); }, [state]);
  const choose = () => { setOpen(false); file.current?.click(); };
  const onFile = async (e) => {
    const f = await shrinkInto(e.target);
    if (!f) return;
    if (f.size >= 4 * 1024 * 1024) { alert('That photo is too big. Try another one.'); e.target.value = ''; return; }
    form.current?.requestSubmit();
  };
  return (
    <div style={{ position: 'relative' }}>
      <form ref={form} action={action}>
        <input type="hidden" name="slug" value={slug} />
        <input ref={file} type="file" name="coverPhoto" accept="image/*" onChange={onFile} className="sr" tabIndex={-1} aria-hidden="true" />
      </form>
      <button type="button" className="iconbtn" disabled={pending} aria-label={hasPhoto ? 'Cover photo options' : 'Add a cover photo'} aria-expanded={hasPhoto ? open : undefined}
        onClick={() => (hasPhoto ? setOpen((o) => !o) : choose())} style={{ opacity: pending ? 0.5 : 1 }}>
        <Camera color={color} size={21} />
      </button>
      {open ? (
        <div className="pop" role="menu" style={{ position: 'absolute', right: 0, top: 46, zIndex: 5, background: 'var(--surface, #FFFFFF)', border: '1.5px solid var(--line, #000000)', display: 'flex', flexDirection: 'column', minWidth: 170 }}>
          <button type="button" role="menuitem" onClick={choose} style={{ border: 0, borderBottom: '1.5px solid var(--line, #000000)', background: 'transparent', fontFamily: 'inherit', fontWeight: 700, fontSize: 15, padding: '12px 14px', textAlign: 'left', cursor: 'pointer', color: 'var(--ink, #000000)' }}>Change photo</button>
          <form action={action}>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="remove" value="1" />
            <button role="menuitem" style={{ width: '100%', border: 0, background: 'transparent', fontFamily: 'inherit', fontWeight: 700, fontSize: 15, padding: '12px 14px', textAlign: 'left', cursor: 'pointer', color: 'var(--ink, #000000)' }}>Back to art</button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
