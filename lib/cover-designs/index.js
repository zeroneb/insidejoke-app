// List covers v1: which covers exist, their words (slots), limits, colors, and which ones a list name suggests.
// A list's design is stored as JSON on lists.design: { key, pal, s: { slot: text } }. The title is always the list name.
import { RENDER, esc, W, H } from './templates';
import { FONT_URL, KEYFRAMES } from './art';

export { W, H, FONT_URL, KEYFRAMES };

// slot: [label, default, max characters]
export const COVERS = {
  friend: { label: 'Ring + blob', slots: { ring: ['Ring text', "our list · things we'd actually love", 40] },
    pals: [{ g: '#E8642C', b: '#D8F75A', ring: '#13286B', k: '#000000' }, { g: '#B36EE0', b: '#D8F75A', ring: '#5B1FD1', k: '#000000' }, { g: '#807F48', b: '#93EC75', ring: '#807F48', k: '#000000' }] },
  stickers: { label: 'Sticker grid', slots: { sign: ['Sign-off', 'with love', 16] },
    pals: [{ A: '#FF9FD0', B: '#8DB3F0', paper: '#FFF6E6', k: '#2141C9' }, { A: '#D8F75A', B: '#C9B8FF', paper: '#FFF8EA', k: '#2F5BFF' }, { A: '#A8F0D0', B: '#FFE36B', paper: '#FFF8EA', k: '#6A2BFF' }] },
  drawn: { label: 'Drawn blob', slots: { stamp: ['Stamp', 'OPENING', 10], tag: ['Bottom line', 'WISH LIST OPEN', 16] },
    pals: [{ g: '#E3CA53', blob: '#CEFC52', inner: '#4E5D25', k: '#4E5D25' }, { g: '#DDFB4A', blob: '#CC91E5', inner: '#6A2BFF', k: '#6A2BFF' }, { g: '#D9E7FF', blob: '#1D2BD8', inner: '#D9E7FF', k: '#1D2BD8' }] },
  echo: { label: 'Echo frame', slots: { label: ['Top label', 'INSIDEJOKE', 12] },
    pals: [{ g: '#F0462F', k: '#F7BCA4' }, { g: '#DDECF5', k: '#3D68B0' }, { g: '#D9F2C2', k: '#2E6B1F' }] },
  border: { label: 'Border text', slots: { phrase: ['Border words', 'WISH BIG', 14] },
    pals: [{ g: '#2B3BFF', k: '#FFC2E2' }, { g: '#0F5132', k: '#FFE07A' }, { g: '#FFE14D', k: '#B3122E' }] },
  dots: { label: 'Dot field', slots: {}, maxTitle: 24,
    pals: [{ g: '#9FF0FF', k: '#1A1AFF' }, { g: '#FFE14D', k: '#E2452B' }, { g: '#D8F75A', k: '#0F5132' }] },
  stencil: { label: 'Cut paper', slots: { tagline: ['Tagline', 'WISHES. TREATS. JOY.', 24] },
    pals: [{ g: '#E3392A', k: '#EFE9DC' }, { g: '#1E3FA8', k: '#EFE9DC' }, { g: '#1F1F1F', k: '#F2E4E4' }] },
  squish: { label: 'Squishy stack', slots: { top: ['Top line', "PSST, IT'S MY LIST", 20], bottom: ['Bottom line', 'insidejoke', 28] },
    pals: [{ g: '#2A2A2A', k: '#D6EE7A' }, { g: '#2A2A2A', k: '#FF9AD5' }, { g: '#1E2A6B', k: '#FFD24D' }] },
  fieldnotes: { label: 'Field notes', slots: { intro: ['Note', 'In this list, we will cover the basics of giving. Learn what they love and start a joke.', 90], from: ['From', 'you, with love', 24], mood: ['Mood', 'big // little // both', 24] },
    pals: [{ g: '#1F4D3F', k: '#E9F3EC' }, { g: '#141414', k: '#E8FF3A' }, { g: '#2A1F4D', k: '#F4E9FF' }] },
  bilingual: { label: 'Bilingual bars', slots: { ar1: ['Top line', 'قائمة أمنياتي', 20], ar2: ['Highlight', 'بكل حب', 20], side: ['Side words', 'WISHES ACROSS', 16], band: ['Bottom band', 'KEEPING THE JOKE ALIVE', 24] },
    pals: [{ g: '#B7B4F5', k: '#1F2BD8' }, { g: '#F7C9E3', k: '#B3122E' }, { g: '#C8F0DA', k: '#0F5132' }] },
  collab: { label: 'Bouquet', slots: { band: ['Band', 'COLLAB ✦ MADE TOGETHER', 30] },
    pals: [{ g: '#F4D3EE', k: '#E2452B' }, { g: '#D8F75A', k: '#2F5BFF' }, { g: '#E6DBFF', k: '#6A2BFF' }] },
  surprise: { label: 'Surprise', slots: {}, onlySurprise: true,
    pals: [{ g: '#A9CDF5', accent: '#C8743A', blob: '#F4D3EE', dots: '#E7B48A', k: '#FFFFFF' }, { g: '#D8F75A', accent: '#2F5BFF', blob: '#FFFFFF', dots: '#A9C2FF', k: '#2F5BFF' }, { g: '#FFB8E6', accent: '#6A2BFF', blob: '#FFE14D', dots: '#CDB8FF', k: '#6A2BFF' }] },
  treat: { label: 'Treat', slots: {}, onlyTreat: true, maxTitle: 20,
    pals: [{ g: '#96E084', dia: '#E8642C', k: '#000000' }, { g: '#D8F75A', dia: '#2F5BFF', k: '#13286B' }, { g: '#E6DBFF', dia: '#6A2BFF', k: '#FFFFFF' }] },
  blob: { label: 'Blob + ring', slots: {},
    pals: [{ g: '#13286B', b: '#D8F75A', ring: '#D8F75A', star: '#D8F75A' }, { g: '#FFB8E6', b: '#E2452B', ring: '#E2452B', star: '#E2452B' }, { g: '#6A2BFF', b: '#D8F75A', ring: '#FF7A1A', star: '#FF7A1A' }] },
  bubbles: { label: 'Bubbles', slots: {},
    pals: [{ g: '#7B3FF2', k: '#D8F75A' }, { g: '#7E8A3A', k: '#C6F55A' }, { g: '#FF5A1F', k: '#FFE9DC' }] },
  wave: { label: 'Wave type', slots: {},
    pals: [{ g: '#0B3D3A', k: '#FFE14D' }, { g: '#FFE14D', k: '#0B3D3A' }, { g: '#1D2BD8', k: '#9FF0FF' }] },
  lettered: { label: 'Hand-lettered', slots: { cap: ['Bottom tag', 'A wish list', 18] },
    pals: [{ g: '#E8472B', ray: '#F0583A', k: '#FFE7A3', sh: '#B5301C' }, { g: '#2F5FD0', ray: '#3D6DDB', k: '#F5DC5A', sh: '#1F45A8' }, { g: '#E0141E', ray: '#EA2A2A', k: '#FFD24A', sh: '#A80E15' }] },
  photo: { label: 'Your photo', slots: {}, hidden: true, pals: [{}] }
};

