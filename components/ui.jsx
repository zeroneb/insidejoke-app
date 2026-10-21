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
export function ItemSketch({ name = '', size = 72, ink = '#FFFFFF', unlimited }) {
  const n = name.toLowerCase();
  const d = unlimited ? DRAW.cup : /boot|shoe|sneaker/.test(n) ? DRAW.boots : /glass|wine|cup|mug/.test(n) ? DRAW.glass : DRAW.gift;
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={ink} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path className="draw" d={d} /></svg>
  );
}
