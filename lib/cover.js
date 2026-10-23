// One cover per list, used on its tile and at the top of the list page.
// Colors come from the list's own `cover` number (set when it was made), so a list looks the same everywhere.

export const OWN = [
  { bg: '#E8642C', ink: '#FFFFFF', blob: '#D8F75A', title: '#000000', circle: '#13286B', circleInk: '#13286B', text: '#13286B', chrome: '#FFFFFF' },
  { bg: '#13286B', ink: '#FFFFFF', blob: '#F4D3EE', title: '#E2452B', circle: '#E8642C', circleInk: '#FFFFFF', text: '#FFFFFF', chrome: '#FFFFFF' },
  { bg: '#B36EE0', ink: '#FFFFFF', blob: '#D8F75A', title: '#13286B', circle: '#13286B', circleInk: '#FFFFFF', text: '#FFFFFF', chrome: '#FFFFFF' },
  { bg: '#F4D3EE', ink: '#E2452B', blob: '#E8642C', title: '#000000', circle: '#E2452B', circleInk: '#E2452B', text: '#E2452B', chrome: '#E2452B' }
];
export const TREAT = [
  { bg: '#96E084', ink: '#000000', dia: '#E8642C', title: '#000000', blob: '#FFFFFF', text: '#000000', chrome: '#000000', icon: '#000000' },
  { bg: '#E8642C', ink: '#FFFFFF', dia: '#96E084', title: '#000000', blob: '#D8F75A', text: '#13286B', chrome: '#FFFFFF', icon: '#000000' }
];
const SURPRISE = { bg: '#A9CDF5', blob: '#FFFFFF', title: '#13286B', text: '#8A4E20', chrome: '#13286B', art: 'cake', orb: '#E7B48A' };
const COLLAB = { bg: '#F4D3EE', blob: '#FFFFFF', title: '#E2452B', text: '#E2452B', chrome: '#E2452B', art: 'bouquet' };

export function coverIndex(list) {
  if (Number.isInteger(list?.cover)) return list.cover;
  let h = 0; for (const ch of String(list?.id || list?.slug || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

export function listKind(list, items = []) {
  const treatsOnly = !!list.treats || (items.length > 0 && items.every((i) => i.unlimited));
  return list.surprise ? 'surprise' : list.for_who === 'other' ? 'collab' : treatsOnly ? 'treat' : 'own';
}

// Everything the list page header needs.
export function coverFor(list, kind) {
  const k = coverIndex(list);
  const photo = list?.photo || null; // the owner's cover photo, framed in the cover's shape
  if (kind === 'surprise') return { ...SURPRISE, k, photo };
  if (kind === 'collab') return { ...COLLAB, k, photo };
  if (kind === 'treat') return { ...TREAT[k % TREAT.length], art: 'diamond', k, photo };
  return { ...OWN[k % OWN.length], art: 'circle', k, photo };
}