// Picker order (everything but the special ones).
export const PICKABLE = ['friend', 'stickers', 'drawn', 'echo', 'border', 'dots', 'stencil', 'squish', 'fieldnotes', 'bilingual', 'collab', 'blob', 'bubbles', 'wave', 'lettered'];

// Name → first five covers. First rule that matches wins.
const RULES = [
  [/[\u0600-\u06FF\u3040-\u30FF\u3400-\u9FFF]|\b(cumple|mi|mis)\b/i, ['lettered', 'bilingual', 'stickers', 'blob', 'border']],
  [/\b(birthday|bday|b-day|cumple|anniversary|turning|\d{1,3}(st|nd|rd|th))\b/i, ['stickers', 'friend', 'border', 'squish', 'stencil']],
  [/\b(grad|graduation|class of|szn|degree)\b/i, ['friend', 'stickers', 'drawn', 'echo', 'fieldnotes']],
  [/\b(new place|home|apartment|apt|housewarming|move|moving)\b/i, ['drawn', 'dots', 'border', 'fieldnotes', 'echo']],
  [/\b(wedding|registry|engaged|engagement|honeymoon)\b|\S\s*\+\s*\S/i, ['border', 'echo', 'stencil', 'friend', 'stickers']],
  [/\b(baby|shower|little one|due)\b/i, ['stickers', 'squish', 'drawn', 'dots', 'friend']],
  [/\b(eid|ramadan|holidays?|christmas|xmas|diwali|hanukkah|chanukah|navidad)\b|[؀-ۿ]/i, ['bilingual', 'border', 'stencil', 'stickers', 'dots']]
];
const FAVES = ['friend', 'stickers', 'echo', 'dots', 'border'];
const OCC = { Birthday: 1, 'New place': 3, Holidays: 6 };

