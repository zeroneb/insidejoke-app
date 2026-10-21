import Link from 'next/link';
import { all, get } from '@/lib/db';
import { itemsFor } from '@/lib/lists';
import { Blob } from '@/components/ui';

// a1/r1: list tiles from the Option 10 Home / You / FriendProfile boards.
// Kinds: own wish list (blob title), collab ("COLLAB · WITH <name>"), surprise ("SECRET FROM <name>", cake),
// treat list (every item unlimited: spinning diamond). Never shows amounts.

const OWN = [
  { bg: '#E8642C', ink: '#FFFFFF', blob: '#D8F75A', title: '#000000', circle: '#13286B', circleInk: '#13286B' },
  { bg: '#13286B', ink: '#FFFFFF', blob: '#F4D3EE', title: '#E2452B', circle: '#E8642C', circleInk: '#FFFFFF' },
  { bg: '#B36EE0', ink: '#FFFFFF', blob: '#D8F75A', title: '#13286B', circle: '#13286B', circleInk: '#FFFFFF' },
  { bg: '#F4D3EE', ink: '#E2452B', blob: '#E8642C', title: '#000000', circle: '#E2452B', circleInk: '#E2452B' }
];
const TREAT = [
  { bg: '#96E084', ink: '#000000', dia: '#E8642C', title: '#000000' },
  { bg: '#E8642C', ink: '#FFFFFF', dia: '#96E084', title: '#000000' }
];
const VIS = { public: 'Public', private: 'Private', friends: 'Friends' };

