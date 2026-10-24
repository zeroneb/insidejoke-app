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
    const hd = /^\/([a-z0-9][a-z0-9._]{1,28}[a-z0-9])$/.exec(p);
    if (hd) other = (await get('SELECT id FROM users WHERE handle = ?', hd[1]))?.id || null;
    const l = /^\/(?:l|join)\/([^/?#]+)/.exec(p);
    if (l) other = (await get('SELECT owner_id FROM lists WHERE slug = ?', l[1]))?.owner_id || null;
    if (other) await befriendPair(newUserId, other);
  } catch {}
}

// A brand-new account: become friends with everyone who brought them here.
// - the link they signed up from (`next`), and any shared list or profile links they opened before signing up
//   (remembered in the ij_via cookie by middleware.js)
// - anyone who texted or shared a list to this phone number before they had an account
export async function welcomeFriends(newUserId, phone, next) {
  try {
    await befriendFromLink(newUserId, next);
    try {
      const jar = await (await import('next/headers')).cookies();
      let via = [];
      try { via = JSON.parse(decodeURIComponent(jar.get('ij_via')?.value || '[]')); } catch {}
      for (const p of Array.isArray(via) ? via.slice(0, 5) : []) await befriendFromLink(newUserId, String(p));
      jar.delete('ij_via');
    } catch {}
    if (phone) {
      const { all } = await import('./db');
      const owners = await all('SELECT DISTINCT l.owner_id AS id FROM list_shares s JOIN lists l ON l.id = s.list_id WHERE s.phone = ?', phone);
      for (const o of owners) await befriendPair(newUserId, o.id);
    }
  } catch {}
}
