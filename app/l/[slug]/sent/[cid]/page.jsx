// r3: Option 10 Sent (wish) and SentTreat (treat). Olive ground, confetti burst, the gift card, "your turn".
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Avatar } from '@/components/ui';
import { R3Sketch, R3Boil } from '@/components/r3';
import { tri } from '@/lib/blob';
import { listBySlug, itemById, owner as ownerOf } from '@/lib/lists';
import { currentUser } from '@/lib/auth';
import { get } from '@/lib/db';

export const dynamic = 'force-dynamic';

function firstName(u) { return ((u?.name || 'a friend').trim().split(/\s+/)[0]) || 'a friend'; }
const dollars = (cents) => '$' + (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);

// Same burst as the board: 28 pieces flying out from under the headline.
function confetti() {
  const C = ['#E2452B', '#13286B', '#D8F75A', '#E8642C', '#B36EE0', '#96E084', '#A9CDF5'];
  let s = 17; const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const out = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * 6.2832 + r() * 0.3;
    const d = 120 + r() * 140;
    const strip = i % 3 === 0;
    out.push({ x: Math.round(Math.cos(a) * d * 1.1) + 'px', y: Math.round(Math.sin(a) * d + 160) + 'px', r: Math.round(r() * 720 - 360) + 'deg', w: strip ? 6 : 10, h: strip ? 16 : 10, br: i % 4 === 1 ? '50%' : '0', bg: C[i % C.length], d: (r() * 0.25).toFixed(2) + 's' });
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
  const pctBefore = treat ? 0 : Math.max(0, Math.min(100, Math.floor(((upTo.cents - c.amount_cents) / Math.max(1, it.target)) * 100)));
  const listName = `${forName}'s list`;
  const words = (it.name || '').replace(/[,.;:()]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w.toUpperCase());
  const longest = Math.max(...words.map((w) => w.length), 1);
  const priv = c.visibility === 'private';

  return (
    <div className="r3-full" style={{ background: '#807F48', color: '#000000', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexGrow: 1 }}>
      <div aria-hidden="true" style={{ position: 'absolute', left: '50%', top: 170, width: 0, height: 0, zIndex: 3, pointerEvents: 'none' }}>
        {confetti().map((p, i) => (
          <span key={i} className="r3-conf" style={{ position: 'absolute', left: 0, top: 0, width: p.w, height: p.h, background: p.bg, borderRadius: p.br, '--x': p.x, '--y': p.y, '--r': p.r, animationDelay: p.d }} />
        ))}
      </div>

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 0 8px' }}>
        <Link href={`/l/${slug}`} aria-label={`Close, back to ${listName}`} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
        </Link>
        <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em', color: '#000000' }}>Sent</span>
        <div style={{ width: 44 }} />
      </header>

      <section style={{ position: 'relative', padding: '18px 20px 0', textAlign: 'center' }}>
        <h1 className="serif" style={{ margin: 0, fontWeight: 400, fontSize: 54, lineHeight: 0.92, color: '#000000' }}>You made {forName}'s <span style={{ fontStyle: 'italic' }}>day</span></h1>
        <p style={{ margin: '12px 0 0', fontSize: 16 }}>Your {treat ? 'treat' : 'gift'} just landed on the list.</p>
      </section>

      <section className="r3-land" aria-label={treat ? 'Your treat' : 'Your gift'} style={{ margin: '26px 16px 0', background: '#FFFFFF', color: '#000000', display: 'flex', flexDirection: 'column' }}>
        {treat ? (
          <div style={{ position: 'relative', height: 230, background: it.photo ? `#FFFFFF url(/api/photo/${it.id}) center / contain no-repeat` : '#96E084', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '14px 16px', boxSizing: 'border-box' }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>{it.store || ' '}</span>
            <span className="dot" aria-hidden="true" style={{ alignSelf: 'center', textAlign: 'center', fontSize: longest > 8 ? Math.max(28, Math.floor(46 * 8 / longest)) : 46, lineHeight: 0.95 }}>{words.map((w, i) => <span key={i}>{i ? <br /> : null}{w}</span>)}</span>
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span className="wide" style={{ fontSize: 17 }}>{dollars(c.amount_cents)}</span><span style={{ fontSize: 12, fontWeight: 700 }}>A treat · unlimited</span></span>
          </div>
        ) : (
          <div style={{ position: 'relative', height: 230, background: it.photo ? '#FFFFFF' : '#E8642C', overflow: 'hidden' }}>
            {it.photo ? <img src={`/api/photo/${it.id}`} alt={it.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 14, boxSizing: 'border-box', display: 'block' }} /> : <R3Sketch name={it.name} />}
          </div>
        )}
        <div style={{ padding: '16px 16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><Avatar user={owner} size={26} owner />{listName} · {list.title}</div>
          <span style={{ fontSize: 20, letterSpacing: '-0.015em' }}>{it.name}</span>
          {treat ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span className="dot r3-tickin" style={{ fontSize: 30, color: '#13286B' }}>×{upTo.units}</span>
              <span style={{ fontSize: 14 }}>treated again and again</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flexGrow: 1, height: 10, borderRadius: 999, background: '#D7D7DC', overflow: 'hidden' }}><div className="r3-fill" style={{ '--from': pctBefore + '%', '--to': pctAfter + '%', width: pctAfter + '%', height: '100%', borderRadius: 999, background: '#13286B' }} /></div>
              <span className="dot" style={{ flexShrink: 0, fontSize: 16 }}>{pctAfter}%</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', paddingTop: 12, borderTop: '1px solid #000000' }}>
            <Avatar user={giver} size={34} />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {c.note ? <span className="serif" style={{ fontStyle: 'italic', fontSize: 20, lineHeight: 1.2 }}>{c.note}</span> : <span style={{ fontSize: 15 }}>No note this time.</span>}
              <span style={{ fontSize: 12, color: '#4A4A4A' }}>{firstName(giver)} · {priv ? 'private' : 'public'} · {forName} sees your {c.note ? 'note' : 'name'}, never the amount</span>
            </span>
          </div>
        </div>
      </section>

      <section className="r3-later" style={{ position: 'relative', margin: '22px 16px 0', height: 250 }}>
        <R3Boil paths={tri(41)} color="#93EC75" style={{ left: 0, top: 0 }} width="100%" height={250} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center', padding: '0 50px', color: '#000000' }}>
          <span style={{ fontSize: 26, lineHeight: 1.05, letterSpacing: '-0.02em' }}>Your turn: what would you <span className="serif" style={{ fontStyle: 'italic' }}>love?</span></span>
          <span style={{ fontSize: 14, lineHeight: 1.35 }}>Make a list so your friends can celebrate you too.</span>
          <Link href="/lists/new" style={{ marginTop: 4, textDecoration: 'none', background: '#000000', color: '#FFFFFF', fontSize: 15, padding: '12px 22px', borderRadius: 999 }}>Start my list</Link>
        </div>
      </section>
      <Link href={`/l/${slug}`} className="r3-later" style={{ margin: '10px auto 0', padding: '6px 10px', fontSize: 14, color: '#000000', textDecoration: 'underline' }}>Maybe later, back to {listName}</Link>
      <div style={{ height: 40 }} />
    </div>
  );
}
