'use client';

import { useActionState, useRef } from 'react';
import Link from 'next/link';
import { savePhotoR1 } from '@/lib/actions-r1';
import { Blob, PhotoBlob } from '@/components/ui';

// r1: "Add your face?" Tapping the blob opens the photo picker; the photo saves right away.
export default function PhotoStep({ me, href, firstList }) {
  const [state, act, pending] = useActionState(savePhotoR1, null);
  const ref = useRef(null);
  const has = !!me.photo;
  return (
    <form action={act} style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px 0 8px' }}>
        <span style={{ width: 44, height: 44 }} />
        <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em' }}>Step 3 of 3</span>
      </header>
      <div aria-hidden="true" style={{ display: 'flex', gap: 6, padding: '8px 20px 0' }}>
        {[0, 1, 2].map((i) => <span key={i} style={{ flex: '1 1 0', height: 4, borderRadius: 999, background: '#000000' }} />)}
      </div>

      <section style={{ position: 'relative', height: 230, marginTop: 10 }}>
        <Blob seed={14} width={300} height={220} style={{ left: 20, top: 0 }} />
        <h1 className="serif" style={{ position: 'absolute', left: 44, right: 60, top: 58, margin: 0, fontWeight: 400, fontSize: 44, lineHeight: 0.95 }}>Add your <span style={{ fontWeight: 600 }}>face?</span></h1>
      </section>

      <section className="pop" style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
        <label aria-label={has ? 'Change your photo' : 'Add a photo'} style={{ position: 'relative', width: 150, height: 150, cursor: 'pointer', display: 'block' }}>
          <PhotoBlob user={me} owner size={150} pad={0} uid="su" fontSize={72} />
          <span style={{ position: 'absolute', right: 4, bottom: 8, width: 38, height: 38, borderRadius: '50%', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg></span>
          <input ref={ref} type="file" name="photo" accept="image/*" className="sr" onChange={(e) => { if (e.target.files?.[0]) e.target.form?.requestSubmit(); }} />
        </label>
        <span role="status" style={{ fontSize: 15, lineHeight: 1.4, maxWidth: 290 }}>{pending ? 'Saving your photo…' : state?.error ? state.error : has ? 'Looking good. You can change it anytime.' : 'Optional. Until then, friends see your initial.'}</span>
        <Link href={href} style={{ display: 'block', textAlign: 'center', textDecoration: 'none', background: '#000000', color: '#FFFFFF', fontWeight: 700, fontSize: 17, padding: '17px 0', borderRadius: 999, width: '100%', marginTop: 6 }}>{has ? (firstList ? 'Make my first list' : 'Continue') : (firstList ? 'Skip, make my first list' : 'Skip for now')}</Link>
      </section>
      <div style={{ height: 40 }} />
    </form>
  );
}
