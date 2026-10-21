import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Blob, Avatar, ItemSketch } from '@/components/ui';
import { tileInk } from '@/components/friend-list';
import { listBySlug, itemById, owner as ownerOf, money } from '@/lib/lists';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

function firstName(u) { return ((u?.name || 'a friend').trim().split(/\s+/)[0]) || 'a friend'; }

function confetti() {
  const C = ['#E2452B', '#13286B', '#D8F75A', '#E8642C', '#B36EE0', '#96E084', '#A9CDF5'];
  let s = 17; const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const out = [];
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * 6.2832 + r() * 0.3;
    const d = 120 + r() * 140;
    const strip = i % 3 === 0;
    out.push({ x: Math.round(Math.cos(a) * d * 1.1) + 'px', y: Math.round(Math.sin(a) * d + 160) + 'px', rr: Math.round(r() * 720 - 360) + 'deg', w: strip ? 6 : 10, h: strip ? 16 : 10, br: i % 4 === 1 ? '50%' : '0', bg: C[i % C.length], d: (r() * 0.25).toFixed(2) + 's' });
  }
  return out;
}

export default async function SentPage({ params }) {
  const { slug, cid } = await params;
  const list = listBySlug(slug);
  if (!list) notFound();
  const c = db().prepare('SELECT * FROM contributions WHERE id = ? AND list_id = ?').get(cid, list.id);
  if (!c) notFound();
  const me = await currentUser();
  if (!me || (me.id !== c.giver_id && me.id !== list.owner_id)) redirect(`/l/${slug}`);
  const it = itemById(c.item_id);
  if (!it) notFound();
  const owner = ownerOf(list);
  const giver = db().prepare('SELECT * FROM users WHERE id = ?').get(c.giver_id);
  const forName = list.for_who === 'other' && list.recipient_name ? list.recipient_name : firstName(owner);
  const ink = tileInk(it.color);
  const before = it.unlimited ? 0 : Math.max(0, Math.min(100, Math.floor(((it.raised - c.amount_cents) / Math.max(1, it.target)) * 100)));

  return (
    <div className="st">
      <div aria-hidden="true" className="st-conf">
        {confetti().map((p, i) => (
          <span key={i} className="conf" style={{ width: p.w, height: p.h, background: p.bg, borderRadius: p.br, '--x': p.x, '--y': p.y, '--rr': p.rr, animationDelay: p.d }} />
        ))}
      </div>

      <header className="hdr">
        <Link href={`/l/${slug}`} aria-label="Close" className="iconbtn">
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
        </Link>
        <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em' }}>Sent</span>
        <span style={{ width: 44 }} />
      </header>

      <section style={{ padding: '18px 20px 0', textAlign: 'center', position: 'relative' }}>
        <h1 className="serif" style={{ margin: 0, fontWeight: 400, fontSize: 54, lineHeight: 0.92 }}>You made {forName}'s <span style={{ fontStyle: 'italic' }}>day</span></h1>
        <p style={{ margin: '12px 0 0', fontSize: 16 }}>Your {it.unlimited ? 'treat' : 'gift'} just landed on the list.</p>
      </section>

      <section className="st-card land">
        {it.unlimited ? (
          <div className="st-tile" style={{ background: it.color, color: ink, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '14px 16px' }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>{it.store || 'Anywhere'}</span>
            <span className="dot" style={{ alignSelf: 'center', textAlign: 'center', fontSize: 46, lineHeight: 0.95, whiteSpace: 'pre-line' }}>{it.name.split(/\s+/).slice(0, 2).join('\n').toUpperCase()}</span>
            <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span className="wide" style={{ fontSize: 17 }}>{money(it.price_cents)}</span><span style={{ fontSize: 12, fontWeight: 700 }}>A treat · unlimited</span></span>
          </div>
        ) : (
          <div className="st-tile" style={{ background: it.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {it.photo ? <img src={it.photo} alt="" className="ip-photo" /> : <ItemSketch name={it.name} size={200} ink={ink} />}
          </div>
        )}
        <div style={{ padding: '16px 16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}><Avatar user={owner} size={26} owner /> {owner.name || 'A friend'}'s list · {list.title}</div>
          <span style={{ fontSize: 20, letterSpacing: '-0.015em' }}>{it.name}</span>
          {it.unlimited ? (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span className="dot st-tick" style={{ fontSize: 30, color: '#13286B' }}>×{it.timesTreated}</span>
              <span style={{ fontSize: 14 }}>treated again and again</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="bar"><div className="st-fill" style={{ '--from': before + '%', '--to': it.pct + '%', background: it.covered ? '#2E9B47' : '#13286B' }} /></div>
              <span className="dot" style={{ flexShrink: 0, fontSize: 16 }}>{it.pct}%</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', paddingTop: 12, borderTop: '1px solid #000' }}>
            <Avatar user={giver} size={34} />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {c.note ? <span className="it" style={{ fontSize: 20, lineHeight: 1.2 }}>{c.note}</span> : <span style={{ fontSize: 15 }}>{money(c.amount_cents)}{it.unlimited && c.units > 1 ? ` · ${c.units} treats` : ''}</span>}
              <span className="muted" style={{ fontSize: 12 }}>{giver.name || 'You'} · {c.visibility} · {forName} sees your note, never the amount</span>
            </span>
          </div>
        </div>
      </section>

      <section className="st-turn later">
        <Blob seed={41} color="#93EC75" style={{ left: 0, top: 0 }} width={358} height={250} />
        <div className="st-turnin">
          <span style={{ fontSize: 26, lineHeight: 1.05, letterSpacing: '-0.02em' }}>Your turn: what would you <span className="it">love?</span></span>
          <span style={{ fontSize: 14, lineHeight: 1.35 }}>Make a list so your friends can celebrate you too.</span>
          <Link href="/lists/new" className="btn" style={{ width: 'auto', fontSize: 15, padding: '12px 22px', marginTop: 4 }}>Start my list</Link>
        </div>
      </section>
      <Link href={`/l/${slug}`} className="later" style={{ margin: '10px auto 0', fontSize: 14 }}>Maybe later, back to {forName}'s list</Link>
      <div style={{ height: 40 }} />
    </div>
  );
}
