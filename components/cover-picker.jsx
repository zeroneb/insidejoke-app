'use client';
// Make a list (Partiful style): a cover is already on it, suggested from the name. Try others in the strip,
// open every cover with ✦ Change cover, upload a photo, or tap the pencil to edit any words on the cover.
import { useEffect, useMemo, useRef, useState } from 'react';
import CoverDesign from '@/components/cover-design';
import { COVERS, suggest, swatch, slotsFor } from '@/lib/cover-designs';
import { saveListDesign } from '@/lib/actions';

const NAVY = '#13286B', MUTE = '#4A4A4A';
const Pencil = () => <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={NAVY} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20l4-1 11-11-3-3L5 16z" /><path d="M14 6l3 3" /></svg>;
const Cam = () => <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>;
const X = () => <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>;
const label = { fontFamily: "'Archivo', sans-serif", fontStretch: '125%', fontWeight: 800, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase' };
const pencilBtn = { position: 'absolute', right: 14, top: 14, width: 44, height: 44, borderRadius: '50%', background: '#FFFFFF', border: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(0,0,0,.15)', cursor: 'pointer', zIndex: 2 };
const changeBtn = { position: 'absolute', right: 14, bottom: 14, display: 'flex', alignItems: 'center', gap: 8, background: '#FFFFFF', color: NAVY, fontFamily: 'inherit', fontWeight: 800, fontSize: 14, padding: '10px 14px', borderRadius: 999, border: 0, cursor: 'pointer', zIndex: 2 };

// Phone photos can be bigger than an upload allows: shrink in the browser first (longest side 1600px, JPEG).
async function shrink(f) {
  if (!f || !/^image\//.test(f.type) || f.size < 900 * 1024) return f;
  try {
    const bmp = await createImageBitmap(f);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.86));
    return blob ? new File([blob], 'cover.jpg', { type: 'image/jpeg' }) : f;
  } catch { return f; }
}

export function Swatches({ k, pal, onPick }) {
  return (
    <div role="radiogroup" aria-label="Colors" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
      {COVERS[k].pals.map((_, i) => {
        const [a, b] = swatch(k, i);
        const on = i === pal;
        return <button key={i} type="button" role="radio" aria-checked={on} aria-label={`Colors ${i + 1}`} onClick={() => onPick(i)} style={{ width: 30, height: 30, borderRadius: '50%', border: 0, padding: 0, cursor: 'pointer', background: `linear-gradient(135deg, ${a} 50%, ${b} 50%)`, boxShadow: on ? `0 0 0 2px #FFFFFF, 0 0 0 4px ${NAVY}` : 'inset 0 0 0 1px rgba(0,0,0,.15)' }} />;
      })}
    </div>
  );
}

function Sheet({ children, onClose, title }) {
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', k);
    const o = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = o; };
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label={title} style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', justifyContent: 'center' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(19,40,107,.35)' }} />
      <div className="a1-sheet" style={{ position: 'absolute', top: 44, bottom: 0, width: '100%', maxWidth: 480, background: '#ECECEF', borderRadius: '24px 24px 0 0', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}><span style={{ width: 40, height: 5, borderRadius: 3, background: '#C4C4CC' }} /></div>
        {children}
      </div>
    </div>
  );
}

const CHIPS = [['For', null], ['All covers', 'all'], ['Birthday', 'birthday'], ['Grad', 'grad'], ['New place', 'new place'], ['Wedding', 'wedding'], ['Baby', 'baby'], ['Holidays', 'holidays']];

