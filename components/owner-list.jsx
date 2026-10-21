import Link from 'next/link';
import { label } from '@/lib/lists';
import { dismissNudge, removeItem, archiveList } from '@/lib/actions';
import { Blob, ItemSketch } from '@/components/ui';

function Bagel() {
  return (
    <svg className="draw-g" role="img" aria-label="Hand-drawn bagel" width="220" height="190" viewBox="0 0 220 190" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <defs><filter id="wob" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="5" /><feDisplacementMap in="SourceGraphic" scale="4" /></filter></defs>
      <g filter="url(#wob)">
        <path d="M30 112 C26 72 70 48 112 50 C158 52 196 78 190 114 C184 148 140 162 104 160 C62 158 34 144 30 112 Z" />
        <path d="M24 108 C28 70 74 44 118 46" />
        <path d="M84 104 C86 92 102 86 114 88 C128 90 136 98 132 108 C128 118 112 122 100 120 C90 118 82 112 84 104 Z" />
        <path d="M38 132 C70 150 142 152 182 128" />
        <path d="M52 84 L60 78 M70 70 L78 66 M150 68 L158 72 M170 84 L176 90 M60 136 L66 142 M150 140 L156 134" />
        <path d="M48 104 L64 90 M46 118 L72 94 M150 96 L170 112 M146 112 L166 128" />
      </g>
    </svg>
  );
}

export default function OwnerList({ list, items, me }) {
  const slug = list.slug;
  const covered = items.filter((it) => it.covered).length;
  const showNudge = items.length >= 1 && !list.nudge_dismissed && !items.some((it) => it.unlimited);
  const who = list.for_who === 'other' ? `for ${list.recipient_name}` : 'yours';
  return (
    <main>
      <section style={{ position: 'relative', background: '#E8642C', color: '#fff', height: 300, overflow: 'hidden' }}>
        <div aria-hidden="true" style={{ position: 'absolute', right: -70, bottom: -80, width: 260, height: 260, borderRadius: '50%', background: '#13286B' }} />
        <header className="hdr" style={{ position: 'relative' }}>
          <Link href="/home" aria-label="Back" className="iconbtn"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></Link>
          <Link href={`/l/${slug}/share`} style={{ border: '2px solid #fff', color: '#fff', textDecoration: 'none', fontWeight: 800, fontSize: 13, padding: '9px 14px', borderRadius: 999, marginRight: 8 }}>Share</Link>
        </header>
        <Blob seed={5} width={320} height={190} style={{ left: -24, top: 64 }} />
        <h1 className="serif" style={{ position: 'relative', margin: '40px 0 0', padding: '0 20px', color: '#000', fontWeight: 400, fontSize: 46, lineHeight: 0.92 }}>{list.title}</h1>
        <p style={{ position: 'relative', margin: '14px 0 0', padding: '0 20px', color: '#13286B', fontWeight: 800, fontSize: 14 }}>
          {list.visibility === 'public' ? 'Public' : 'Private'}{list.surprise ? ' · surprise' : ''} · {items.length ? `${items.length} ${items.length === 1 ? 'thing' : 'things'}${covered ? ` · ${covered} covered` : ''}` : 'nothing yet'}{list.for_who === 'other' ? ` · ${who}` : ''}
        </p>
      </section>

      <section style={{ padding: '14px 20px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 6 }}>
          <h2 className="wide" style={{ margin: 0, fontSize: 16, letterSpacing: '0.12em' }}>On the list</h2>
          <Link href={`/l/${slug}/add`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 14, textDecoration: 'none', padding: '10px 0' }}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>Add
          </Link>
        </div>
        {items.length === 0 ? (
          <div style={{ borderTop: '1.5px solid #000', padding: '18px 0' }}>
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.4 }}>Nothing on it yet. Add the exact thing, down to the shade.</p>
            <Link href={`/l/${slug}/add`} className="btn" style={{ marginTop: 14 }}>Add the first thing</Link>
          </div>
        ) : null}
        {items.map((it) => (
          <div key={it.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', borderTop: '1.5px solid #000' }}>
            <span style={{ width: 54, height: 54, flexShrink: 0, background: it.color, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {it.photo ? <img src={it.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ItemSketch name={it.name} size={44} unlimited={it.unlimited} />}
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flexGrow: 1, minWidth: 0 }}>
              <Link href={`/l/${slug}/i/${it.id}`} style={{ fontWeight: 800, fontSize: 15, textDecoration: 'none' }}>{it.name}</Link>
              <span style={{ fontSize: 12 }}>{it.unlimited ? 'Unlimited' : `×${it.quantity}`}{it.photo ? ' · your photo' : ''}{it.url ? ' · linked' : ''}</span>
            </span>
            <span className="dot" style={{ fontSize: 16, flexShrink: 0 }}>{label(it)}</span>
            <form action={removeItem}>
              <input type="hidden" name="slug" value={slug} /><input type="hidden" name="itemId" value={it.id} />
              <button aria-label={`Remove ${it.name}`} className="iconbtn" style={{ width: 36, height: 36 }}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
            </form>
          </div>
        ))}
        {items.length ? <div style={{ borderTop: '1.5px solid #000' }} /> : null}
      </section>

      {showNudge ? (
        <section className="pop" style={{ margin: '26px 16px 0', background: '#96E084', display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bagel /></div>
          <div style={{ background: '#fff', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 24, lineHeight: 1.05, letterSpacing: '-0.02em' }}>Some things you never get <span className="it">tired of.</span></span>
            <span style={{ fontSize: 15, lineHeight: 1.4 }}>Make one unlimited and friends can give it again and again.</span>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <Link href={`/l/${slug}/add`} className="btn" style={{ fontSize: 15, padding: '14px 0' }}>Add an unlimited item</Link>
              <form action={dismissNudge}><input type="hidden" name="slug" value={slug} /><button className="btn ghost" style={{ width: 'auto', padding: '0 18px', height: '100%', fontSize: 15 }}>Not now</button></form>
            </div>
          </div>
        </section>
      ) : null}

      <section style={{ padding: '30px 20px 40px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <details>
          <summary className="muted" style={{ fontSize: 14, cursor: 'pointer' }}>Archive this list</summary>
          <form action={archiveList} style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input type="hidden" name="slug" value={slug} />
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.4 }}>Money already given stays in your wallet. You can bring the list back anytime.</p>
            <button className="btn ghost" style={{ fontSize: 15, padding: '13px 0' }}>Archive the list</button>
          </form>
        </details>
      </section>
    </main>
  );
}
