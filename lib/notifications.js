import { all, get } from './db';

// The bell: things that happened to you, newest first. Never amounts.
// Gifts on your lists (not surprise lists), covered wishes, hearts on your gifts,
// thank-yous for your gifts, new friends, and new public lists from friends.
export async function notificationsFor(me, limit = 40) {
  const since = Date.now() - 60 * 24 * 3600 * 1000;
  const out = [];
  const gifts = await all(`SELECT c.id, c.created_at, c.note, c.visibility, c.units, i.id AS item_id, i.name AS item_name, i.quantity, l.slug, l.title,
      u.id AS uid, u.name, u.color, u.seed, u.photo
    FROM contributions c JOIN items i ON i.id = c.item_id JOIN lists l ON l.id = c.list_id JOIN users u ON u.id = c.giver_id
    WHERE l.owner_id = ? AND c.giver_id <> ? AND l.surprise = 0 AND l.status <> 'deleted' AND c.created_at > ? ORDER BY c.created_at DESC LIMIT 30`, me.id, me.id, since);
  for (const g of gifts) out.push({ key: 'g' + g.id, at: +g.created_at, who: g, href: `/l/${g.slug}/i/${g.item_id}`,
    text: g.quantity === 0 ? `treated you to ${g.item_name}${g.units > 1 ? ` ×${g.units}` : ''}` : `put money toward your ${g.item_name}`, note: g.note });

  const covered = await all(`SELECT i.id, i.name, l.slug, MAX(c.created_at) AS at FROM items i JOIN lists l ON l.id = i.list_id JOIN contributions c ON c.item_id = i.id
    WHERE l.owner_id = ? AND l.surprise = 0 AND i.quantity > 0 AND i.removed = 0
    GROUP BY i.id, i.name, l.slug, i.price_cents, i.quantity HAVING SUM(c.amount_cents) >= i.price_cents * i.quantity AND MAX(c.created_at) > ?`, me.id, since);
  for (const c of covered) out.push({ key: 'c' + c.id, at: +c.at + 1, href: `/l/${c.slug}/i/${c.id}/thanks`, text: `All covered: ${c.name}. Say thanks?`, big: true });

  const hearts = await all(`SELECT r.contribution_id, r.emoji, r.created_at, i.name AS item_name, l.slug, i.id AS item_id, u.id AS uid, u.name, u.color, u.seed, u.photo
    FROM reactions r JOIN contributions c ON c.id = r.contribution_id JOIN items i ON i.id = c.item_id JOIN lists l ON l.id = c.list_id JOIN users u ON u.id = r.user_id
    WHERE c.giver_id = ? AND r.user_id <> ? AND r.created_at > ? ORDER BY r.created_at DESC LIMIT 20`, me.id, me.id, since);
  for (const h of hearts) out.push({ key: 'h' + h.contribution_id + h.uid, at: +h.created_at, who: h, href: `/l/${h.slug}/i/${h.item_id}`, text: `${h.emoji} your gift toward ${h.item_name}` });

  const thanks = await all(`SELECT DISTINCT t.id, t.message, t.created_at, l.slug, l.title, i.name AS item_name, u.id AS uid, u.name, u.color, u.seed, u.photo
    FROM thanks t JOIN lists l ON l.id = t.list_id LEFT JOIN items i ON i.id = t.item_id JOIN users u ON u.id = t.from_id
    WHERE t.from_id <> ? AND t.created_at > ? AND EXISTS (SELECT 1 FROM contributions c WHERE c.giver_id = ? AND c.list_id = t.list_id AND (t.item_id IS NULL OR c.item_id = t.item_id) AND c.created_at <= t.created_at)
    ORDER BY t.created_at DESC LIMIT 20`, me.id, since, me.id);
  for (const t of thanks) out.push({ key: 't' + t.id, at: +t.created_at, who: t, href: `/l/${t.slug}`, text: t.item_name ? `said thanks for the ${t.item_name}` : `said thanks`, note: t.message });

  const replies = await all(`SELECT m.id, m.body, m.created_at, i.id AS item_id, i.name AS item_name, l.slug, u.id AS uid, u.name, u.color, u.seed, u.photo
    FROM messages m JOIN contributions c ON c.id = m.ref_key JOIN items i ON i.id = c.item_id JOIN lists l ON l.id = c.list_id JOIN users u ON u.id = m.from_id
    WHERE m.kind = 'reply' AND c.giver_id = ? AND m.from_id <> ? AND m.created_at > ? ORDER BY m.created_at DESC LIMIT 20`, me.id, me.id, since);
  for (const m of replies) out.push({ key: 'm' + m.id, at: +m.created_at, who: m, href: `/l/${m.slug}/i/${m.item_id}`, text: `replied about the ${m.item_name}`, note: m.body });

  const friends = await all(`SELECT f.created_at, u.id AS uid, u.name, u.color, u.seed, u.photo FROM friends f JOIN users u ON u.id = f.friend_id
    WHERE f.user_id = ? AND f.status = 'friends' AND f.created_at > ? ORDER BY f.created_at DESC LIMIT 20`, me.id, since);
  for (const f of friends) out.push({ key: 'f' + f.uid, at: +f.created_at, who: f, href: `/u/${f.uid}`, text: 'is now your friend on insidejoke' });

  const lists = await all(`SELECT l.id, l.slug, l.title, l.created_at, u.id AS uid, u.name, u.color, u.seed, u.photo FROM lists l JOIN users u ON u.id = l.owner_id
    JOIN friends f ON f.friend_id = l.owner_id AND f.user_id = ? AND f.status = 'friends'
    WHERE l.visibility = 'public' AND l.surprise = 0 AND l.status = 'open' AND l.created_at > ? ORDER BY l.created_at DESC LIMIT 20`, me.id, since);
  for (const l of lists) out.push({ key: 'l' + l.id, at: +l.created_at, who: l, href: `/l/${l.slug}`, text: `started a new list, ${l.title}` });

  return out.sort((a, b) => b.at - a.at).slice(0, limit);
}

export async function unreadCount(me) {
  const seen = Number((await get('SELECT notif_seen_at FROM users WHERE id = ?', me.id))?.notif_seen_at || 0);
  return (await notificationsFor(me)).filter((n) => n.at > seen).length;
}
