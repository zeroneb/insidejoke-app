import { TitleWords } from '@/components/owner-list';
import Link from 'next/link';
import { coverFor, listKind } from '@/lib/cover';
import { CoverArt } from '@/components/cover-art';
import ListProgress from '@/components/list-progress';
import { Blob, Avatar, ItemSketch, Halftone, shortName } from '@/components/ui';

export function firstName(u) {
  return ((u?.name || 'a friend').trim().split(/\s+/)[0]) || 'a friend';
}

// Line ink for a wish tile's sketch, per tile color (Option 13 boards).
const INK = { '#E8642C': '#FFFFFF', '#F0895A': '#FFFFFF', '#F4D3EE': '#E2452B', '#A9CDF5': '#13286B', '#96E084': '#000000', '#93EC75': '#000000', '#E3C552': '#13286B', '#B36EE0': '#FFFFFF', '#5FC3D9': '#13286B', '#D8F75A': '#13286B', '#D4FA4F': '#13286B', '#13286B': '#FFFFFF', '#C8743A': '#FFFFFF', '#807F48': '#FFFFFF' };
export function tileInk(bg) {
  return INK[bg] || '#13286B';
}

export function hostOf(url) {
  try { return new URL(url.startsWith('http') ? url : 'https://' + url).hostname.replace(/^www\./, ''); } catch { return url; }
}

// "Ganni · ×4 · your photo": where it is from, never "linked".
export function storeLine(it, photoLabel) {
  const parts = [it.store || (it.url ? hostOf(it.url) : null)];
  if (it.quantity > 1) parts.push(`set of ${it.quantity}`);
  if (it.photo && !it.url && photoLabel) parts.push(photoLabel);
  return parts.filter(Boolean).join(' · ') || ' ';
}

function wishLabel(it) {
  if (it.covered) return 'All covered';
  if (it.pct === 0) return 'Up for grabs';
  return `${it.pct}% covered`;
}

// r2: treat tiles cycle the board's colors (bg, ink), not the item's stored color.
const TREAT_TILES = [['#96E084', '#000000'], ['#F4D3EE', '#E2452B'], ['#A9CDF5', '#13286B'], ['#E8642C', '#FFFFFF'], ['#D4FA4F', '#1530C8'], ['#8A5A2B', '#F4D3EE']];

const money0 = (c) => '$' + (c / 100).toFixed(c % 100 ? 2 : 0);

