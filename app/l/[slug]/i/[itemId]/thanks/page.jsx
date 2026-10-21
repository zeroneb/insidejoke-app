// a3: Option 13 Covered: owner-only "All covered" + thank-you to everyone who gave.
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Avatar, shortNoun, isPluralNoun, sketchKey } from '@/components/ui';
import { listBySlug, itemById } from '@/lib/lists';
import { currentUser } from '@/lib/auth';
import { all, get } from '@/lib/db';
import ThanksForm from './thanks-form';

export const dynamic = 'force-dynamic';

function confetti() {
  const C = ['#E8642C', '#FFFFFF', '#B36EE0', '#F4D3EE', '#93EC75'];
  let s = 29; const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const out = [];
  for (let i = 0; i < 22; i++) {
    const strip = i % 3 === 0;
    out.push({ x: Math.round(10 + r() * 360), y: Math.round(20 + r() * 360), r: Math.round(r() * 540 - 270) + 'deg', w: strip ? 6 : 10, h: strip ? 18 : 10, br: i % 4 === 1 ? '50%' : '0', bg: C[i % C.length], d: (r() * 0.4).toFixed(2) + 's' });
  }
  return out;
}

const Lock = () => (
  <span aria-hidden="true" style={{ position: 'absolute', right: -4, bottom: -2, width: 22, height: 22, borderRadius: '50%', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round"><path d="M5 11h14v9H5z" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
  </span>
);

export default async function ThanksPage({ params }) {
  const { slug, itemId } = await params;
  const list = await listBySlug(slug);
  if (!list) notFound();
  const it = await itemById(itemId);
  if (!it || it.list_id !== list.id) notFound();
  const me = await currentUser();
  if (!me) redirect(`/signup?next=/l/${slug}/i/${itemId}/thanks`);
  if (me.id !== list.owner_id) redirect(`/l/${slug}/i/${itemId}`);
  if (it.unlimited) redirect('/you/thanks');
  if (!it.covered) redirect(`/l/${slug}/i/${itemId}`);

  // One avatar per giver; the lock shows if all of their gifts here were private.
  const rows = await all(`SELECT u.id, u.name, u.color, u.seed, u.photo, MIN(c.created_at) AS first_at,
      SUM(CASE WHEN c.visibility = 'private' THEN 0 ELSE 1 END) AS pub, SUM(CASE WHEN c.thanked_at IS NULL THEN 1 ELSE 0 END) AS open
    FROM contributions c JOIN users u ON u.id = c.giver_id WHERE c.item_id = ? AND c.giver_id <> ? GROUP BY u.id, u.name, u.color, u.seed, u.photo ORDER BY first_at ASC`, it.id, me.id);
  const people = rows.map((r) => ({ ...r, priv: Number(r.pub) === 0 }));
  const thanked = people.length > 0 && people.every((p) => Number(p.open) === 0);
  const last = thanked ? await get("SELECT * FROM thanks WHERE item_id = ? AND kind = 'item' ORDER BY created_at DESC", it.id) : null;
  const word = shortNoun(it.name);
  const verb = isPluralNoun(word) ? 'are' : 'is';
  const status = sketchKey(it.name) === 'ticket' ? 'booked' : 'on the way';
  const n = people.length;
  const big = n > 5;

  return (
    <div style={{ minHeight: '100vh', boxSizing: 'border-box', background: '#ECECEF', color: '#000000', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <section aria-label="All covered" style={{ position: 'relative', height: 400, background: '#D8F75A', overflow: 'hidden', flexShrink: 0 }}>
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: '#13286B', clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }} />
        <div aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: 400, pointerEvents: 'none' }}>
          {confetti().map((p, i) => <span key={i} className="a3-conf" style={{ left: p.x, top: p.y, width: p.w, height: p.h, background: p.bg, borderRadius: p.br, transform: `rotate(${p.r})`, '--r': p.r, animationDelay: p.d }} />)}
        </div>
        <Link href={`/l/${slug}/i/${it.id}`} aria-label="Close" style={{ position: 'absolute', left: 8, top: 12, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#13286B" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
        </Link>
        <span className="wide" style={{ position: 'absolute', left: 20, right: 20, top: 68, fontSize: 11, letterSpacing: '0.18em', color: '#13286B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.name}</span>
        <h1 style={{ position: 'absolute', inset: 0, margin: 0, fontWeight: 400, letterSpacing: '-0.05em', lineHeight: 0.86 }}>
          <span style={{ position: 'absolute', left: 14, top: 92, fontSize: 118, color: '#13286B' }}>All</span>
          <span style={{ position: 'absolute', right: 14, bottom: 56, fontSize: 82, color: '#D8F75A' }}>covered</span>
        </h1>
        <p style={{ position: 'absolute', left: 20, right: 20, bottom: 18, margin: 0, fontSize: 15, lineHeight: 1.4, color: '#FFFFFF', textAlign: 'right' }}>Your {word} {verb} {status}. {n} {n === 1 ? 'friend' : 'friends'} got you there.</p>
      </section>

      <section aria-label="Who celebrated you" style={{ padding: '28px 20px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ margin: 0, fontWeight: 400, fontSize: 26, lineHeight: 1.05, letterSpacing: '-0.02em' }}>Who <span className="it">celebrated</span> you</h2>
        <div style={{ display: 'flex', justifyContent: n >= 4 && !big ? 'space-between' : 'flex-start', gap: n >= 4 && !big ? 8 : 14, flexWrap: big ? 'wrap' : 'nowrap' }}>
          {people.map((p) => (
            <Link key={p.id} href={`/u/${p.id}`} aria-label={`${p.name}'s profile${p.priv ? ', gave privately' : ''}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textDecoration: 'none', width: 76, padding: '4px 0', color: '#000000' }}>
              <span style={{ position: 'relative', width: 64, height: 64, display: 'block' }}>
                <Avatar user={p} size={64} />
                {p.priv ? <Lock /> : null}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, maxWidth: 76, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(p.name || 'A friend').split(/\s+/)[0]}</span>
            </Link>
          ))}
        </div>
        {people.some((p) => p.priv) ? <span style={{ fontSize: 13, color: '#4A4A4A' }}>The lock means they chipped in privately. Only you know.</span> : null}
      </section>

      <div aria-hidden="true" style={{ marginTop: 28, overflow: 'hidden', whiteSpace: 'nowrap', background: '#13286B', color: '#D8F75A', padding: '8px 0' }}><span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em' }}>{Array.from({ length: 8 }, () => 'Say thanks').join(' · ')}</span></div>

      <ThanksForm slug={slug} itemId={it.id} word={word} count={n} already={thanked ? { count: last?.recipients ?? n, photo: !!last?.photo } : null} listHref={`/l/${slug}`} />
      <div style={{ height: 36 }} />
    </div>
  );
}
