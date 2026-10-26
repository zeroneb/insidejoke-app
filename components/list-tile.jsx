import Link from 'next/link';
import { all, get } from '@/lib/db';
import { itemsFor } from '@/lib/lists';
import { Blob } from '@/components/ui';
import CoverDesign from '@/components/cover-design';
import { parse as parseDesign } from '@/lib/cover-designs';

// a1/r1: list tiles from the Option 10 Home / You / FriendProfile boards.
// Kinds: own wish list (blob title), collab ("COLLAB · WITH <name>"), surprise ("SECRET FROM <name>", cake),
// treat list (every item unlimited: spinning diamond). Never shows amounts.

import { OWN, TREAT, coverIndex } from '@/lib/cover';
import { Cake, Bouquet, PhotoShape } from '@/components/cover-art';
const VIS = { public: 'Public', private: 'Private', friends: 'Friends' };

// Everything a tile needs, computed once per list.
export async function tileData(list, viewerId) {
  const items = await itemsFor(list.id);
  const wishes = items.filter((i) => !i.unlimited);
  const treatsOnly = !!list.treats || (items.length > 0 && wishes.length === 0);
  const sent = items.filter((i) => i.unlimited).reduce((n, i) => n + (i.timesTreated || 0), 0);
  const covered = wishes.filter((i) => i.covered).length;
  const target = wishes.reduce((n, i) => n + i.target, 0);
  const raised = wishes.reduce((n, i) => n + Math.min(i.raised, i.target), 0);
  const pct = target ? Math.min(100, Math.floor((raised / target) * 100)) : 0;
  const givers = (await get('SELECT COUNT(DISTINCT giver_id) AS n FROM contributions WHERE list_id = ?', list.id)).n;
  const team = list.for_who === 'other'
    ? await all("SELECT u.id, u.name FROM list_members m JOIN users u ON u.id = m.user_id WHERE m.list_id = ? AND m.role <> 'viewer' UNION SELECT u.id, u.name FROM users u WHERE u.id = ?", list.id, list.owner_id)
    : [];
  const others = team.filter((u) => u.id !== viewerId);
  const kind = list.surprise ? 'surprise' : list.for_who === 'other' ? 'collab' : treatsOnly ? 'treat' : 'own';
  const fresh = items.filter((i) => i.created_at > Date.now() - 7 * 24 * 3600 * 1000).length;
  return { ...list, kind, count: items.length, covered, wishCount: wishes.length, sent, pct, givers, others, fresh };
}

const firstName = (n) => (n || '').trim().split(/\s+/)[0] || 'a friend';

// Same type as the list page title: first words in tight sans, last word in wide caps.
function SerifTitle({ title, color, size }) {
  const words = title.trim().split(/\s+/);
  const last = words.pop() || '';
  const caps = Math.max(13, Math.min(Math.round(size * 0.85), Math.floor(150 / (Math.max(1, last.length) * 0.86))));
  return (
    <span style={{ position: 'relative', alignSelf: 'center', textAlign: 'center', color, lineHeight: 0.95, marginTop: size > 26 ? -10 : -6, maxWidth: '100%' }}>
      {words.length ? <span style={{ display: 'block', fontFamily: "'Inter Tight', sans-serif", fontSize: Math.min(size * 1.05, Math.floor(size * 12 / Math.max(12, words.join(' ').length))), letterSpacing: '-0.045em' }}>{words.join(' ')}</span> : null}
      <span className="wide" style={{ display: 'block', fontSize: caps, letterSpacing: '0.01em', marginTop: 2 }}>{last}</span>
    </span>
  );
}

