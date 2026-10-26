// r3: small shared bits for give / sent / covered / wallet screens (Option 10).
import { ItemSketch, sketchKey } from '@/components/ui';

// Three-frame boiling blob (paths from lib/blob tri()).
export function R3Boil({ paths, color, style, width, height }) {
  return (
    <svg aria-hidden="true" style={{ position: 'absolute', ...style }} width={width} height={height} viewBox="0 0 200 200" preserveAspectRatio="none">
      <path className="b1" d={paths[0]} fill={color} /><path className="b2" d={paths[1]} fill={color} /><path className="b3" d={paths[2]} fill={color} />
    </svg>
  );
}

// Sent card sketch: the board's wobbly boot for boots, the item's own one-line sketch otherwise.
const BOOT = ['M70 32 Q90 30 112 31 L112 108 Q148 116 160 140 L163 160 L62 160 L62 140 Q72 132 70 108 Z', 'M64 29 L120 33', 'M111 25 L113 116', 'M56 162 L171 160', 'M62 162 L61 176 L87 175 L86 161', 'M88 31 Q90 16 102 21 Q106 26 100 31', 'M68 120 Q100 124 146 130', 'M79 62 L95 46', 'M78 76 L106 48', 'M79 90 L107 62', 'M82 102 L108 76', 'M94 104 L108 90', 'M120 140 L134 128', 'M128 146 L146 132', 'M138 150 L154 138'];
export function R3Sketch({ name = '', unlimited = false }) {
  const filter = (
    <defs><filter id="r3wob" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" /><feDisplacementMap in="SourceGraphic" scale="4" /></filter></defs>
  );
  if (sketchKey(name, unlimited) === 'boots') {
    return (
      <svg role="img" aria-label={`Hand-drawn ${name}`} style={{ position: 'absolute', left: '50%', marginLeft: -100, top: 10 }} width="200" height="210" viewBox="0 0 200 210" fill="none" stroke="var(--inv-fg, #FFFFFF)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {filter}
        <g filter="url(#r3wob)">{BOOT.map((d, i) => <path key={i} d={d} />)}</g>
      </svg>
    );
  }
  return (
    <span role="img" aria-label={`Hand-drawn ${name}`} style={{ position: 'absolute', left: '50%', marginLeft: -100, top: 15, width: 200, height: 200, display: 'block' }}>
      <ItemSketch name={name} unlimited={unlimited} size={200} strokeWidth={1.5} />
    </span>
  );
}

// Small line icons for the history rows (24×24, one path).
const ICONS = {
  bagel: ['Bagel', 'M12 4a8 8 0 1 0 0.01 0Z M12 9a3 3 0 1 0 0.01 0Z'],
  boots: ['Boots', 'M8 3h5v10c3 1 6 2 6 5v2H6v-3c2-1 2-2 2-4Z M6 18h13'],
  bowl: ['Food', 'M4 11h16a8 8 0 0 1-16 0Z M9 3v8 M13 3v8'],
  candle: ['Candle', 'M8 10h8v11H8Z M12 3c1.5 1.5 1.5 3 0 4.5c-1.5-1.5-1.5-3 0-4.5Z'],
  flowers: ['Flowers', 'M12 21v-9 M12 12a3 3 0 1 1 0-6a3 3 0 0 1 0 6Z M12 17c-2 0-4-1-4-3c2 0 4 1 4 3Z M12 16c2 0 4-1 4-3c-2 0-4 1-4 3Z'],
  box: ['Gift', 'M4 8l8-4l8 4v9l-8 4l-8-4Z M4 8l8 4l8-4 M12 12v9'],
  vase: ['Ceramics', 'M9 3h6 M10 3c0 3-4 5-4 10c0 4 3 8 6 8s6-4 6-8c0-5-4-7-4-10'],
  cup: ['Coffee', 'M5 8h11v7a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5Z M16 10h2a2 2 0 0 1 0 4h-2 M8 3v2 M12 3v2'],
  bottle: ['Bottle', 'M10 3h4v4l2 3v11H8V10l2-3Z M8 14h8'],
  ticket: ['Ticket', 'M3 8h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4Z M14 8v10'],
  camera: ['Camera', 'M4 8h4l2-3h4l2 3h4v11H4Z M12 10a3 3 0 1 0 0.01 0Z'],
  glass: ['Glasses', 'M7 3h10l-1 7a4 4 0 0 1-8 0Z M12 14v6 M8 21h8'],
  bank: ['Bank', 'M3 10l9-6l9 6 M5 10v8 M9.5 10v8 M14.5 10v8 M19 10v8 M3 21h18']
};
export function iconFor(name = '', unlimited = false) {
  const n = name.toLowerCase();
  if (/noodle|lunch|dinner|ramen|pizza|slice|taco|food|brunch/.test(n)) return ICONS.bowl;
  if (/candle/.test(n)) return ICONS.candle;
  if (/wheel|clay|pottery|ceramic/.test(n)) return ICONS.vase;
  const k = sketchKey(name, unlimited);
  return ({ bagel: ICONS.bagel, boots: ICONS.boots, bouquet: ICONS.flowers, vase: ICONS.vase, latte: ICONS.cup, bottle: ICONS.bottle, ticket: ICONS.ticket, camera: ICONS.camera, glass: ICONS.glass })[k]
    || (/class|clay|pottery|ceramic/.test(n) ? ICONS.vase : ICONS.box);
}
export const BANK_ICON = ICONS.bank;
