// a3: Option 13 Sent (wish) and SentTreat (treat). Olive ground, framed poster, gift card.
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Blob, Avatar, PosterSketch } from '@/components/ui';
import { listBySlug, itemById, owner as ownerOf } from '@/lib/lists';
import { currentUser } from '@/lib/auth';
import { get } from '@/lib/db';

export const dynamic = 'force-dynamic';

function firstName(u) { return ((u?.name || 'a friend').trim().split(/\s+/)[0]) || 'a friend'; }

// Same scatter as the board: drops in once, then rests in place.
function confetti() {
  const C = ['#93EC75', '#D8F75A', '#FFFFFF', '#E8642C', '#F4D3EE', '#A9CDF5'];
  let s = 17; const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const out = [];
  for (let i = 0; i < 26; i++) {
    const strip = i % 3 === 0;
    let x = Math.round(8 + r() * 360), y = Math.round(40 + r() * 470);
    if (x > 160 && y > 70 && y < 300) x = Math.round(14 + r() * 140);
    out.push({ x, y, r: Math.round(r() * 540 - 270) + 'deg', w: strip ? 6 : 10, h: strip ? 18 : 10, br: i % 4 === 1 ? '50%' : '0', bg: C[i % C.length], d: (r() * 0.4).toFixed(2) + 's' });
  }
  return out;
}

