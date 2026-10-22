import Link from 'next/link';
import { blob, tri } from '@/lib/blob';

export function Blob({ seed = 5, color = '#D8F75A', style, width = 300, height = 200, className }) {
  const [a, b, c] = tri(seed);
  return (
    <svg aria-hidden="true" className={className} style={{ position: 'absolute', ...style }} width={width} height={height} viewBox="0 0 200 200" preserveAspectRatio="none">
      <path className="b1" d={a} fill={color} />
      <path className="b2" d={b} fill={color} />
      <path className="b3" d={c} fill={color} />
    </svg>
  );
}

export function Avatar({ user, size = 40, owner = false }) {
  const initial = ((user?.name || '?').trim()[0] || '?').toUpperCase();
  const shape = blob(user?.seed || 7, 4);
  return (
    <span className="avatar" style={{ width: size, height: size }}>
      <svg aria-hidden="true" width={size} height={size} viewBox="0 0 200 200"><path d={shape} fill={owner ? '#B36EE0' : user?.color || '#D8F75A'} /></svg>
      <span className={owner ? 'serif' : ''} style={{ fontSize: size * (owner ? 0.5 : 0.4), color: owner ? '#D8F75A' : '#000', fontWeight: owner ? 400 : 800 }}>{initial}</span>
    </span>
  );
}

export function Header({ back, title, right, light }) {
  const ink = light ? '#FFFFFF' : '#000000';
  return (
    <header className="hdr">
      {back ? (
        <Link href={back} aria-label="Back" className="iconbtn">
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg>
        </Link>
      ) : <span style={{ width: 44 }} />}
      {title ? <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em', color: ink }}>{title}</span> : null}
      {right || <span style={{ width: 44 }} />}
    </header>
  );
}

export function Bar({ pct, color = '#13286B' }) {
  return (
    <div className="bar"><div className="grow" style={{ width: `${pct}%`, background: pct >= 100 ? '#2E9B47' : color }} /></div>
  );
}

export function Logo({ color = '#13286B' }) {
  return (
    <Link href="/" style={{ textDecoration: 'none', color, fontSize: 22 }}>
      <span className="wide" style={{ fontSize: 20, textTransform: 'none' }}>inside</span>
      <span className="dot" style={{ fontSize: 24 }}>joke</span>
    </Link>
  );
}

const DRAW = {
  boots: 'M34 14 L52 14 L52 56 Q72 60 80 70 L80 84 L26 84 L26 74 Q34 70 34 56 Z M26 76 L80 76 M40 30 L48 30 M40 40 L48 40',
  gift: 'M22 40 L78 40 L78 84 L22 84 Z M18 30 L82 30 L82 40 L18 40 Z M50 30 L50 84 M50 30 Q38 14 30 22 Q26 30 50 30 Q62 14 70 22 Q74 30 50 30',
  cup: 'M28 34 L72 34 L66 84 L34 84 Z M72 44 Q86 46 82 60 Q78 70 68 68 M40 22 Q44 16 40 10 M52 22 Q56 16 52 10',
  glass: 'M34 14 Q33 34 40 42 Q46 48 50 48 Q54 48 60 42 Q67 34 66 14 Z M35 26 L65 26 M50 48 L50 78 M36 84 Q50 78 64 84'
};
export function ItemSketch({ name = '', size = 72, ink = '#FFFFFF', unlimited, strokeWidth = 2.4 }) {
  const d = DRAW[sketchKey(name, unlimited)] || DRAW.gift;
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={ink} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"><path className="draw" d={d} /></svg>
  );
}

/* ---- a2: list screens (Option 13) ---- */
// Marquee caps strip: "ON THE LIST · ON THE LIST · …"
export function Strip({ text, delay, style }) {
  const run = Array.from({ length: 16 }, () => text).join(' · ') + ' · ';
  return (
    <div aria-hidden="true" style={{ background: '#D4FA4F', color: '#13286B', height: 28, overflow: 'hidden', display: 'flex', alignItems: 'center', ...style }}>
      <div className="marq wide" style={{ whiteSpace: 'nowrap', fontSize: 11, letterSpacing: '0.18em', animationDuration: '30s', animationDelay: delay }}>{run}{run}</div>
    </div>
  );
}