// ✦ Change cover: suggested for the name first, every cover, upload.
export function CoverSheet({ title, ctx, flags, current, onPick, onUpload, onClose, all = false }) {
  const [chip, setChip] = useState(all ? 1 : 0);
  // All covers: every cover we have, the name's suggestions first (Surprise only on surprise lists).
  const order = useMemo(() => chip === 1 ? suggest({ ...flags, title }) : suggest(chip === 0 ? { ...flags, title } : { title: CHIPS[chip][1] }), [chip, title, flags]);
  const up = useRef(null);
  return (
    <Sheet title="Change cover" onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 16px 0 8px' }}>
        <button type="button" onClick={onClose} aria-label="Close" className="iconbtn" style={{ border: 0, background: 'transparent' }}><X /></button>
        <button type="button" onClick={() => up.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', fontWeight: 800, fontSize: 16, color: NAVY, border: 0, background: 'transparent', cursor: 'pointer' }}><Cam />Upload</button>
        <input ref={up} type="file" accept="image/*" className="sr" tabIndex={-1} aria-hidden="true" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '12px 16px 0' }}>
        {CHIPS.map(([c], i) => (
          <button key={c} type="button" aria-pressed={chip === i} onClick={() => setChip(i)} style={{ padding: '10px 16px', borderRadius: 999, border: 0, fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer', background: chip === i ? NAVY : '#FFFFFF', color: chip === i ? '#FFFFFF' : '#000000' }}>{i === 0 ? `✦ For “${(title || 'your list').slice(0, 18)}”` : c}</button>
        ))}
      </div>
      <div style={{ margin: '14px 16px 0', display: 'flex', alignItems: 'center', gap: 10, background: '#FFFFFF', borderRadius: 12, padding: '10px 12px', fontSize: 13, lineHeight: 1.35 }}>
        <span aria-hidden="true" style={{ flexShrink: 0, width: 30, height: 30, borderRadius: '50%', background: '#D8F75A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pencil /></span>
        <span>Pick one, then tap the pencil on it to change any words on the cover. The big title is your list name.</span>
      </div>
      <div style={{ padding: '16px 16px 8px', ...label }}>{chip === 0 ? `Suggested for “${(title || 'your list').slice(0, 24)}”` : chip === 1 ? `All covers · ${order.length}` : `${CHIPS[chip][0]} covers`}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 16px 110px' }}>
        {order.map((k) => (
          <button key={k} type="button" onClick={() => onPick(k)} aria-label={`Use ${COVERS[k].label}`} style={{ border: 0, padding: 0, background: 'transparent', cursor: 'pointer', borderRadius: 14, boxShadow: current === k ? `0 0 0 3px ${NAVY}` : 'none' }}>
            <CoverDesign design={{ key: k, pal: 0, s: {} }} title={title} ctx={ctx} fluid radius={14} label={COVERS[k].label} />
          </button>
        ))}
      </div>
      <button type="button" onClick={() => up.current?.click()} style={{ position: 'sticky', bottom: 26, alignSelf: 'center', marginTop: -84, display: 'flex', alignItems: 'center', gap: 10, background: '#FFFFFF', color: '#000000', fontFamily: 'inherit', fontWeight: 800, fontSize: 17, padding: '16px 26px', borderRadius: 14, border: 0, boxShadow: '0 10px 30px rgba(0,0,0,.18)', cursor: 'pointer' }}><Cam />Upload image</button>
    </Sheet>
  );
}

// Pencil → Edit cover: tap any words on the cover to change them; the big title is the list name.
export function CoverEditor({ design, title, ctx, onTitle, onDone, onClose, done = 'Use this cover', pending = false }) {
  const [d, setD] = useState(design);
  const [t, setT] = useState(title || '');
  const c = COVERS[d.key];
  const slotNames = Object.keys(c.slots);
  const [sel, setSel] = useState('title');
  const [ring, setRing] = useState(null);
  const wrap = useRef(null);
  const input = useRef(null);
  const values = slotsFor(d, t);
  const max = sel === 'title' ? (c.maxTitle || 40) : c.slots[sel]?.[2] || 40;
  const val = sel === 'title' ? t : (d.s?.[sel] ?? values[sel] ?? '');
  const setVal = (v) => {
    v = v.slice(0, max);
    if (sel === 'title') setT(v);
    else setD((x) => ({ ...x, s: { ...x.s, [sel]: v } }));
  };
  // Outline the selected words on the cover.
  useEffect(() => {
    const el = wrap.current?.querySelector(`[data-slot="${sel}"]`);
    if (!el || !wrap.current) { setRing(null); return; }
    const a = wrap.current.getBoundingClientRect(), b = el.getBoundingClientRect();
    setRing({ left: b.left - a.left - 6, top: b.top - a.top - 6, width: b.width + 12, height: b.height + 12 });
  }, [sel, d, t]);
  const tap = (e) => {
    const el = e.target.closest?.('[data-slot]');
    const name = el?.getAttribute('data-slot');
    if (name && (name === 'title' || slotNames.includes(name))) { setSel(name); setTimeout(() => input.current?.focus(), 0); }
  };
  const names = { title: 'List name', ...Object.fromEntries(Object.entries(c.slots).map(([n, [l]]) => [n, l])) };
  return (
    <Sheet title="Edit cover" onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 20px 0 8px' }}>
        <button type="button" onClick={onClose} aria-label="Back" className="iconbtn" style={{ border: 0, background: 'transparent' }}><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></button>
        <span style={{ fontWeight: 800, fontSize: 16 }}>Edit cover</span>
        <span style={{ width: 44 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
        <div ref={wrap} onClick={tap} style={{ position: 'relative', cursor: 'pointer', width: 'min(336px, calc(100vw - 54px))' }}>
          <CoverDesign design={d} title={t || 'Wishes'} ctx={ctx} fluid radius={20} />
          {ring ? <div aria-hidden="true" style={{ position: 'absolute', ...ring, border: `2.5px solid ${NAVY}`, borderRadius: 10, pointerEvents: 'none', boxShadow: '0 0 0 2px rgba(255,255,255,.7)' }} /> : null}
        </div>
      </div>
      <section style={{ padding: '16px 20px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {slotNames.length ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {['title', ...slotNames].map((n) => <button key={n} type="button" aria-pressed={sel === n} onClick={() => setSel(n)} style={{ border: `1.5px solid ${NAVY}`, background: sel === n ? NAVY : 'transparent', color: sel === n ? '#FFFFFF' : NAVY, fontFamily: 'inherit', fontWeight: 700, fontSize: 13, padding: '6px 12px', borderRadius: 999, cursor: 'pointer' }}>{names[n]}</button>)}
          </div>
        ) : null}
        <label htmlFor="cv-slot" className="sr">{names[sel]}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input ref={input} id="cv-slot" value={val} onChange={(e) => setVal(e.target.value)} maxLength={max} dir="auto" style={{ flexGrow: 1, minWidth: 0, background: '#FFFFFF', border: 0, borderRadius: 999, padding: '12px 18px', fontFamily: 'inherit', fontSize: 16, boxShadow: `0 0 0 2px ${NAVY}`, outline: 'none' }} />
          <span style={{ fontSize: 13, color: MUTE, flexShrink: 0 }}>{val.length}/{max}</span>
        </div>
        {d.key === 'photo' ? (
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontWeight: 700, fontSize: 14 }}>Move photo
            <input type="range" min="0" max="100" value={+(d.s?.y ?? 50)} onChange={(e) => setD((x) => ({ ...x, s: { ...x.s, y: e.target.value } }))} style={{ flexGrow: 1 }} />
          </label>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontWeight: 700, fontSize: 14 }}>Colors</span><Swatches k={d.key} pal={d.pal} onPick={(i) => setD((x) => ({ ...x, pal: i }))} /></div>
        )}
        <span style={{ fontSize: 13, lineHeight: 1.4, color: MUTE }}>{d.key === 'treat' ? 'On a Treat list you can change the name and colors. TREAT TREAT TREAT and the Public / Private label stay put.' : 'Tap any words on the cover to change them. The big title is your list name.'}</span>
      </section>
      <div style={{ flexGrow: 1, minHeight: 20 }} />
      <div style={{ padding: '0 16px 28px' }}>
        <button type="button" disabled={pending} onClick={() => onDone(d, t.trim() || title)} style={{ display: 'block', width: '100%', textAlign: 'center', background: NAVY, color: '#FFFFFF', fontFamily: 'inherit', fontWeight: 800, fontSize: 17, padding: '17px 0', borderRadius: 999, border: 0, cursor: 'pointer' }}>{pending ? 'Saving…' : done}</button>
      </div>
    </Sheet>
  );
}

// The new-list form's cover: big cover with pencil and ✦ Change cover, then covers to try for this name.
// Posts `design` (JSON) and, for a photo cover, `coverPhoto`.
export function CoverField({ title, onTitle, treat, flags, ctx }) {
  const order = useMemo(() => suggest({ ...flags, title }), [flags, title]);
  const [design, setDesign] = useState(null); // null = follow the top suggestion until they pick
  const [photoUrl, setPhotoUrl] = useState(null);
  const [sheet, setSheet] = useState(false);
  const [edit, setEdit] = useState(false);
  const file = useRef(null);
  const up = useRef(null);
  const auto = { key: order[0], pal: 0, s: {} };
  const cur = treat ? { key: 'treat', pal: design?.key === 'treat' ? design.pal : 0, s: {} } : design && design.key !== 'treat' ? design : auto;
  const fullCtx = { ...ctx, photo: photoUrl };
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);
  const upload = async (f0) => {
    const f = await shrink(f0);
    if (f.size >= 4 * 1024 * 1024) { alert('That photo is too big. Try another one.'); return; }
    const dt = new DataTransfer(); dt.items.add(f);
    if (file.current) file.current.files = dt.files;
    setPhotoUrl(URL.createObjectURL(f));
    setDesign({ key: 'photo', pal: 0, s: { y: '50' } });
    setSheet(false);
  };
  const strip = (photoUrl ? ['photo'] : []).concat(order.slice(0, 4));
  const cell = { width: 86, height: 106, flexShrink: 0, borderRadius: 10 };
  return (
    <>
      <input type="hidden" name="design" value={JSON.stringify(cur)} />
      <input ref={file} type="file" name="coverPhoto" accept="image/*" className="sr" tabIndex={-1} aria-hidden="true" />
      <div style={{ position: 'relative', marginTop: 14 }}>
        <CoverDesign design={cur} title={title || 'Wishes'} ctx={fullCtx} fluid />
        <button type="button" aria-label="Edit cover" onClick={() => setEdit(true)} style={pencilBtn}><Pencil /></button>
        {!treat ? <button type="button" onClick={() => setSheet(true)} style={changeBtn}>✦ Change cover</button> : null}
      </div>
      {!treat ? (
        <section style={{ padding: '16px 0 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ padding: '0 20px', ...label }}>Covers for “{(title || 'your list').slice(0, 24)}” · tap to try</div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 20px 6px' }}>
            {strip.map((k) => (
              <button key={k} type="button" onClick={() => setDesign(k === 'photo' ? { key: 'photo', pal: 0, s: { y: design?.s?.y || '50' } } : { key: k, pal: 0, s: {} })} aria-label={`Use ${COVERS[k].label}`} aria-pressed={cur.key === k} style={{ ...cell, border: 0, padding: 0, cursor: 'pointer', overflow: 'hidden', boxShadow: cur.key === k ? `0 0 0 3px ${NAVY}` : 'none', margin: 3 }}>
                <CoverDesign design={{ key: k, pal: 0, s: k === 'photo' ? { y: design?.s?.y } : {} }} title={title || 'Wishes'} ctx={fullCtx} width={86} radius={10} />
              </button>
            ))}
            <button type="button" onClick={() => setSheet('all')} style={{ ...cell, margin: 3, border: 0, background: '#FFFFFF', color: NAVY, fontFamily: 'inherit', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>More</button>
            <button type="button" onClick={() => up.current?.click()} style={{ ...cell, margin: 3, border: '2px dashed #A9A9B3', background: 'transparent', color: NAVY, fontFamily: 'inherit', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}><Cam />Upload</button>
            <input ref={up} type="file" accept="image/*" className="sr" tabIndex={-1} aria-hidden="true" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} />
          </div>
        </section>
      ) : null}
      {sheet ? <CoverSheet all={sheet === 'all'} title={title} ctx={fullCtx} flags={flags} current={cur.key} onClose={() => setSheet(false)} onUpload={upload} onPick={(k) => { setDesign({ key: k, pal: 0, s: {} }); setSheet(false); }} /> : null}
      {edit ? <CoverEditor design={cur} title={title} ctx={fullCtx} onClose={() => setEdit(false)} onDone={(d, t) => { setDesign(d); onTitle?.(t); setEdit(false); }} /> : null}
    </>
  );
}

// List page (owner and collaborators): the cover with a pencil (Edit cover) and ✦ Change cover. Saves right away.
export function ListCover({ slug, design: saved, title, ctx, treat }) {
  const [design, setDesign] = useState(saved);
  const [committed, setCommitted] = useState(saved);
  const [name, setName] = useState(title);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [sheet, setSheet] = useState(false);
  const [edit, setEdit] = useState(false);
  const [pending, setPending] = useState(false);
  const fullCtx = { ...ctx, photo: photoUrl || ctx.photo };
  const save = async (d, t, f = photoFile) => {
    setPending(true);
    const fd = new FormData();
    fd.set('slug', slug); fd.set('design', JSON.stringify(d)); fd.set('title', t);
    if (f && d.key === 'photo') fd.set('coverPhoto', f);
    const r = await saveListDesign(null, fd);
    setPending(false);
    if (r?.error) { alert(r.error); return false; }
    setDesign(d); setCommitted(d); setName(t); setPhotoFile(null);
    return true;
  };
  const upload = async (f0) => {
    const f = await shrink(f0);
    if (f.size >= 4 * 1024 * 1024) { alert('That photo is too big. Try another one.'); return; }
    setPhotoFile(f); setPhotoUrl(URL.createObjectURL(f));
    setSheet(false);
    setDesign({ key: 'photo', pal: 0, s: { y: '50' } });
    setEdit(true);
  };
  return (
    <div style={{ position: 'relative' }}>
      <CoverDesign design={design} title={name} ctx={fullCtx} fluid />
      <button type="button" aria-label="Edit cover" onClick={() => setEdit(true)} style={pencilBtn}><Pencil /></button>
      {!treat ? <button type="button" onClick={() => setSheet(true)} style={changeBtn}>✦ Change cover</button> : null}
      {sheet ? <CoverSheet title={name} ctx={fullCtx} flags={{}} current={design.key} onClose={() => setSheet(false)} onUpload={upload} onPick={(k) => { setSheet(false); save({ key: k, pal: 0, s: {} }, name, null); }} /> : null}
      {edit ? <CoverEditor design={design} title={name} ctx={fullCtx} done="Save cover" pending={pending} onClose={() => { setEdit(false); setDesign(committed); setPhotoFile(null); }} onDone={async (d, t) => { if (await save(d, t)) setEdit(false); }} /> : null}
    </div>
  );
}
