'use client';

import { useActionState, useState } from 'react';
import { addItem } from '@/lib/actions';
import { Blob } from '@/components/ui';

export default function AddItemForm({ slug, listTitle }) {
  const [state, action, pending] = useActionState(addItem, null);
  const [n, setN] = useState(1);
  const [unl, setUnl] = useState(false);
  const [price, setPrice] = useState('');
  const cta = unl ? 'Add to my list, unlimited' : n > 1 ? `Add ${n} to my list` : 'Add to my list';
  const help = unl ? 'Unlimited makes it a treat. Friends can give it again and again, and you see a running count.' : n === 1 ? 'Just one. Tap + if you want more of the same thing.' : `One listing for ${n}. Friends see it as one item and fill it toward the total.`;

  return (
    <form action={action} encType="multipart/form-data" style={{ display: 'flex', flexDirection: 'column' }}>
      <input type="hidden" name="slug" value={slug} />
      <section style={{ padding: '16px 20px 0' }}>
        <div style={{ position: 'relative', height: 170 }}>
          <Blob seed={5} width={300} height={170} style={{ left: -10, top: 0 }} />
          <h1 style={{ position: 'absolute', left: 22, right: 60, top: 36, margin: 0, fontWeight: 400, fontSize: 44, lineHeight: 0.96, letterSpacing: '-0.04em' }}>What would you <span className="it" style={{ fontSize: 50 }}>love?</span></h1>
        </div>
      </section>

      <section role="tablist" style={{ margin: '22px 20px 0', display: 'flex', borderBottom: '2px solid #000' }}>
        <label className="tab"><input type="radio" name="src" id="srclink" value="link" />Paste a link</label>
        <label className="tab"><input type="radio" name="src" id="srcphoto" value="photo" defaultChecked />No link? Upload a photo</label>
      </section>

      <section className="reveal if-link pop" style={{ padding: '16px 20px 0', flexDirection: 'column', gap: 8 }}>
        <label htmlFor="url" className="lbl">Link from any store</label>
        <input id="url" name="url" type="url" className="input" placeholder="https://" />
        <span style={{ fontSize: 13 }}>Paste it and we'll keep the link on the item for friends.</span>
      </section>

      <section className="reveal if-photo pop" style={{ padding: '16px 20px 0', flexDirection: 'column', gap: 8 }}>
        <label htmlFor="photo" className="lbl">A photo of it</label>
        <label htmlFor="photo" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, border: '2px dashed #000', padding: 22, fontWeight: 800, fontSize: 14, textAlign: 'center', cursor: 'pointer' }}>
          <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4" /><path d="M7 9l5-5 5 5" /><path d="M4 20h16" /></svg>
          Add a photo
          <input id="photo" name="photo" type="file" accept="image/*" className="sr" />
        </label>
      </section>

      <section style={{ padding: '18px 20px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="field"><label htmlFor="name">Exact name</label><input id="name" name="name" className="input" placeholder="The blue vase from the flea market" required /></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          <div className="field"><label htmlFor="price">{unl || n > 1 ? 'Price each' : 'About'}</label><input id="price" name="price" className="input dot" style={{ fontSize: 20 }} inputMode="decimal" placeholder="$140" value={price} onChange={(e) => setPrice(e.target.value)} required /></div>
          <div className="field"><label htmlFor="store">Where</label><input id="store" name="store" className="input" placeholder="Brooklyn Flea, stall 12" /></div>
        </div>
        <div className="field"><label htmlFor="note">Note for friends</label><input id="note" name="note" className="input" placeholder="Ask for Rami, the owner holds them" /></div>
      </section>

      <section style={{ padding: '18px 20px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span className="lbl">How many?</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', border: '2px solid #000', background: unl ? '#D7D7DC' : '#fff', borderRadius: 999 }}>
            <button type="button" aria-label="One fewer" onClick={() => { setUnl(false); setN((v) => Math.max(1, v - 1)); }} style={{ width: 48, height: 48, border: 0, background: 'transparent', font: 'inherit', fontSize: 22, cursor: 'pointer' }}>−</button>
            <span className="dot" aria-live="polite" style={{ minWidth: 44, textAlign: 'center', fontSize: 24 }}>{unl ? '∞' : n}</span>
            <button type="button" aria-label="One more" onClick={() => { setUnl(false); setN((v) => Math.min(99, v + 1)); }} style={{ width: 48, height: 48, border: 0, background: 'transparent', font: 'inherit', fontSize: 22, cursor: 'pointer' }}>+</button>
          </div>
          <input type="hidden" name="quantity" value={n} />
          <label className="pill" style={{ height: 52, fontWeight: 800, fontSize: 15, padding: '0 18px', background: unl ? '#96E084' : 'transparent' }}>
            <input type="checkbox" id="unlimited" name="unlimited" className="sr" checked={unl} onChange={(e) => setUnl(e.target.checked)} />
            <span className="dot" style={{ fontSize: 22, lineHeight: 1 }}>∞</span>Unlimited
          </label>
        </div>
        <span style={{ fontSize: 13, lineHeight: 1.4 }}>{help}</span>
      </section>

      {unl ? (
        <section className="pop" style={{ margin: '18px 20px 0', position: 'relative', background: '#96E084', padding: 16, overflow: 'hidden' }}>
          <div aria-hidden="true" style={{ position: 'absolute', right: -30, top: -30, width: 90, height: 90, background: '#E8642C', transform: 'rotate(45deg)' }} />
          <p style={{ position: 'relative', margin: 0, fontWeight: 800, fontSize: 16, lineHeight: 1.3 }}>Unlimited treat: friends can treat you to this as many times as they like, at exactly <span className="dot" style={{ fontSize: 18 }}>{price || '$—'}</span> each.</p>
        </section>
      ) : null}

      {state?.error ? <div className="err" style={{ margin: '18px 20px 0' }}>{state.error}</div> : null}
      <div style={{ padding: '22px 16px 32px' }}>
        <button className="btn" disabled={pending}>{pending ? 'Adding…' : cta}</button>
      </div>
    </form>
  );
}