export function suggest({ title = '', surprise = false, forOther = false, collab = false, occasion = '' } = {}) {
  let first;
  if (surprise) first = ['surprise', 'stickers', 'border', 'friend', 'stencil'];
  else if (forOther && collab) first = ['collab', 'friend', 'stickers', 'border', 'echo'];
  else {
    const hit = RULES.find(([re]) => re.test(title)) || (OCC[occasion] != null ? RULES[OCC[occasion]] : null);
    first = hit ? hit[1] : FAVES;
  }
  if (String(title).length > (COVERS.dots.maxTitle || 99)) first = first.filter((k) => k !== 'dots');
  const rest = PICKABLE.filter((k) => !first.includes(k));
  return first.concat(rest);
}

// Clean a design coming from a form: known cover, palette in range, slots within limits.
export function normalize(raw, { treat = false } = {}) {
  let d = raw;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch { d = null; } }
  if (treat) return { key: 'treat', pal: Math.max(0, Math.min(2, (d && d.key === 'treat' && +d.pal) || 0)), s: {} };
  if (!d || !COVERS[d.key] || COVERS[d.key].onlyTreat) return null;
  const c = COVERS[d.key];
  const pal = Math.max(0, Math.min(c.pals.length - 1, Math.floor(+d.pal || 0)));
  const s = {};
  for (const [name, [, , max]] of Object.entries(c.slots)) {
    const v = d.s && typeof d.s[name] === 'string' ? d.s[name].replace(/\s+/g, ' ').trim().slice(0, max) : '';
    if (v) s[name] = v;
  }
  if (d.key === 'photo' && d.s && Number.isFinite(+d.s.y)) s.y = String(Math.max(0, Math.min(100, Math.round(+d.s.y))));
  return { key: d.key, pal, s };
}

export function parse(json) {
  if (!json) return null;
  try { const d = typeof json === 'string' ? JSON.parse(json) : json; return d && COVERS[d.key] ? d : null; } catch { return null; }
}

export function slotsFor(design) {
  const c = COVERS[design.key];
  const out = {};
  for (const [name, [, def]] of Object.entries(c.slots)) out[name] = design.s?.[name] || def;
  if (design.key === 'photo') out.y = design.s?.y;
  return out;
}

// Full HTML for one cover (390 × 480). ctx: { visibility, recipient, people, photo, handle }
export function coverHTML(design, title, uid = 'cv', ctx = {}) {
  const c = COVERS[design.key] || COVERS.friend;
  const p = c.pals[design.pal] || c.pals[0];
  const s = slotsFor({ ...design, key: COVERS[design.key] ? design.key : 'friend' });
  if (design.key === 'squish' && !design.s?.bottom && ctx.handle) s.bottom = `insidejoke.club/${ctx.handle}`;
  const fn = RENDER[COVERS[design.key] ? design.key : 'friend'];
  return fn(String(title || 'Wishes').slice(0, 60), p, s, String(uid).replace(/[^a-zA-Z0-9_-]/g, ''), ctx);
}

export const swatch = (key, i) => {
  const p = COVERS[key]?.pals[i] || {};
  const v = Object.values(p);
  return [v[0] || '#FFFFFF', v[1] || p.k || '#000000'];
};
export { esc };