export default function FriendList({ list, owner, items, me }) {
  const slug = list.slug;
  const name = firstName(owner);
  const forName = list.for_who === 'other' && list.recipient_name ? list.recipient_name : name;
  const treats = items.filter((i) => i.unlimited);
  const wishes = items.filter((i) => !i.unlimited);
  const covered = wishes.filter((i) => i.covered).length;
  const lower = forName.toLowerCase();
  const ring = list.ring_text ? `${list.ring_text.trim()} · ` : `${lower}'s list · things ${lower} would actually loveeee · `;
  const profile = owner ? `/u/${owner.id}` : '/';
  const words = String(list.title || '').trim().split(/\s+/);
  const long = (list.title || '').length > 20;
  const cv = coverFor(list, listKind(list, items));

  return (
    <main style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <section style={{ position: 'relative', background: cv.bg, color: cv.chrome, height: 420, overflow: 'hidden', flexShrink: 0 }}>
        <CoverArt cv={cv} />
        <header style={{ position: 'relative', zIndex: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 0 8px' }}>
          <Link href={me ? profile : '/'} aria-label={`Back to ${name}'s profile`} className="iconbtn"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={cv.chrome} strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></Link>
          {me && list.visibility !== 'private' ? (
            <Link href={`/l/${slug}/share`} aria-label="Share list" className="iconbtn"><svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={cv.chrome} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v13" /><path d="M7 8l5-5 5 5" /><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></svg></Link>
          ) : <span style={{ width: 44 }} />}
        </header>
        <span className="dk-center370"><Blob seed={5 + (cv.k % 4) * 22} color={cv.blob} style={{ left: 10, top: 56 }} width={370} height={290} /></span>
        <svg aria-hidden="true" className="slow" style={{ position: 'absolute', left: '50%', marginLeft: -135, top: 62 }} width="270" height="270" viewBox="0 0 270 270">
          <defs><path id="fl-arc" d="M135 135 m-112 0 a112 112 0 1 1 224 0 a112 112 0 1 1 -224 0" /></defs>
          <text style={{ fontFamily: "'EB Garamond', serif", fontSize: 15, fill: cv.art === 'circle' ? cv.circle : cv.title }}><textPath href="#fl-arc">{ring.repeat(ring.length < 34 ? 4 : 2)}</textPath></text>
        </svg>
        <h1 className="fl-title" style={{ position: 'absolute', left: 40, right: 40, top: long ? 150 : 140, margin: 0, textAlign: 'center', color: cv.title, fontWeight: 400, lineHeight: 0.92 }}>
          <TitleWords title={list.title} size={long ? 38 : 50} width={290} />
        </h1>
        <div style={{ position: 'absolute', left: 20, right: 20, bottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <Link href={profile} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, textDecoration: 'none', color: cv.chrome, minHeight: 44, minWidth: 0 }}><Avatar user={owner} size={30} owner /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{owner?.name || 'A friend'}</span></Link>
          <span className="dot" style={{ fontSize: 14, flexShrink: 0, color: cv.chrome }}>{items.length} {items.length === 1 ? 'THING' : 'THINGS'} · {covered} COVERED</span>
        </div>
      </section>

      <ListProgress items={items} pad="22px 20px 0" />
      {treats.length ? (
        <section style={{ padding: '26px 0 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px' }}>
            <h2 className="wide" style={{ margin: 0, fontSize: 17, letterSpacing: '0.12em' }}>Treats</h2>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Unlimited · treat anytime</span>
          </div>
          <div className="a2-nostrip" style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 20px 6px', scrollbarWidth: 'none' }}>
            {treats.map((t, ti) => {
              const [bg, fg] = TREAT_TILES[ti % TREAT_TILES.length];
              return (
                <Link key={t.id} href={`/l/${slug}/i/${t.id}/give`} aria-label={`Send ${t.name}${t.store ? ` from ${t.store}` : ''}`} style={{ position: 'relative', flex: '0 0 150px', height: 200, textDecoration: 'none', background: bg, color: fg, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 12, boxSizing: 'border-box' }}>
                  <span style={{ position: 'relative', fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.store || 'Anywhere'}</span>
                  <span className="dot" style={{ position: 'relative', alignSelf: 'center', textAlign: 'center', fontSize: 26, lineHeight: 0.95, whiteSpace: 'pre-line' }}>{shortName(t.name)}</span>
                  <span style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span className="wide" style={{ fontSize: 15 }}>{money0(t.price_cents)}</span><span className="dot" style={{ fontSize: 18 }}>×{t.timesTreated}</span></span>
                    <span style={{ background: fg, color: bg, textAlign: 'center', fontWeight: 800, fontSize: 13, padding: '8px 0', borderRadius: 999 }}>Send a treat</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <section style={{ padding: '26px 20px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8 }}>
          <h2 className="wide" style={{ margin: 0, fontSize: 17, letterSpacing: '0.12em' }}>Wishes</h2>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Get it or contribute</span>
        </div>
        {wishes.length === 0 ? <p style={{ margin: 0, padding: '16px 0', borderTop: '1.5px solid #000000', fontSize: 14, color: '#4A4A4A' }}>Nothing here yet.</p> : null}
        <div className="dk-wishgrid">
        {wishes.map((it, i) => {
          const ink = tileInk(it.color);
          return (
            <div key={it.id} className="dk-wish" style={{ borderTop: '1.5px solid #000000', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Link href={`/l/${slug}/i/${it.id}`} style={{ textDecoration: 'none', display: 'flex', gap: 14, color: '#000000' }}>
                <div style={{ position: 'relative', width: 92, height: 92, flexShrink: 0, background: it.color, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {it.photo ? <Halftone src={it.photo} ink={ink === '#FFFFFF' ? '#13286B' : ink} size={92} /> : <ItemSketch name={it.name} size={72} ink={ink} strokeWidth={2.6} />}
                  {it.photo && !it.url ? <span style={{ position: 'absolute', left: 4, bottom: 4, background: '#000000', color: '#FFFFFF', fontSize: 10, fontWeight: 700, padding: '2px 5px' }}>{forName}'s photo</span> : null}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexGrow: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 17, lineHeight: 1.15, letterSpacing: '-0.015em' }}>{it.name}</span>
                  <span style={{ fontSize: 13 }}>{storeLine(it)}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto' }}>
                    <div style={{ flexGrow: 1, height: 10, borderRadius: 999, background: '#D7D7DC', overflow: 'hidden' }}><div className="grow" style={{ width: `${it.pct}%`, height: '100%', borderRadius: 999, background: it.covered ? '#2E9B47' : '#13286B', animationDelay: `${0.2 * (i + 1)}s` }} /></div>
                    <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 500 }}>{wishLabel(it)}</span>
                  </div>
                </div>
              </Link>
              {!it.covered ? (
                <div style={{ display: 'flex', gap: 8, paddingLeft: 106 }}>
                  <Link href={`/l/${slug}/i/${it.id}/give`} style={{ flex: '1 1 0', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: 999, background: '#000000', color: '#FFFFFF', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>Contribute</Link>
                  <Link href={`/l/${slug}/i/${it.id}/give?mode=rest`} style={{ flex: '1 1 0', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 44, borderRadius: 999, border: '1.5px solid #000000', boxSizing: 'border-box', color: '#000000', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>{it.pct === 0 ? 'Get it' : 'Cover the rest'}</Link>
                </div>
              ) : null}
            </div>
          );
        })}
        </div>
      </section>

      <div style={{ padding: '16px 20px 40px', borderTop: '1.5px solid #000000', margin: '0 20px' }}>
        <p className="serif" style={{ margin: 0, fontSize: 19, lineHeight: 1.3, paddingTop: 14 }}>Tap anything to get it for {forName} or chip in. 100% goes to {forName}, who sees your note, never the amount.</p>
      </div>

      {!me ? (
        <div style={{ margin: '0 20px', padding: '18px 0 36px', borderTop: '1.5px solid #000000', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: 14, lineHeight: 1.4 }}>Takes a minute: your name and your number. No password.</span>
          <Link href={`/signup?next=/l/${slug}`} className="btn" style={{ height: 54, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Sign up to give</Link>
        </div>
      ) : null}
    </main>
  );
}
