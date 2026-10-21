import Link from 'next/link';
import { all, get } from '@/lib/db';
import { itemsFor } from '@/lib/lists';
import { Blob } from '@/components/ui';

// a1: list tiles from the Option 13 Home / You / FriendProfile boards.
// Kinds: own wish list (blob title), collab ("COLLAB · WITH <name>"), surprise ("SECRET FROM <name>", cake),
// treat list (every item unlimited: spinning diamond). Never shows amounts.

const OWN = [
  { bg: '#E8642C', ink: '#FFFFFF', blob: '#D8F75A', title: '#000000' },
  { bg: '#13286B', ink: '#FFFFFF', blob: '#F4D3EE', title: '#E2452B' },
  { bg: '#B36EE0', ink: '#FFFFFF', blob: '#D8F75A', title: '#13286B' },
  { bg: '#F4D3EE', ink: '#E2452B', blob: '#E8642C', title: '#000000' }
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
  return { ...list, kind, count: items.length, covered, wishCount: wishes.length, sent, pct, givers, others };
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

function Cake() {
  return (
    <svg aria-hidden="true" style={{ position: 'absolute', right: 8, bottom: 44 }} width="96" height="104" viewBox="0 0 120 140" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 128 C40 132 82 132 104 127" />
      <path d="M24 126 C23 112 24 100 26 88 C48 84 76 84 98 87 C100 100 100 113 99 126" />
      <path d="M30 86 C30 77 31 70 33 64 C50 60 72 60 90 63 C92 71 92 79 92 86" />
      <path d="M26 92 C34 98 40 92 46 98 C52 104 58 96 64 101 C70 106 78 97 84 102 C90 106 96 99 99 95" strokeWidth="2" />
      <path d="M33 70 C40 75 46 69 52 74 C58 79 64 71 70 76 C76 80 84 72 91 76" strokeWidth="2" />
      <path d="M34 108 L40 122 M46 108 L52 122 M58 108 L64 122 M70 108 L76 122 M82 108 L88 122" strokeWidth="1.6" />
      <path d="M46 60 L45 42 M61 59 L61 38 M76 60 L77 42" />
      <path d="M45 36 C41 31 44 26 45 22 C48 27 50 31 45 36 Z M61 32 C57 27 60 21 61 17 C64 22 66 27 61 32 Z M77 36 C73 31 76 26 77 22 C80 27 82 31 77 36 Z" strokeWidth="2" />
    </svg>
  );
}

function Bouquet() {
  return (
    <svg aria-hidden="true" style={{ position: 'absolute', right: 10, bottom: 44 }} width="88" height="112" viewBox="0 0 110 150" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M30 92 C29 108 31 128 34 142 C48 145 64 145 76 141 C80 126 81 108 79 92 C64 89 44 89 30 92 Z" />
      <path d="M27 91 C44 85 66 84 83 89" strokeWidth="1.8" />
      <path d="M36 110 L75 108 M37 122 L75 121 M38 133 L73 133 M47 95 L48 141 M61 94 L62 142" strokeWidth="1.6" />
      <path d="M50 90 C48 70 44 55 36 42 M56 90 C57 68 60 50 70 36 M53 90 C53 70 54 54 54 32" />
      <path d="M28 42 C23 30 30 21 36 26 C40 19 47 23 45 33 C43 42 33 47 28 42 Z" />
      <path d="M64 37 C61 25 69 18 74 24 C80 19 85 28 81 36 C77 43 67 43 64 37 Z" />
      <path d="M48 31 C45 18 52 11 56 16 C60 11 65 18 62 28 C60 35 51 36 48 31 Z" />
      <path d="M50 74 C40 68 35 59 37 54 C46 55 51 64 50 74 M57 67 C66 60 73 57 76 60 C71 67 62 69 57 67" />
    </svg>
  );
}

const CAP = { position: 'relative', fontSize: 10, letterSpacing: '0.1em', fontStretch: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' };
const FOOT = { position: 'relative', marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' };

// t: from tileData. i: index among tiles of the same kind (picks the color). big: Home (230px) vs profile (200px).
// foot: optional override for the bottom row, e.g. ['since you looked', '+1'].
export function ListTile({ t, i = 0, big = true, foot }) {
  const h = big ? 230 : 200;
  const things = `${t.count} ${t.count === 1 ? 'thing' : 'things'}`;
  const base = { position: 'relative', height: h, textDecoration: 'none', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 12, boxSizing: 'border-box' };
  const href = `/l/${t.slug}`;

  if (t.kind === 'collab') {
    const w = t.others[0] ? firstName(t.others[0].name) : null;
    const names = ['You', ...t.others.slice(0, 2).map((o) => firstName(o.name))];
    return (
      <Link href={href} aria-label={`${t.title}, collab${w ? ' with ' + w : ''}`} style={{ ...base, background: '#E2452B', color: '#FFFFFF' }}>
        <span className="wide" style={CAP}>Collab{w ? ` · with ${w}` : ''}</span>
        <span style={{ position: 'relative', marginTop: 10, fontFamily: "'Archivo', sans-serif", fontStretch: '62%', fontWeight: 900, fontSize: 40, lineHeight: 0.86, textTransform: 'uppercase', color: '#F4D3EE', maxWidth: '62%', overflowWrap: 'anywhere' }}>{t.title}</span>
        <Bouquet />
        <span style={{ position: 'relative', marginTop: 'auto', display: 'flex' }}>
          {names.map((n, k) => <span key={k} style={{ border: '1.5px solid #FFFFFF', borderRadius: 999, padding: '5px 11px', fontWeight: 800, fontSize: 12, marginLeft: k ? -1.5 : 0 }}>{n}</span>)}
        </span>
      </Link>
    );
  }

  if (t.kind === 'surprise') {
    const who = firstName(t.recipient_name);
    return (
      <Link href={href} aria-label={`${t.title}, surprise with ${t.givers} friends, ${t.pct}% covered`} style={{ ...base, background: '#A9CDF5', color: '#13286B' }}>
        <span className="wide" style={CAP}>Secret from {who}</span>
        <span className="wide" style={{ position: 'relative', marginTop: 10, fontSize: 22, letterSpacing: '0.04em', lineHeight: 1.02, maxWidth: '90%', overflowWrap: 'anywhere' }}>{t.title}</span>
        <Cake />
        <span style={FOOT}><span style={{ fontSize: 12, fontWeight: 700 }}>{t.givers} {t.givers === 1 ? 'friend' : 'friends'} in</span><span className="dot" style={{ fontSize: 18 }}>{t.pct}%</span></span>
      </Link>
    );
  }

  if (t.kind === 'treat') {
    const c = TREAT[i % TREAT.length];
    const words = t.title.replace(/[^\p{L}\p{N}\s']/gu, ' ').trim().split(/\s+/).filter(Boolean).slice(0, 3);
    const lines = words.length <= 1 ? ['TREAT', '  TREAT', 'TREAT'] : words.map((w) => w.toUpperCase());
    const ds = big ? 100 : 86;
    return (
      <Link href={href} aria-label={`${t.title}, ${VIS[t.visibility] || 'Public'}, unlimited`} style={{ ...base, justifyContent: 'space-between', background: c.bg, color: c.ink }}>
        <div aria-hidden="true" className="spin405" style={{ position: 'absolute', left: big ? 38 : 44, top: big ? 60 : 54, width: ds, height: ds, background: c.dia, transform: 'rotate(45deg)' }} />
        <span className="wide" style={CAP}>{VIS[t.visibility] || 'Public'} · unlimited</span>
        <span className="dot" style={{ position: 'relative', alignSelf: 'center', textAlign: 'center', color: c.title, fontSize: big ? 30 : 26, lineHeight: 0.95, whiteSpace: 'pre-line' }}>{lines.join('\n')}</span>
        <span style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 12, fontWeight: 700 }}>{foot ? foot[0] : 'sent so far'}</span>
          <span className="dot" style={{ fontSize: big ? 18 : 16 }}>{foot ? foot[1] : `×${t.sent}`}</span>
        </span>
      </Link>
    );
  }

  const c = OWN[i % OWN.length];
  return (
    <Link href={href} aria-label={`${t.title}, ${VIS[t.visibility] || 'Public'}, ${things}, ${t.covered} covered`} style={{ ...base, justifyContent: 'space-between', background: c.bg, color: c.ink }}>
      <Blob seed={5 + i * 22} color={c.blob} width={190} height={big ? 150 : 130} style={{ left: -8, top: big ? 36 : 30 }} />
      <span className="wide" style={CAP}>{VIS[t.visibility] || 'Public'} · {things}</span>
      <SerifTitle title={t.title} color={c.title} size={big ? 28 : 25} />
      <span style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 12, fontWeight: 700 }}>{foot ? foot[0] : 'covered'}</span>
        <span className="dot" style={{ fontSize: big ? 18 : 16 }}>{foot ? foot[1] : `${t.covered} / ${t.wishCount}`}</span>
      </span>
    </Link>
  );
}