// Highlighter bar behind a line of text (clones per wrapped line).
export function Hl({ children, bg = '#13286B', color = '#FFFFFF', pad = '3px 6px', style }) {
  return <span style={{ background: bg, color, fontWeight: 500, padding: pad, WebkitBoxDecorationBreak: 'clone', boxDecorationBreak: 'clone', ...style }}>{children}</span>;
}

// Treat tile: spinning diamond behind a short Doto name.
export function Diamond({ accent, top = 46, left = 44, size = 62 }) {
  return <div aria-hidden="true" className="dia" style={{ position: 'absolute', left, top, width: size, height: size, background: accent, transform: 'rotate(45deg)', opacity: 0.9 }} />;
}
const TREAT_INK = { '#96E084': ['#000000', '#E8642C'], '#F4D3EE': ['#E2452B', '#FFFFFF'], '#A9CDF5': ['#13286B', '#C8743A'], '#E8642C': ['#FFFFFF', '#13286B'], '#D4FA4F': ['#13286B', '#AAB4EC'], '#D8F75A': ['#13286B', '#AAB4EC'], '#C8743A': ['#F4D3EE', '#E2452B'], '#E3C552': ['#13286B', '#E8642C'], '#B36EE0': ['#FFFFFF', '#D8F75A'], '#5FC3D9': ['#13286B', '#E8642C'] };
export const treatInk = (bg) => TREAT_INK[bg] || ['#000000', '#E8642C'];
export const shortName = (name) => (name || '').split(/\s+/).filter(Boolean).slice(0, 2).join('\n').toUpperCase();

