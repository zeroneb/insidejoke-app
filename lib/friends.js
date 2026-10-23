// Friendships made without anyone tapping "Add": signing up from someone's link, being texted a list.
import { get, run, now } from './db';

export async function befriendPair(a, b) {
  if (!a || !b || a === b) return;
  const t = now();
  for (const [x, y] of [[a, b], [b, a]]) {
    await run("INSERT INTO friends (user_id, friend_id, status, created_at) VALUES (?, ?, 'friends', ?) ON CONFLICT (user_id, friend_id) DO NOTHING", x, y, t);
  }
}

// Someone shared a list with this phone number: if they're on insidejoke, you're friends.
export async function befriendPhone(meId, phone) {
  try {
    const u = phone ? await get('SELECT id FROM users WHERE phone = ?', phone) : null;
    if (u) await befriendPair(meId, u.id);
  } catch {}
}

// A new account that came in through someone's link: list (/l/<slug>, /join/<slug>) or profile (/u/<id>).
export async function befriendFromLink(newUserId, next) {
  try {
    const p = String(next || '');
    let other = null;
    const u = /^\/u\/([^/?#]+)/.exec(p);
    if (u) other = u[1];
    const l = /^\/(?:l|join)\/([^/?#]+)/.exec(p);
    if (l) other = (await get('SELECT owner_id FROM lists WHERE slug = ?', l[1]))?.owner_id || null;
    if (other) await befriendPair(newUserId, other);
  } catch {}
}