const CAP = { position: 'relative', fontSize: 10, letterSpacing: '0.1em', fontStretch: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' };
const FOOT = { position: 'relative', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' };

// t: from tileData. i: index among tiles of the same kind (picks the color).
// variant (Option 10 boards): 'home' (230px, Home), 'you' (200px, You), 'friend' (200px, FriendProfile).
// `big` is kept for older callers: big=false means 'you'.
export function ListTile({ t, i = 0, big = true, variant, foot }) {
  const v = variant || (big ? 'home' : 'you');
  const h = v === 'home' ? 230 : 200;
  const things = `${t.count} ${t.count === 1 ? 'thing' : 'things'}`;
  const vis = VIS[t.visibility] || 'Public';
  const base = { position: 'relative', height: h, textDecoration: 'none', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 12, boxSizing: 'border-box' };
  const href = `/l/${t.slug}`;
  const plainCap = { position: 'relative', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' };

  // v1 covers: the list's own cover, filling the tile.
  const design = parseDesign(t.design);
  if (design) {
    return (
      <Link href={href} aria-label={`${t.title}, ${things}`} style={{ ...base, padding: 0 }}>
        <CoverDesign design={design} title={t.title} fluid height={h} label={t.title} ctx={{ visibility: t.visibility, recipient: t.recipient_name || null, people: ['You', ...t.others.slice(0, 2).map((o) => firstName(o.name))], photo: t.photo || null }} />
        {foot ? <span style={{ position: 'absolute', left: 8, bottom: 8, background: 'var(--surface, #FFFFFF)', color: 'var(--ink, #000000)', fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 999 }}>{foot[0]}</span> : null}
      </Link>
    );
  }

  if (t.kind === 'collab') {
    const w = t.others[0] ? firstName(t.others[0].name) : null;
    const names = ['You', ...t.others.slice(0, 2).map((o) => firstName(o.name))];
    return (
      <Link href={href} aria-label={`${t.title}, collab${w ? ' with ' + w : ''}`} style={{ ...base, justifyContent: 'space-between', background: 'var(--lt, #F4D3EE)', color: '#E2452B', borderTop: '1.5px solid #E2452B', borderBottom: '1.5px solid #E2452B' }}>
        {t.photo ? <PhotoShape src={t.photo} size={150} color="#FFFFFF" style={{ right: -36, top: 40 }} /> : null}
        <Bouquet ink="#E2452B" style={{ right: -4, top: 34 }} w={116} h={158} sparkle />
        <span style={{ ...plainCap, letterSpacing: '0.08em', textTransform: 'uppercase', fontStyle: 'italic' }}>Collab ✦ Collab</span>
        <span style={{ position: 'relative', fontFamily: "'Archivo', sans-serif", fontStretch: '62%', fontWeight: 900, fontSize: 36, lineHeight: 0.88, textTransform: 'uppercase', maxWidth: '70%', overflowWrap: 'anywhere' }}>{t.title}</span>
        <span style={{ position: 'relative', display: 'flex' }}>
          {names.map((n, k) => <span key={k} style={{ border: '1.5px solid #E2452B', borderRadius: 999, padding: '5px 12px', fontWeight: 800, fontSize: 13, marginLeft: k ? -1.5 : 0 }}>{n}</span>)}
        </span>
      </Link>
    );
  }

  if (t.kind === 'surprise') {
    const who = firstName(t.recipient_name);
    return (
      <Link href={href} aria-label={`${t.title}, surprise hidden from ${who}, with ${t.givers} friends, ${t.pct}% covered`} style={{ ...base, background: 'var(--lt, #A9CDF5)', color: '#000000' }}>
        <div aria-hidden="true" style={{ position: 'absolute', right: 10, top: 10, width: 12, height: 12, borderRadius: '50%', background: 'var(--lt, #C8743A)' }} />
        {t.photo ? <PhotoShape src={t.photo} size={150} color="#E7B48A" style={{ right: -40, bottom: -30 }} /> : null}
        <Cake style={{ right: 2, bottom: 32 }} w={104} h={122} sparkle />
        <span style={{ ...plainCap, color: 'var(--warm-ink, #8A4E20)' }}>Surprise · hidden from {who}</span>
        <span className="wide" style={{ position: 'relative', marginTop: 8, fontSize: 21, letterSpacing: '0.06em', lineHeight: 1.05, maxWidth: '90%', overflowWrap: 'anywhere' }}>{t.title}</span>
        <span style={{ position: 'relative', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', color: 'var(--warm-ink, #8A4E20)' }}><span style={{ fontSize: 11, fontWeight: 700 }}>with {t.givers} {t.givers === 1 ? 'friend' : 'friends'}</span><span className="dot" style={{ fontSize: 16 }}>{t.pct}%</span></span>
      </Link>
    );
  }

  if (t.kind === 'treat') {
    const c = TREAT[coverIndex(t) % TREAT.length];
    const words = t.title.replace(/[^\p{L}\p{N}\s']/gu, ' ').trim().split(/\s+/).filter(Boolean).slice(0, 3);
    const lines = words.length <= 1 ? ['TREAT', '\u00a0 TREAT', 'TREAT'] : words.map((w) => w.toUpperCase());
    if (v === 'friend') {
      return (
        <Link href={href} aria-label={`${t.title}, ${vis}, unlimited, ${t.count} treats`} style={{ ...base, justifyContent: 'space-between', background: c.bg, color: c.ink }}>
          {t.photo ? <PhotoShape src={t.photo} shape="diamond" size={84} color={c.dia} style={{ left: 40, top: 46 }} />
            : <div aria-hidden="true" style={{ position: 'absolute', left: 40, top: 46, width: 84, height: 84, background: c.dia, transform: 'rotate(45deg)' }} />}
          <span style={plainCap}>{vis} · unlimited</span>
          <span className="dot" style={{ position: 'relative', alignSelf: 'center', textAlign: 'center', color: c.title, fontSize: 26, lineHeight: 0.95, whiteSpace: 'pre-line' }}>{lines.join('\n')}</span>
          <span style={plainCap}>{foot ? foot[0] : `${t.count} ${t.count === 1 ? 'treat' : 'treats'}`}</span>
        </Link>
      );
    }
    const home = v === 'home';
    return (
      <Link href={href} aria-label={`${t.title}, ${vis}, unlimited`} style={{ ...base, justifyContent: 'space-between', background: c.bg, color: c.ink }}>
        {t.photo ? <PhotoShape src={t.photo} shape="diamond" size={home ? 96 : 86} color={c.dia} style={{ left: home ? 34 : 44, top: 54 }} />
          : <div aria-hidden="true" className="spinslow" style={{ position: 'absolute', left: home ? 34 : 44, top: 54, width: home ? 96 : 86, height: home ? 96 : 86, background: c.dia, transform: 'rotate(45deg)' }} />}
        {home ? <span style={plainCap}>{vis} · unlimited</span> : <span className="wide" style={CAP}>{vis} · unlimited</span>}
        <span className="dot" style={{ position: 'relative', alignSelf: 'center', textAlign: 'center', color: c.title, fontSize: home ? 30 : 26, lineHeight: 0.95, whiteSpace: 'pre-line' }}>{lines.join('\n')}</span>
        {home ? (
          <span aria-hidden="true" style={{ position: 'relative', display: 'flex', gap: 1 }}>
            {['a1', 'a2', 'a3'].map((k) => <svg key={k} className={k} width="14" height="16" viewBox="0 0 30 34"><path d="M0 0 L30 17 L0 34 Z" fill="var(--ink, #000000)" /></svg>)}
          </span>
        ) : (
          <span style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>{foot ? foot[0] : 'sent so far'}</span>
            <span className="dot" style={{ fontSize: 16 }}>{foot ? foot[1] : `×${t.sent}`}</span>
          </span>
        )}
      </Link>
    );
  }

  const ci = coverIndex(t);
  const c = OWN[ci % OWN.length];
  if (v === 'home' || v === 'friend') {
    const home = v === 'home';
    const tail = home ? `${t.covered} covered` : t.fresh ? `+${t.fresh} new` : `${t.pct}%`;
    return (
      <Link href={href} aria-label={`${t.title}, ${vis}, ${things}, ${home ? `${t.covered} covered` : tail}`} style={{ ...base, justifyContent: 'space-between', background: c.bg, color: c.ink }}>
        {t.photo ? <PhotoShape src={t.photo} size={150} color={c.circle} style={{ right: -50, bottom: -40 }} />
          : home ? <div aria-hidden="true" style={{ position: 'absolute', right: -50, bottom: -40, width: 150, height: 150, borderRadius: '50%', background: c.circle }} /> : null}
        <span style={{ ...plainCap, color: home ? c.circleInk : c.ink }}>{vis} · {things}</span>
        <Blob seed={5 + (ci % OWN.length) * 22} color={c.blob} width={200} height={home ? 140 : 120} style={{ left: -14, top: home ? 44 : 40 }} />
        <SerifTitle title={t.title} color={c.title} size={home ? 27 : 25} />
        <span className="dot" style={{ position: 'relative', alignSelf: 'flex-end', fontSize: home ? 16 : 15 }}>{foot ? foot[1] : tail}</span>
      </Link>
    );
  }
  return (
    <Link href={href} aria-label={`${t.title}, ${vis}, ${things}, ${t.covered} covered`} style={{ ...base, justifyContent: 'space-between', background: c.bg, color: c.ink }}>
      {t.photo ? <PhotoShape src={t.photo} size={140} color={c.blob} style={{ right: -46, bottom: -36 }} /> : null}
      <Blob seed={5 + (ci % OWN.length) * 22} color={c.blob} width={190} height={130} style={{ left: -8, top: 30 }} />
      <span className="wide" style={CAP}>{vis} · {things}</span>
      <SerifTitle title={t.title} color={c.title} size={25} />
      <span style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 12, fontWeight: 700 }}>{foot ? foot[0] : 'covered'}</span>
        <span className="dot" style={{ fontSize: 16 }}>{foot ? foot[1] : `${t.covered} / ${t.wishCount}`}</span>
      </span>
    </Link>
  );
}
