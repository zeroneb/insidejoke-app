'use client';

import { useActionState, useEffect, useState } from 'react';
import { addItem, updateItem, previewLink } from '@/lib/actions';
import { removeItemAndReturn as removeAndBack } from '@/lib/actions-a2';
import { Blob, Halftone, ItemSketch } from '@/components/ui';

// Shared by Add item and Edit item (Option 13 boards). `item` present = edit mode.
const LBL = { fontWeight: 800, fontSize: 14 };
const camera = <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="1.73" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3" /></svg>;
const hostOf = (u) => { try { return new URL(/^https?:/i.test(u) ? u : 'https://' + u).hostname.replace(/^www\./, ''); } catch { return ''; } };

export function Fields({ v, set, treat, n }) {
  return (
    <section style={{ padding: '18px 20px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><label htmlFor="name" style={LBL}>Exact name</label><input id="name" name="name" className="a2-input" value={v.name} onChange={(e) => set({ name: e.target.value })} placeholder="Brand, model, color, size" /></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><label htmlFor="price" style={LBL}>{treat || n > 1 ? 'Price each' : 'About'}</label><input id="price" name="price" className="a2-input dot" value={v.price} onChange={(e) => set({ price: e.target.value })} placeholder="$" inputMode="decimal" /></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><label htmlFor="where" style={LBL}>Where</label><input id="where" name="store" className="a2-input" value={v.store} onChange={(e) => set({ store: e.target.value })} placeholder="Store or place" /></div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><label htmlFor="note" style={LBL}>Note for friends</label><input id="note" name="note" className="a2-input" value={v.note} onChange={(e) => set({ note: e.target.value })} placeholder="The black ones, not the brown" /></div>
    </section>
  );
}

export function Qty({ n, setN, treat, setTreat }) {
  const help = treat ? 'Unlimited makes it a treat. Friends can give it again and again, and you see a running count.' : n === 1 ? 'Just one. Tap + or type a number if you want more of the same thing.' : `One listing for ${n}. Friends see it as one item and fill it toward the total.`;
  const step = { width: 48, height: 48, border: 0, background: 'transparent', fontFamily: 'inherit', fontSize: 22, cursor: 'pointer', color: 'var(--ink, #000)' };
  // The number can be typed too: digits only, kept between 1 and 99 (empty while typing is fine until they leave the field).
  const [typed, setTyped] = useState(null);
  const type = (v) => { const d = v.replace(/\D/g, '').slice(0, 2); setTyped(d); setTreat(false); if (d) setN(Math.max(1, Math.min(99, +d))); };
  return (
    <section style={{ padding: '18px 20px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span id="qtylabel" style={LBL}>How many?</span>
      <input type="hidden" name="quantity" value={n} />
      {treat ? <input type="hidden" name="unlimited" value="1" /> : null}
      <div role="group" aria-labelledby="qtylabel" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div className={treat ? 'qty-off' : undefined} style={{ display: 'flex', alignItems: 'center', border: '2px solid var(--edge, #000000)', background: treat ? 'var(--surface2, #D7D7DC)' : 'var(--surface, #FFFFFF)', borderRadius: 999 }}>
          <button type="button" aria-label="One fewer" onClick={() => { setTyped(null); setTreat(false); setN(Math.max(1, n - 1)); }} style={step}>−</button>
          {treat ? <span className="dot" aria-live="polite" style={{ minWidth: 44, textAlign: 'center', fontSize: 24 }}>∞</span> : (
            <input aria-label="How many" className="dot" inputMode="numeric" pattern="[0-9]*" value={typed ?? String(n)} onChange={(e) => type(e.target.value)} onBlur={() => setTyped(null)} onFocus={(e) => e.target.select()}
              style={{ width: 44, height: 44, border: 0, padding: 0, background: 'transparent', textAlign: 'center', fontSize: 24, color: 'var(--ink, #000)', outline: 'none', borderRadius: 0 }} />
          )}
          <button type="button" aria-label="One more" onClick={() => { setTyped(null); setTreat(false); setN(Math.min(99, n + 1)); }} style={step}>+</button>
        </div>
        <button type="button" aria-pressed={treat} onClick={() => setTreat(!treat)} style={{ height: 52, border: '2px solid var(--edge, #000000)', background: treat ? 'var(--lt, #96E084)' : 'transparent', color: 'var(--ink, #000000)', fontFamily: 'inherit', fontWeight: 800, fontSize: 15, padding: '0 18px', borderRadius: 999, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><span className="dot" style={{ fontSize: 22, lineHeight: 1 }}>∞</span>Unlimited</button>
      </div>
      <span style={{ fontSize: 13, lineHeight: 1.4 }}>{help}</span>
    </section>
  );
}

// 150px photo tile: a pulled/uploaded photo as halftone on the tile color, tagged bottom-left.
export function PhotoTile({ src, tag, bg = '#F0895A', name }) {
  return (
    <div style={{ position: 'relative', width: 150, height: 150, flexShrink: 0, background: bg, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {src ? <Halftone src={src} size={150} dot={3.4} /> : <ItemSketch name={name} size={110} />}
      {tag ? <span style={{ position: 'absolute', left: 6, bottom: 6, background: 'var(--inv-bg, #000000)', color: 'var(--inv-fg, #FFFFFF)', fontSize: 11, fontWeight: 700, padding: '3px 6px', maxWidth: 138, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tag}</span> : null}
    </div>
  );
}

export function useFilePreview() {
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState(null);
  useEffect(() => { if (!file) { setUrl(null); return; } const u = URL.createObjectURL(file); setUrl(u); return () => URL.revokeObjectURL(u); }, [file]);
  return { file, url, setFile };
}

export default function AddItemForm({ slug, initialTreat = false }) {
  const [state, action, pending] = useActionState(addItem, null);
  const [pv, pull, reading] = useActionState(previewLink, null);
  const [src, setSrc] = useState('link');
  const [phase, setPhase] = useState('empty'); // empty | filled | blocked
  const [link, setLink] = useState('');
  const [v, setV] = useState({ name: '', price: '', store: '', note: '' });
  const set = (o) => setV((x) => ({ ...x, ...o }));
  const [n, setN] = useState(1);
  const [treat, setTreat] = useState(initialTreat);
  const own = useFilePreview();
  const [pulledPhoto, setPulledPhoto] = useState(null);
  const [host, setHost] = useState('');

  useEffect(() => {
    if (!pv) return;
    if (pv.error) { setPhase('empty'); return; }
    setHost(pv.host || hostOf(pv.url || link));
    if (pv.url) setLink(pv.url);
    if (pv.ok) {
      setPhase('filled');
      setPulledPhoto(pv.photo || null);
      // The store blocked our server, but its image server usually lets a real phone in: try likely addresses here.
      if (!pv.photo && pv.imageCandidates?.length) {
        (async () => {
          for (const src of pv.imageCandidates) {
            const ok = await new Promise((res) => { const im = new Image(); im.referrerPolicy = 'no-referrer'; im.onload = () => res(im.naturalWidth > 50); im.onerror = () => res(false); im.src = src; setTimeout(() => res(false), 6000); });
            if (ok) { setPulledPhoto(src); break; }
          }
        })();
      }
      setV((x) => ({ ...x, name: pv.name || x.name, price: pv.price ? '$' + String(pv.price).replace(/\.00$/, '') : x.price, store: pv.store || x.store }));
    } else {
      setPhase('blocked');
      setPulledPhoto(null);
      setV((x) => ({ ...x, store: x.store || pv.store || '' }));
    }
  }, [pv]); // eslint-disable-line react-hooks/exhaustive-deps

  // Paste a link and the details fill in by themselves; the button is a fallback.
  useEffect(() => {
    if (src !== 'link' || phase !== 'empty' || reading) return;
    const t = link.trim();
    if (!/^https?:\/\/\S+$/i.test(t) && !/^[^\s/]+\.[a-z]{2,}(\/\S*)?$/i.test(t)) return;
    const h = setTimeout(() => { const b = document.getElementById('pullbtn'); if (b) b.click(); }, 600);
    return () => clearTimeout(h);
  }, [link, phase, src]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLink = src === 'link';
  const isReading = isLink && reading;
  const filled = isLink && !reading && phase === 'filled';
  const blocked = isLink && !reading && phase === 'blocked';
  const empty = isLink && !reading && phase === 'empty';
  const canPull = (empty || blocked) && link.trim();
  const readingHost = hostOf(link) || 'the page';
  const cta = treat ? 'Add to my list, unlimited' : n > 1 ? `Add ${n} to my list` : 'Add to my list';
  const tabs = [['link', 'Paste a link'], ['photo', 'No link? Upload a photo']];

  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <input type="hidden" name="slug" value={slug} />
      {isLink && link ? <input type="hidden" name="url" value={link} /> : null}
      {isLink && filled && pulledPhoto && !own.file ? <input type="hidden" name="photoData" value={pulledPhoto} /> : null}

      <section style={{ padding: '16px 20px 0' }}>
        <div style={{ position: 'relative', height: 170 }}>
          <Blob seed={5} width={300} height={170} style={{ left: -10, top: 0 }} />
          <h1 style={{ position: 'absolute', left: 22, right: 60, top: 36, margin: 0, fontWeight: 400, fontSize: 44, lineHeight: 0.96, letterSpacing: '-0.04em' }}>What would you <span className="serif" style={{ fontStyle: 'italic', fontSize: 50 }}>love?</span></h1>
        </div>
      </section>

      <section role="tablist" aria-label="Source" style={{ margin: '22px 20px 0', display: 'flex', borderBottom: '2px solid var(--line, #000000)' }}>
        {tabs.map(([k, l]) => {
          const on = src === k;
          return <button key={k} type="button" role="tab" aria-selected={on} onClick={() => setSrc(k)} style={{ flex: '1 1 0', border: 0, background: on ? 'var(--inv-bg, #000000)' : 'transparent', color: on ? 'var(--inv-fg, #FFFFFF)' : 'var(--ink, #000000)', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, minHeight: 44, padding: '12px 6px', cursor: 'pointer', borderRadius: 0 }}>{l}</button>;
        })}
      </section>

      {isLink ? (
        <section style={{ padding: '16px 20px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label htmlFor="link" style={LBL}>Link from any store</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input id="link" value={link} onChange={(e) => { setLink(e.target.value); if (phase !== 'empty') setPhase('empty'); }} placeholder="Paste a link" inputMode="url" className="a2-input" style={{ flex: '1 1 0', minWidth: 0 }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (canPull) e.currentTarget.form.querySelector('#pullbtn').click(); } }} />
            <button id="pullbtn" type="submit" formAction={pull} aria-disabled={!canPull} disabled={!canPull && !filled}
              onClick={(e) => { if (!canPull) e.preventDefault(); }}
              style={{ flexShrink: 0, height: 50, border: '2px solid var(--inv-bg, #000000)', background: (empty || blocked) ? 'var(--inv-bg, #000000)' : 'transparent', color: (empty || blocked) ? 'var(--inv-fg, #FFFFFF)' : 'var(--ink, #000000)', fontFamily: 'inherit', fontWeight: 800, fontSize: 15, padding: '0 16px', borderRadius: 999, cursor: 'pointer', opacity: isReading ? 0.5 : 1 }}>
              {isReading ? 'Reading…' : filled ? 'Pulled' : 'Pull details'}
            </button>
          </div>
        </section>
      ) : null}

      {empty ? <section style={{ padding: '8px 20px 0' }}><span style={{ fontSize: 13 }}>{pv?.error || "We'll pull the photo and price for you."}</span></section> : null}

      {isReading ? (
        <section className="pop" role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px 0' }}>
          <svg aria-hidden="true" width="60" height="4" viewBox="0 0 60 4"><line className="dash" x1="0" y1="2" x2="60" y2="2" stroke="var(--navy-ink, #13286B)" strokeWidth="3" strokeDasharray="10 10" strokeLinecap="round" /></svg>
          <span style={{ fontSize: 14, color: 'var(--navy-ink, #13286B)', fontWeight: 500 }}>Reading {readingHost}…</span>
        </section>
      ) : null}

      {blocked ? (
        <section className="pop" role="alert" style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 0 0', borderTop: '1.5px solid #E2452B', margin: '12px 20px 0' }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#E2452B' }}>We couldn't read that page. Add the details yourself.</span>
          <span style={{ fontSize: 13, color: 'var(--muted, #4A4A4A)' }}>Some stores block this. The link still goes on your list, so friends can open it.</span>
        </section>
      ) : null}

      {filled ? (
        <section className="pop" style={{ display: 'flex', gap: 12, alignItems: 'stretch', padding: '18px 20px 0' }}>
          <PhotoTile src={own.url || pulledPhoto} tag={own.file ? own.file.name : host} name={v.name} />
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.4, display: 'flex', gap: 8, alignItems: 'flex-start' }}><svg aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2E9B47" strokeWidth="2.07" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L19 7" /></svg><span>{pulledPhoto || own.file ? <>Pulled from {host}. Check it and fix anything.</> : <>Got the name from {host}. They don’t share photos, so add one: a screenshot works.</>}</span></p>
            <label style={{ height: 44, border: '1.5px dashed var(--line, #000000)', background: !pulledPhoto && !own.file ? 'var(--lt, #D8F75A)' : 'transparent', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {camera}{own.file ? 'Change my photo' : pulledPhoto ? 'Use my own photo' : 'Add a photo'}
              <input type="file" name="photo" accept="image/*" className="sr" onChange={(e) => own.setFile(e.target.files?.[0] || null)} />
            </label>
            <button type="button" onClick={() => { setPhase('empty'); setLink(''); setPulledPhoto(null); own.setFile(null); }} style={{ height: 36, border: 0, background: 'transparent', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer', padding: 0, textAlign: 'left', color: 'var(--ink, #000)' }}>Paste a different link</button>
          </div>
        </section>
      ) : null}

      {!isLink ? (
        <section className="pop" style={{ padding: '16px 20px 0', display: 'flex', gap: 12, alignItems: 'stretch' }}>
          {own.url ? <PhotoTile src={own.url} tag={own.file.name} bg="#A9CDF5" /> : null}
          <label style={{ flexGrow: 1, cursor: 'pointer', minHeight: 150, display: 'block' }}>
            <span style={{ display: 'flex', height: '100%', boxSizing: 'border-box', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, border: '2px dashed var(--line, #000000)', padding: 10, fontWeight: 800, fontSize: 14, textAlign: 'center' }}>
              <svg aria-hidden="true" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="1.72" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4" /><path d="M7 9l5-5 5 5" /><path d="M4 20h16" /></svg>
              {own.file ? 'Add another photo' : 'Add a photo'}
            </span>
            <input type="file" name="photo" accept="image/*" className="sr" onChange={(e) => own.setFile(e.target.files?.[0] || null)} />
          </label>
        </section>
      ) : null}

      <div style={{ opacity: isReading ? 0.35 : 1, transition: 'opacity .3s' }}>
        <Fields v={v} set={set} treat={treat} n={n} />
        {pv?.ok && pv.origCurrency ? (
          <>
            <input type="hidden" name="origPrice" value={pv.origPrice} /><input type="hidden" name="origCurrency" value={pv.origCurrency} />
            <p style={{ margin: '8px 20px 0', fontSize: 13, lineHeight: 1.45, color: 'var(--muted, #4A4A4A)' }}>
              The store lists it at <b style={{ color: 'var(--ink, #000)' }}>{new Intl.NumberFormat('en-US', { style: 'currency', currency: pv.origCurrency }).format(pv.origPrice)}</b>.{pv.price ? " Converted to dollars at today's rate; friends give in dollars." : " Add the price in dollars; friends give in dollars."}
            </p>
          </>
        ) : null}
        <Qty n={n} setN={setN} treat={treat} setTreat={setTreat} />
      </div>

      {treat ? (
        <section className="pop" style={{ margin: '18px 20px 0', position: 'relative', background: 'var(--lt, #96E084)', padding: 16, overflow: 'hidden' }}>
          <div aria-hidden="true" className="dia" style={{ position: 'absolute', right: -30, top: -30, width: 90, height: 90, background: 'var(--lt, #E8642C)' }} />
          <p style={{ position: 'relative', margin: 0, fontWeight: 800, fontSize: 16, lineHeight: 1.3 }}>Unlimited treat: friends can treat you to this as many times as they like, at exactly <span className="dot" style={{ fontSize: 18 }}>{v.price || '$'}</span> each.</p>
        </section>
      ) : null}
      {state?.error ? <div className="err" style={{ margin: '20px 20px 0' }}>{state.error}</div> : null}
      <div style={{ padding: '22px 16px 32px' }}>
        <button className="btn" disabled={pending || isReading} style={{ height: 56, padding: 0 }}>{pending ? 'Adding…' : cta}</button>
      </div>
    </form>
  );
}

// ---------- Edit item ----------
export function EditItemForm({ slug, item, listTitle, contributed }) {
  const [state, action, pending] = useActionState(updateItem, null);
  const [v, setV] = useState({ name: item.name || '', price: '$' + (item.price_cents / 100).toFixed(item.price_cents % 100 ? 2 : 0), store: item.store || '', note: item.note || '', url: item.url || '' });
  const set = (o) => setV((x) => ({ ...x, ...o }));
  const [n, setN] = useState(Math.max(1, item.quantity || 1));
  const [treat, setTreat] = useState(item.quantity === 0);
  const own = useFilePreview();
  const [removing, setRemoving] = useState(false);
  const host = item.url ? hostOf(item.url) : '';
  const photoLine = item.photo ? (host ? `Photo pulled from ${host}.` : 'Your photo.') : 'No photo yet. Add one so friends know the exact thing.';
  return (
    <>
      <form action={action} style={{ display: 'flex', flexDirection: 'column' }}>
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="itemId" value={item.id} />
        {item.photo ? <input type="hidden" name="keepPhoto" value="1" /> : null}
        <section style={{ padding: '20px 20px 0', display: 'flex', gap: 12, alignItems: 'stretch' }}>
          <PhotoTile src={own.url || item.photo} tag={own.file ? own.file.name : (item.photo ? host || 'your photo' : '')} bg={item.color} name={item.name} />
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 14, lineHeight: 1.4, color: 'var(--muted, #4A4A4A)' }}>{own.file ? 'New photo. Save to use it.' : photoLine}</span>
            <label style={{ height: 44, border: '1.5px dashed var(--line, #000000)', fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {camera}{item.photo || own.file ? 'Change photo' : 'Add a photo'}
              <input type="file" name="photo" accept="image/*" className="sr" onChange={(e) => own.setFile(e.target.files?.[0] || null)} />
            </label>
            {item.url ? (
              <a href={/^https?:/i.test(item.url) ? item.url : 'https://' + item.url} target="_blank" rel="noopener" style={{ display: 'flex', alignItems: 'center', gap: 6, height: 36, fontWeight: 700, fontSize: 13, textDecoration: 'underline', textUnderlineOffset: 3, color: 'var(--ink, #000)' }}>Open the link <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="1.83" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7" /><path d="M8 7h9v9" /></svg></a>
            ) : <span style={{ height: 36 }} />}
          </div>
        </section>
        <section style={{ padding: '18px 20px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label htmlFor="link" style={LBL}>Link</label>
          <input id="link" name="url" className="a2-input" type="url" inputMode="url" value={v.url} onChange={(e) => set({ url: e.target.value })} placeholder="Paste the store link" />
          {v.url.trim() !== (item.url || '') && v.url.trim() ? <span style={{ fontSize: 12, color: 'var(--muted, #4A4A4A)' }}>New link. Save and we'll pull its photo, store and price.</span> : null}
        </section>
        <Fields v={v} set={set} treat={treat} n={n} />
        <Qty n={n} setN={setN} treat={treat} setTreat={setTreat} />
        {state?.error ? <div className="err" style={{ margin: '20px 20px 0' }}>{state.error}</div> : null}
        <div style={{ padding: '28px 20px 0' }}>
          <button className="btn" disabled={pending} style={{ height: 56, padding: 0 }}>{pending ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
      <RemoveBlock slug={slug} item={item} contributed={contributed} removing={removing} setRemoving={setRemoving} />
    </>
  );
}

function RemoveBlock({ slug, item, contributed, removing, setRemoving }) {
  const short = item.name.split(/[,(]/)[0].trim().split(/\s+/).slice(-1)[0].toLowerCase();
  return (
    <div style={{ padding: '12px 20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!removing ? (
        <button type="button" onClick={() => setRemoving(true)} style={{ height: 52, border: '1.5px solid var(--edge, #000000)', background: 'transparent', fontFamily: 'inherit', fontWeight: 700, fontSize: 15, borderRadius: 999, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--ink, #000)' }}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="1.73" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /></svg>Remove from list
        </button>
      ) : (
        <div className="pop" role="alertdialog" aria-labelledby="rmtitle" style={{ border: '1.5px solid #E2452B', padding: '18px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span id="rmtitle" style={{ fontSize: 22, lineHeight: 1.1, letterSpacing: '-0.02em' }}>Remove the {short} from <span className="serif" style={{ fontStyle: 'italic' }}>your list?</span></span>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: 'var(--muted, #4A4A4A)' }}>{contributed ? 'Friends have already chipped in. Removing keeps their gifts in your wallet.' : 'Nobody has given toward it yet. Friends will not see it anymore.'}</p>
          <form action={removeAndBack} style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <input type="hidden" name="slug" value={slug} /><input type="hidden" name="itemId" value={item.id} />
            <button type="button" onClick={() => setRemoving(false)} style={{ flex: '1 1 0', height: 50, border: '1.5px solid var(--edge, #000000)', background: 'transparent', fontFamily: 'inherit', fontWeight: 800, fontSize: 15, borderRadius: 999, cursor: 'pointer', color: 'var(--ink, #000)' }}>Keep it</button>
            <button style={{ flex: '1 1 0', border: 0, background: 'var(--dk, #E2452B)', color: 'var(--inv-fg, #FFFFFF)', fontFamily: 'inherit', fontWeight: 800, fontSize: 15, height: 50, borderRadius: 999, cursor: 'pointer' }}>Yes, remove</button>
          </form>
        </div>
      )}
    </div>
  );
}