export default async function SentPage({ params }) {
  const { slug, cid } = await params;
  const list = await listBySlug(slug);
  if (!list) notFound();
  const c = await get('SELECT * FROM contributions WHERE id = ? AND list_id = ?', cid, list.id);
  if (!c) notFound();
  const me = await currentUser();
  if (!me || me.id !== c.giver_id) redirect(`/l/${slug}`);
  const it = await itemById(c.item_id);
  if (!it) notFound();
  const owner = await ownerOf(list);
  const giver = await get('SELECT * FROM users WHERE id = ?', c.giver_id);
  const forName = list.for_who === 'other' && list.recipient_name ? list.recipient_name : firstName(owner);
  const treat = it.unlimited;
  // Progress as it stood right after this gift (later gifts do not change this screen).
  const upTo = await get('SELECT COALESCE(SUM(amount_cents),0) AS cents, COALESCE(SUM(units),0) AS units FROM contributions WHERE item_id = ? AND created_at <= ?', it.id, c.created_at);
  const pctAfter = treat ? 0 : Math.min(100, Math.floor((upTo.cents / Math.max(1, it.target)) * 100));
  const pctBefore = treat ? 0 : Math.min(100, Math.floor(((upTo.cents - c.amount_cents) / Math.max(1, it.target)) * 100));
  const timesAfter = upTo.units;
  const listName = list.for_who === 'other' ? `${forName}'s list` : `${firstName(owner)}'s list`;

  return (
    <div style={{ minHeight: '100vh', boxSizing: 'border-box', background: '#807F48', color: '#FFFFFF', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div aria-hidden="true" style={{ position: 'absolute', left: '50%', marginLeft: -195, top: 0, width: 390, height: 560, pointerEvents: 'none', zIndex: 3 }}>
        {confetti().map((p, i) => (
          <span key={i} className="a3-conf" style={{ left: p.x, top: p.y, width: p.w, height: p.h, background: p.bg, borderRadius: p.br, transform: `rotate(${p.r})`, '--r': p.r, animationDelay: p.d }} />
        ))}
      </div>

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 0 8px' }}>
        <Link href={`/l/${slug}`} aria-label={`Back to ${listName}`} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
        </Link>
        <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em', color: '#93EC75' }}>Sent</span>
        <div style={{ width: 44 }} />
      </header>

      <section aria-label={`You made ${forName}'s day`} style={{ position: 'relative', margin: '10px 16px 0', height: 400, border: '10px solid #93EC75', boxSizing: 'border-box', overflow: 'hidden' }}>
        <PosterSketch name={it.name} unlimited={treat} seed={treat ? 11 : 7} />
        <span className="wide" style={{ position: 'absolute', left: 14, top: 14, fontSize: 11, letterSpacing: '0.18em', color: '#93EC75' }}>For {forName}</span>
        <h1 className="serif" style={{ position: 'absolute', left: 14, right: 14, bottom: 36, margin: 0, fontWeight: 400, fontSize: 54, lineHeight: 0.92, color: '#FFFFFF' }}>You made {forName}'s <span style={{ fontStyle: 'italic', color: '#93EC75' }}>day</span></h1>
        <p style={{ position: 'absolute', left: 14, right: 14, bottom: 12, margin: 0, fontSize: 15, color: '#FFFFFF' }}>Your {treat ? 'treat' : 'gift'} just landed on the list.</p>
      </section>

      <section aria-label={treat ? 'Your treat' : 'Your gift'} style={{ margin: '16px 16px 0', background: '#FFFFFF', color: '#000000', display: 'flex', flexDirection: 'column', padding: '16px 16px 18px', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><Avatar user={owner} size={26} owner />{listName} · {list.title}</div>
        <span style={{ fontSize: 20, letterSpacing: '-0.015em', lineHeight: 1.15 }}>{it.name}{it.store ? <> <span style={{ fontSize: 14, color: '#4A4A4A' }}>from {it.store}</span></> : null}</span>
        {treat ? (
          <span style={{ fontSize: 14, color: '#4A4A4A', display: 'flex', alignItems: 'baseline', gap: 8 }}><span className="dot a3-tickin" style={{ fontSize: 30, color: '#000000' }}>×{timesAfter}</span> treated, again and again</span>
        ) : (
          <>
            <div style={{ height: 10, borderRadius: 999, background: '#E6E6E6', overflow: 'hidden' }}><div className="a3-fill" style={{ '--from': pctBefore + '%', '--to': pctAfter + '%', background: '#807F48' }} /></div>
            <span style={{ fontSize: 14, color: '#4A4A4A' }}><span className="dot a3-tickin" style={{ fontSize: 18, color: '#000000', marginRight: 4 }}>{pctAfter}%</span> {pctAfter >= 100 ? 'covered. Your gift finished it.' : 'covered, with yours'}</span>
          </>
        )}
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', paddingTop: 12, borderTop: '1px solid #000000' }}>
          <Avatar user={giver} size={34} />
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {c.note ? <span className="it" style={{ fontSize: 20, lineHeight: 1.2 }}>{c.note}</span> : <span style={{ fontSize: 15 }}>No note this time.</span>}
            <span style={{ fontSize: 12, color: '#4A4A4A' }}>{giver.name || 'You'} · {c.visibility} · {forName} sees your note, never the amount</span>
          </span>
        </div>
      </section>

      <section style={{ position: 'relative', margin: '24px 16px 0', height: 250 }}>
        <Blob seed={41} color="#93EC75" style={{ left: 0, top: 0 }} width="100%" height={250} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center', padding: '0 50px', color: '#000000' }}>
          <span style={{ fontSize: 26, lineHeight: 1.05, letterSpacing: '-0.02em' }}>Your turn: what would you <span className="it">love?</span></span>
          <span style={{ fontSize: 14, lineHeight: 1.35 }}>Make a list so your friends can celebrate you too.</span>
          <Link href="/lists/new" style={{ marginTop: 4, textDecoration: 'none', background: '#000000', color: '#FFFFFF', fontWeight: 800, fontSize: 16, padding: '14px 24px', borderRadius: 999 }}>Start my list</Link>
        </div>
      </section>
      <Link href={`/l/${slug}`} style={{ margin: '12px auto 0', padding: 12, fontSize: 14, color: '#FFFFFF', textDecoration: 'underline', textUnderlineOffset: 3 }}>Maybe later, back to {listName}</Link>
      <div style={{ height: 28 }} />
    </div>
  );
}