// Everything a tile needs, computed once per list.
export async function tileData(list, viewerId) {
  const items = await itemsFor(list.id);
  const wishes = items.filter((i) => !i.unlimited);
  const treatsOnly = items.length > 0 && wishes.length === 0;
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

function SerifTitle({ title, color, size }) {
  const words = title.trim().split(/\s+/);
  const last = words.pop();
  return (
    <span className="serif" style={{ position: 'relative', alignSelf: 'center', textAlign: 'center', color, fontSize: Math.min(size, Math.floor(size * 9 / Math.max(9, ...title.trim().split(/\s+/).map((w) => w.length)))), lineHeight: 0.95, marginTop: size > 26 ? -10 : -6, maxWidth: '100%', overflowWrap: 'normal', hyphens: 'none' }}>
      {words.length ? <>{words.join(' ')}<br /></> : null}<span style={{ fontWeight: 600 }}>{last}</span>
    </span>
  );
}

function Cake({ style = { right: 8, bottom: 44 }, w = 96, h = 104, sparkle = false }) {
  return (
    <svg aria-hidden="true" style={{ position: 'absolute', ...style }} width={w} height={h} viewBox="0 0 120 140" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 128 C40 132 82 132 104 127" />
      <path d="M24 126 C23 112 24 100 26 88 C48 84 76 84 98 87 C100 100 100 113 99 126" />
      <path d="M30 86 C30 77 31 70 33 64 C50 60 72 60 90 63 C92 71 92 79 92 86" />
      <path d="M26 92 C34 98 40 92 46 98 C52 104 58 96 64 101 C70 106 78 97 84 102 C90 106 96 99 99 95" strokeWidth="2" />
      <path d="M33 70 C40 75 46 69 52 74 C58 79 64 71 70 76 C76 80 84 72 91 76" strokeWidth="2" />
      <path d="M34 108 L40 122 M46 108 L52 122 M58 108 L64 122 M70 108 L76 122 M82 108 L88 122" strokeWidth="1.6" />
      <path d="M46 60 L45 42 M61 59 L61 38 M76 60 L77 42" />
      <path d="M45 36 C41 31 44 26 45 22 C48 27 50 31 45 36 Z M61 32 C57 27 60 21 61 17 C64 22 66 27 61 32 Z M77 36 C73 31 76 26 77 22 C80 27 82 31 77 36 Z" strokeWidth="2" />
      {sparkle ? <path d="M14 40 L20 46 M20 40 L14 46 M102 24 L106 34 M98 30 L110 28 M96 52 L100 56" strokeWidth="1.8" /> : null}
    </svg>
  );
}

function Bouquet({ ink = '#FFFFFF', style = { right: 10, bottom: 44 }, w = 88, h = 112, sparkle = false }) {
  return (
    <svg aria-hidden="true" style={{ position: 'absolute', ...style }} width={w} height={h} viewBox="0 0 110 150" fill="none" stroke={ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M30 92 C29 108 31 128 34 142 C48 145 64 145 76 141 C80 126 81 108 79 92 C64 89 44 89 30 92 Z" />
      <path d="M27 91 C44 85 66 84 83 89" strokeWidth="1.8" />
      <path d="M36 110 L75 108 M37 122 L75 121 M38 133 L73 133 M47 95 L48 141 M61 94 L62 142" strokeWidth="1.6" />
      <path d="M50 90 C48 70 44 55 36 42 M56 90 C57 68 60 50 70 36 M53 90 C53 70 54 54 54 32" />
      <path d="M28 42 C23 30 30 21 36 26 C40 19 47 23 45 33 C43 42 33 47 28 42 Z" />
      <path d="M64 37 C61 25 69 18 74 24 C80 19 85 28 81 36 C77 43 67 43 64 37 Z" />
      <path d="M48 31 C45 18 52 11 56 16 C60 11 65 18 62 28 C60 35 51 36 48 31 Z" />
      <path d="M50 74 C40 68 35 59 37 54 C46 55 51 64 50 74 M57 67 C66 60 73 57 76 60 C71 67 62 69 57 67" />
      {sparkle ? <path d="M88 14 L92 22 M98 22 L90 26 M86 28 L90 26" strokeWidth="1.8" /> : null}
    </svg>
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

  if (t.kind === 'collab') {
    const w = t.others[0] ? firstName(t.others[0].name) : null;
    const names = ['You', ...t.others.slice(0, 2).map((o) => firstName(o.name))];
    return (
      <Link href={href} aria-label={`${t.title}, collab${w ? ' with ' + w : ''}`} style={{ ...base, justifyContent: 'space-between', background: '#F4D3EE', color: '#E2452B', borderTop: '1.5px solid #E2452B', borderBottom: '1.5px solid #E2452B' }}>
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
      <Link href={href} aria-label={`${t.title}, surprise hidden from ${who}, with ${t.givers} friends, ${t.pct}% covered`} style={{ ...base, background: '#A9CDF5', color: '#FFFFFF' }}>
        <div aria-hidden="true" style={{ position: 'absolute', right: 10, top: 10, width: 12, height: 12, borderRadius: '50%', background: '#C8743A' }} />
        <Cake style={{ right: 2, bottom: 32 }} w={104} h={122} sparkle />
        <span style={{ ...plainCap, color: '#8A4E20' }}>Surprise · hidden from {who}</span>
        <span className="wide" style={{ position: 'relative', marginTop: 8, fontSize: 21, letterSpacing: '0.06em', lineHeight: 1.05, maxWidth: '90%', overflowWrap: 'anywhere' }}>{t.title}</span>
        <span style={{ position: 'relative', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', color: '#8A4E20' }}><span style={{ fontSize: 11, fontWeight: 700 }}>with {t.givers} {t.givers === 1 ? 'friend' : 'friends'}</span><span className="dot" style={{ fontSize: 16 }}>{t.pct}%</span></span>
      </Link>
    );
  }

  if (t.kind === 'treat') {
    const c = TREAT[i % TREAT.length];
    const words = t.title.replace(/[^\p{L}\p{N}\s']/gu, ' ').trim().split(/\s+/).filter(Boolean).slice(0, 3);
    const lines = words.length <= 1 ? ['TREAT', '\u00a0 TREAT', 'TREAT'] : words.map((w) => w.toUpperCase());
    if (v === 'friend') {
      return (
        <Link href={href} aria-label={`${t.title}, ${vis}, unlimited, ${t.count} treats`} style={{ ...base, justifyContent: 'space-between', background: c.bg, color: c.ink }}>
          <div aria-hidden="true" style={{ position: 'absolute', left: 40, top: 46, width: 84, height: 84, background: c.dia, transform: 'rotate(45deg)' }} />
          <span style={plainCap}>{vis} · unlimited</span>
          <span className="dot" style={{ position: 'relative', alignSelf: 'center', textAlign: 'center', color: c.title, fontSize: 26, lineHeight: 0.95, whiteSpace: 'pre-line' }}>{lines.join('\n')}</span>
          <span style={plainCap}>{foot ? foot[0] : `${t.count} ${t.count === 1 ? 'treat' : 'treats'}`}</span>
        </Link>
      );
    }
    const home = v === 'home';
    return (
      <Link href={href} aria-label={`${t.title}, ${vis}, unlimited`} style={{ ...base, justifyContent: 'space-between', background: c.bg, color: c.ink }}>
        <div aria-hidden="true" className="spinslow" style={{ position: 'absolute', left: home ? 34 : 44, top: 54, width: home ? 96 : 86, height: home ? 96 : 86, background: c.dia, transform: 'rotate(45deg)' }} />
        {home ? <span style={plainCap}>{vis} · unlimited</span> : <span className="wide" style={CAP}>{vis} · unlimited</span>}
        <span className="dot" style={{ position: 'relative', alignSelf: 'center', textAlign: 'center', color: c.title, fontSize: home ? 30 : 26, lineHeight: 0.95, whiteSpace: 'pre-line' }}>{lines.join('\n')}</span>
        {home ? (
          <span aria-hidden="true" style={{ position: 'relative', display: 'flex', gap: 1 }}>
            {['a1', 'a2', 'a3'].map((k) => <svg key={k} className={k} width="14" height="16" viewBox="0 0 30 34"><path d="M0 0 L30 17 L0 34 Z" fill={c.ink} /></svg>)}
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

  const c = OWN[i % OWN.length];
  if (v === 'home' || v === 'friend') {
    const home = v === 'home';
    const tail = home ? `${t.covered} covered` : t.fresh ? `+${t.fresh} new` : `${t.pct}%`;
    return (
      <Link href={href} aria-label={`${t.title}, ${vis}, ${things}, ${home ? `${t.covered} covered` : tail}`} style={{ ...base, justifyContent: 'space-between', background: c.bg, color: c.ink }}>
        {home ? <div aria-hidden="true" style={{ position: 'absolute', right: -50, bottom: -40, width: 150, height: 150, borderRadius: '50%', background: c.circle }} /> : null}
        <span style={{ ...plainCap, color: home ? c.circleInk : c.ink }}>{vis} · {things}</span>
        <Blob seed={5 + i * 22} color={c.blob} width={200} height={home ? 140 : 120} style={{ left: -14, top: home ? 44 : 40 }} />
        <SerifTitle title={t.title} color={c.title} size={home ? 27 : 25} />
        <span className="dot" style={{ position: 'relative', alignSelf: 'flex-end', fontSize: home ? 16 : 15 }}>{foot ? foot[1] : tail}</span>
      </Link>
    );
  }
  return (
    <Link href={href} aria-label={`${t.title}, ${vis}, ${things}, ${t.covered} covered`} style={{ ...base, justifyContent: 'space-between', background: c.bg, color: c.ink }}>
      <Blob seed={5 + i * 22} color={c.blob} width={190} height={130} style={{ left: -8, top: 30 }} />
      <span className="wide" style={CAP}>{vis} · {things}</span>
      <SerifTitle title={t.title} color={c.title} size={25} />
      <span style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 12, fontWeight: 700 }}>{foot ? foot[0] : 'covered'}</span>
        <span className="dot" style={{ fontSize: 16 }}>{foot ? foot[1] : `${t.covered} / ${t.wishCount}`}</span>
      </span>
    </Link>
  );
}
