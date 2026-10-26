// r3: Option 10 Covered. Owner-only "All covered!" + one thank-you text to everyone who gave.
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Avatar, ItemSketch, shortNoun, isPluralNoun, sketchKey } from '@/components/ui';
import { listBySlug, itemById } from '@/lib/lists';
import { currentUser } from '@/lib/auth';
import { all, get } from '@/lib/db';
import ThanksForm from './thanks-form';

export const dynamic = 'force-dynamic';

function confetti() {
  const colors = ['#EE6A2F', '#D8F75A', '#FFFFFF', '#B36EE0', '#000000'];
  const out = [];
  for (let i = 0; i < 16; i++) {
    const sq = i % 3 === 0;
    out.push({ x: Math.round((i * 47 + 14) % 350), w: sq ? 10 : 6, h: sq ? 10 : 16, r: sq ? '50%' : '3px', color: colors[i % colors.length], d: (-(i * 0.41) % 4).toFixed(2) + 's', dur: (3.4 + (i % 4) * 0.5).toFixed(1) + 's' });
  }
  return out;
}

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

  // One chip per giver; the lock shows if all of their gifts here were private.
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
  const what = `${it.store && it.store.length <= 16 && !word.includes(it.store.toLowerCase()) ? it.store + ' ' : ''}${word}`;

  return (
    <div className="r3-full" style={{ background: 'var(--ground, #ECECEF)', color: 'var(--ink, #000000)', display: 'flex', flexDirection: 'column', position: 'relative', flexGrow: 1 }}>
      <section aria-label="All covered" style={{ position: 'relative', background: 'var(--lt, #5FC3D9)', border: '12px solid #D8403A', height: 430, overflow: 'hidden', flexShrink: 0 }}>
        {confetti().map((c, i) => (
          <div key={i} aria-hidden="true" className="r3-fall" style={{ position: 'absolute', left: c.x, top: 0, width: c.w, height: c.h, borderRadius: c.r, background: c.color, animationDelay: c.d, animationDuration: c.dur }} />
        ))}
        <Link href={`/l/${slug}/i/${it.id}`} aria-label="Close" style={{ position: 'relative', zIndex: 2, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
        </Link>
        <h1 style={{ position: 'relative', zIndex: 1, margin: 0, padding: '0 10px', fontWeight: 700, fontSize: 60, lineHeight: 0.88, letterSpacing: '-0.055em', color: '#EE6A2F' }}>All<br />covered!</h1>
        {it.photo ? <img src={`/api/photo/${it.id}`} alt={it.name} style={{ position: 'absolute', right: 14, top: 140, width: 180, height: 180, objectFit: 'contain', background: 'var(--surface, #FFFFFF)', padding: 10, boxSizing: 'border-box' }} /> : <span style={{ position: 'absolute', right: 6, top: 140, display: 'block' }}><ItemSketch name={it.name} size={200} strokeWidth={1.6} /></span>}
        <p style={{ position: 'absolute', left: 10, bottom: 12, margin: 0, maxWidth: 200, fontSize: 16, lineHeight: 1.35, color: 'var(--warm-ink, #5A1A08)' }}>Your {what} {verb} {status}. {n} {n === 1 ? 'friend' : 'friends'} got you there.</p>
      </section>

      <section aria-label="Who celebrated you" style={{ padding: '22px 20px 0', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ margin: '0 0 6px', fontFamily: "'EB Garamond', serif", fontWeight: 400, fontSize: 30 }}>Who <span style={{ fontWeight: 600 }}>celebrated you</span></h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingTop: 6 }}>
          {people.map((p) => (
            <Link key={p.id} href={`/u/${p.id}`} aria-label={`${p.name || 'A friend'}${p.priv ? ', gave privately' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--edge, #000000)', padding: '4px 10px 4px 4px', borderRadius: 999, fontSize: 14, color: 'var(--ink, #000000)', textDecoration: 'none' }}>
              <Avatar user={p} size={24} />
              {(p.name || 'A friend').split(/\s+/)[0]}
              {p.priv ? <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="2.4" strokeLinecap="round"><path d="M5 11h14v9H5z" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg> : null}
            </Link>
          ))}
        </div>
        {people.some((p) => p.priv) ? <span style={{ paddingTop: 10, fontWeight: 500, fontSize: 12, color: 'var(--sub, #2A2A2A)' }}>Lock means they contributed privately. Only you can see it.</span> : null}
      </section>

      <ThanksForm slug={slug} itemId={it.id} word={word} count={n} already={thanked ? { count: last?.recipients ?? n, photo: !!last?.photo } : null} listHref={`/l/${slug}`} />
      <div style={{ height: 36 }} />
    </div>
  );
}