// Progress ring with a boiling lime blob and the Doto percentage inside.
export function Dial({ pct = 0, size = 132, label, seed = 6 }) {
  const r = 58, C = 2 * Math.PI * r;
  const dash = (C * Math.min(100, Math.max(0, pct)) / 100).toFixed(1);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }} width={size} height={size} viewBox="0 0 132 132">
        <circle cx="66" cy="66" r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="12" />
        <circle className="ip-dialarc" cx="66" cy="66" r={r} fill="none" stroke="#D8F75A" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${dash} 1000`} />
      </svg>
      <Blob seed={seed} color="#D8F75A" style={{ left: size * 22 / 132, top: size * 22 / 132 }} width={size * 88 / 132} height={size * 88 / 132} />
      <span className="dot" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, color: '#13286B' }}>{label ?? `${pct}%`}</span>
    </div>
  );
}

// The item photo exactly as the store shows it: no filters, on white, whole product visible.
export function Halftone({ src, fit = 'contain' }) {
  return (
    <span aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'block', background: '#FFFFFF' }}>
      <img src={src} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: fit, display: 'block' }} />
    </span>
  );
}

// More hand sketches (one white wobbly line, no fills).
Object.assign(DRAW, {
  bottle: 'M36 40 L64 40 L64 86 L36 86 Z M44 30 L56 30 L56 40 L44 40 Z M42 22 L58 22 L58 30 L42 30 Z M44 56 L56 56 L56 70 L44 70 Z',
  vase: 'M40 12 L60 12 L58 24 Q78 38 76 62 Q74 88 50 92 Q26 88 24 62 Q22 38 42 24 Z M34 60 L66 60',
  ticket: 'M24 32 L76 32 L76 74 L24 74 Z M24 42 L76 42 M24 64 L76 64 M32 32 L32 26 L44 26 L44 32 M50 53 a8 8 0 1 0 0.1 0',
  bagel: 'M50 24 Q82 24 82 52 Q82 80 50 80 Q18 80 18 52 Q18 24 50 24 Z M50 42 Q60 42 60 52 Q60 62 50 62 Q40 62 40 52 Q40 42 50 42 Z M30 36 L34 32 M66 32 L70 36 M28 66 L32 70 M68 70 L72 66',
  latte: 'M28 34 L72 34 L66 84 L34 84 Z M72 44 Q86 46 82 60 Q78 70 68 68 M40 22 Q44 16 40 10 M52 22 Q56 16 52 10 M36 48 Q50 40 64 48',
  bouquet: 'M50 50 L44 88 M50 50 L56 88 M40 88 L60 88 M50 50 Q36 44 36 30 Q44 26 50 36 Q56 26 64 30 Q64 44 50 50 Z M50 50 Q30 52 28 40 M50 50 Q70 52 72 40 M50 36 L50 22',
  camera: 'M20 34 L36 34 L42 24 L58 24 L64 34 L80 34 L80 78 L20 78 Z M50 56 a12 12 0 1 0 0.1 0 M68 42 L74 42'
});
export function sketchKey(name = '', unlimited = false) {
  const n = name.toLowerCase();
  if (/glass/.test(n)) return 'glass';
  if (/\bboots?\b|shoe|sneaker|\bheels?\b|loafer/.test(n)) return 'boots';
  if (/perfume|santal|fragrance|cologne|bottle|\bwine\b|whisk|\bgin\b|vodka|\brum\b/.test(n)) return 'bottle';
  if (/vase|\bpots?\b|planter|\bjars?\b/.test(n)) return 'vase';
  if (/class|ticket|lesson|workshop|course|concert|show|pass/.test(n)) return 'ticket';
  if (/bagel|donut|doughnut|croissant|pastry|bread/.test(n)) return 'bagel';
  if (/latte|coffee|\btea\b|matcha|cup|mug|cappuccino|espresso/.test(n)) return 'latte';
  if (/bouquet|flower|rose|tulip|peon|bloom/.test(n)) return 'bouquet';
  if (/camera|film|polaroid|lens/.test(n)) return 'camera';
  if (unlimited) return 'latte';
  return 'gift';
}

/* ---- a3: Sent poster sketch (Option 13 Sent / SentTreat): one wobbly white line, large ---- */
const POSTER = {
  boots: { vb: '0 0 200 210', w: 224, h: 236, right: 0, top: 4, paths: ['M70 32 Q90 30 112 31 L112 108 Q148 116 160 140 L163 160 L62 160 L62 140 Q72 132 70 108 Z', 'M64 29 L120 33', 'M111 25 L113 116', 'M56 162 L171 160', 'M62 162 L61 176 L87 175 L86 161', 'M88 31 Q90 16 102 21 Q106 26 100 31', 'M68 120 Q100 124 146 130', 'M79 62 L95 46', 'M78 76 L106 48', 'M79 90 L107 62', 'M82 102 L108 76', 'M94 104 L108 90', 'M120 140 L134 128', 'M128 146 L146 132', 'M138 150 L154 138'] },
  bagel: { vb: '0 0 220 200', w: 220, h: 200, right: 4, top: 30, paths: ['M28 96 C26 52 70 30 112 32 C160 34 196 60 194 98 C192 136 156 160 110 160 C64 160 30 134 28 96 Z', 'M84 94 C84 78 98 70 112 70 C128 70 140 80 138 96 C136 112 122 120 110 118 C96 116 84 108 84 94 Z', 'M34 108 C50 120 70 126 86 122', 'M140 124 C160 126 178 118 190 106', 'M48 70 L56 62 M62 58 L70 52 M78 48 L88 44 M98 42 L108 40 M124 40 L136 42 M148 46 L158 52 M166 58 L174 66 M60 136 L70 142 M86 146 L98 150 M124 150 L138 148 M152 142 L162 136', 'M66 82 L72 76 M150 84 L156 78 M100 54 L104 50 M126 56 L130 52 M90 138 L94 134 M132 136 L136 132'] }
};
export function PosterSketch({ name = '', unlimited = false, seed = 7 }) {
  const key = sketchKey(name, unlimited);
  const p = POSTER[key];
  const fid = `wob${seed}`;
  const filter = (
    <defs><filter id={fid} x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed={seed} /><feDisplacementMap in="SourceGraphic" scale="4" /></filter></defs>
  );
  if (p) {
    return (
      <svg role="img" aria-label={`One-line sketch of ${name}`} style={{ position: 'absolute', right: p.right, top: p.top }} width={p.w} height={p.h} viewBox={p.vb} fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {filter}
        <g filter={`url(#${fid})`}>{p.paths.map((d, i) => <path key={i} d={d} strokeWidth={i >= 7 ? 2.2 : 3} />)}</g>
      </svg>
    );
  }
  // Other kinds: the small sketch, scaled up, with the same wobble.
  const d = DRAW[key] || DRAW.gift;
  return (
    <svg role="img" aria-label={`One-line sketch of ${name}`} style={{ position: 'absolute', right: 10, top: 20 }} width="210" height="210" viewBox="0 0 100 100" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {filter}
      <g filter={`url(#${fid})`}><path d={d} /></g>
    </svg>
  );
}

