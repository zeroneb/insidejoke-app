// The default name for a "me" list, based on the occasion picked.
const NAMES = {
  'birthday': 'For my birthday',
  'holidays': 'For the holidays',
  'just because': 'Just because',
  'new place': 'For my new place',
  "dinner i'm hosting": 'For my dinner',
  'secret santa': 'Secret Santa',
};

export function defaultListTitle(occasion) {
  const o = (occasion || '').trim();
  if (!o) return 'My list';
  return NAMES[o.toLowerCase()] || `For my ${o.toLowerCase()}`;
}
