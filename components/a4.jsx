import Link from 'next/link';
import { tri } from '@/lib/blob';
import { Avatar } from '@/components/ui';

// a4: shared bits for the collab / surprise screens (Option 10 boards).
export const RED = '#E2452B', DEEP = '#8A2414', RUST = '#C8743A', BROWN = '#8A4E20';

export function Boil({ seed, fill = '#FFFFFF', left, top, width, height, style }) {
  const [a, b, c] = tri(seed);
  return (
    <svg aria-hidden="true" style={{ position: 'absolute', left, top, ...style }} width={width} height={height} viewBox="0 0 200 200" preserveAspectRatio="none">
      <path className="b1" d={a} fill={fill} /><path className="b2" d={b} fill={fill} /><path className="b3" d={c} fill={fill} />
    </svg>
  );
}

export function Hdr({ back, children, ink = RED, right, wide }) {
  return (
    <header className="a4-hdr">
      {back ? (
        <Link href={back} aria-label="Back" className="a4-back"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth="2.2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></Link>
      ) : <span style={{ width: 44 }} />}
      {wide ? <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em', color: ink }}>{children}</span> : <span style={{ fontWeight: 800, fontSize: 14, color: ink, textAlign: 'center' }}>{children}</span>}
      {right || <span style={{ width: 44 }} />}
    </header>
  );
}

export function Band({ words, reverse, top }) {
  const rep = [...words, ...words, ...words, ...words];
  return (
    <section aria-hidden="true" className="a4-band" style={top ? { borderBottom: 0, borderTop: '1.5px solid #E2452B', marginTop: 26 } : undefined}>
      <div className={`a4-bandin ${reverse ? 'marqr' : 'marq'}`}>{rep.map((b, i) => <span key={i}>{b}</span>)}</div>
    </section>
  );
}

// The viewer is always the owner variant (purple blob + lime initial); everyone else their own blob.
export function Who({ user, me, size = 40 }) {
  return <Avatar user={user} size={size} owner={!!me && user?.id === me.id} />;
}

export const Tick = ({ ink = '#fff', size = 14 }) => (
  <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
);

// Big condensed list title ("FOR MOM"), split onto two lines like the boards.
export function TallTitle({ text, size = 92, color = RED, style, oneLine }) {
  const words = String(text || '').split(/\s+/);
  const half = Math.ceil(words.length / 2);
  const lines = oneLine ? [words.join(' ')] : words.length > 1 ? [words.slice(0, half).join(' '), words.slice(half).join(' ')] : words;
  const fs = Math.min(size, Math.floor(size * (oneLine ? 7 : 6) / Math.max(5, ...lines.map((l) => l.length))));
  return (
    <h1 className="tall" style={{ position: 'relative', margin: 0, padding: '0 16px', textAlign: 'center', fontSize: fs, lineHeight: 0.84, letterSpacing: '-0.01em', color, ...style }}>
      {lines.map((l, i) => <span key={i}>{l}{i < lines.length - 1 ? <br /> : null}</span>)}
    </h1>
  );
}

export const stat = (it) => (it.unlimited ? `×${it.timesTreated}` : `${it.pct}%`);

export function Waveform({ n = 28, mul = 41, max = 30, w = 4, color = '#000', animate = true, height = 40 }) {
  const bars = [];
  for (let i = 0; i < n; i++) bars.push({ h: 8 + ((i * mul) % max), d: (-(i * 0.11)).toFixed(2) + 's' });
  return (
    <span aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 3, height, flexGrow: 1, overflow: 'hidden' }}>
      {bars.map((b, i) => <span key={i} className={animate ? 'a4-w' : ''} style={{ width: w, flexShrink: 0, height: b.h, borderRadius: w > 3 ? 2 : 0, background: color, animationDelay: b.d }} />)}
    </span>
  );
}

export const fmtDate = (d) => {
  if (!d) return '';
  const [y, m, dd] = d.split('-').map(Number);
  return new Date(y, m - 1, dd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