/* ---- a1: profile blob (You / FriendProfile / Home hero / Settings) ---- */
// The person's blob with their initial, or their photo as a duotone halftone clipped to the blob.
// `boil` uses the three-frame boiling blob; otherwise one still shape. `uid` keeps svg ids unique per page.
export function PhotoBlob({ user, size = 170, owner = false, boil = true, uid = 'pb', fontSize, pad = 16 }) {
  const color = owner ? '#B36EE0' : user?.color || '#D8F75A';
  const seed = user?.seed || 7;
  const [a, b, c] = boil ? tri(seed) : [blob(seed, 4), null, null];
  const initial = ((user?.name || '?').trim()[0] || '?').toUpperCase();
  const outer = size + pad * 2;
  return (
    <span style={{ position: 'relative', width: size, height: size, display: 'block', flexShrink: 0 }}>
      <svg aria-hidden="true" style={{ position: 'absolute', left: -pad, top: -pad }} width={outer} height={outer} viewBox="-12 -12 224 224">
        <defs>
          <clipPath id={`${uid}-clip`}><path d={a} /></clipPath>
          <pattern id={`${uid}-half`} width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1.1" fill={color} /></pattern>
        </defs>
        {boil ? <><path className="b1" d={a} fill={color} /><path className="b2" d={b} fill={color} /><path className="b3" d={c} fill={color} /></> : <path d={a} fill={color} />}
        {user?.photo ? (
          <>
            <image className="duo" href={user.photo} x="12" y="12" width="176" height="176" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${uid}-clip)`} />
            <rect x="-10" y="-10" width="220" height="220" fill={`url(#${uid}-half)`} clipPath={`url(#${uid}-clip)`} opacity="0.55" />
          </>
        ) : null}
      </svg>
      {user?.photo ? null : (
        <span className={owner ? 'serif' : 'serif'} style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: fontSize || size * 0.5, lineHeight: 1, color: owner ? '#D8F75A' : '#000000' }}>{initial}</span>
      )}
    </span>
  );
}

// Small round avatar for rows and the feed: blob + bold initial, or the duotone photo.
export function FaceSm({ user, size = 44, owner = false, uid }) {
  if (!user?.photo) return <Avatar user={user} size={size} owner={owner} />;
  return <PhotoBlob user={user} size={size} owner={owner} boil={false} uid={uid || `f${(user.id || user.name || 'x').replace(/[^a-z0-9]/gi, '')}${size}`} pad={0} />;
}

// a3: the short noun for an item in headlines ("Chip in on Maya's boots", "Treat Maya to a bagel").
// "Wheel-throwing class for two" -> "class"; "Wine glasses ×4" -> "glasses".
export function shortNoun(name = '') {
  const head = name.split(/\s+(?:for|from|with|by|in|×|x\d)\b/i)[0] || name;
  const words = head.replace(/[×(),.]/g, ' ').split(/\s+/).filter((w) => w && !/^\d+$/.test(w));
  return (words.pop() || 'gift').toLowerCase();
}
export const isPluralNoun = (w) => /[^s]s$/.test(w) && !/(ss|us|is)$/.test(w);
