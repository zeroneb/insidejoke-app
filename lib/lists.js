import { get, all } from './db';

export async function listBySlug(slug) {
  return (await get("SELECT * FROM lists WHERE slug = ? AND status <> 'deleted'", slug)) || null;
}

export async function owner(list) {
  return get('SELECT * FROM users WHERE id = ?', list.owner_id);
}

export async function itemsFor(listId) {
  const items = await all('SELECT * FROM items WHERE list_id = ? AND removed = 0 ORDER BY created_at ASC', listId);
  return Promise.all(items.map(withProgress));
}

export async function itemById(itemId) {
  const it = await get('SELECT * FROM items WHERE id = ? AND removed = 0', itemId);
  return it ? withProgress(it) : null;
}

export async function withProgress(it) {
  const row = await get('SELECT COALESCE(SUM(amount_cents),0) AS cents, COALESCE(SUM(units),0) AS units, COUNT(DISTINCT giver_id) AS givers FROM contributions WHERE item_id = ?', it.id);
  const unlimited = it.quantity === 0;
  const target = unlimited ? 0 : it.price_cents * it.quantity;
  const pct = unlimited ? 0 : Math.min(100, Math.floor((row.cents / Math.max(1, target)) * 100));
  const remaining = unlimited ? 0 : Math.max(0, target - row.cents);
  return { ...it, unlimited, target, raised: row.cents, timesTreated: row.units, givers: row.givers, pct, remaining, covered: !unlimited && remaining === 0 };
}

export function label(it) {
  if (it.unlimited) return it.timesTreated ? `×${it.timesTreated}` : 'Unlimited';
  if (it.covered) return 'All covered';
  if (it.pct === 0) return 'Up for grabs';
  return `${it.pct}% covered`;
}

export async function notesFor(itemId, viewerIsOwner) {
  const rows = await all(`SELECT c.*, u.name, u.color, u.seed FROM contributions c JOIN users u ON u.id = c.giver_id WHERE c.item_id = ? ORDER BY c.created_at DESC`, itemId);
  return rows.filter((r) => viewerIsOwner || r.visibility === 'public');
}

export async function listsOwnedBy(userId) {
  return all("SELECT * FROM lists WHERE owner_id = ? AND status = 'open' ORDER BY created_at DESC", userId);
}

export async function lately(userId) {
  // Activity on your lists: never amounts. The owner sees who gave, friends never see private gifts.
  // Surprise lists stay out until the reveal.
  return all(`SELECT c.id, c.note, c.units, c.created_at, c.visibility, u.id AS giver_id, u.name, u.color, u.seed, u.photo, i.id AS item_id, i.name AS item_name, i.store, i.quantity, i.price_cents, l.slug, l.title, l.id AS list_id
    FROM contributions c JOIN items i ON i.id = c.item_id JOIN lists l ON l.id = c.list_id JOIN users u ON u.id = c.giver_id
    WHERE l.owner_id = ? AND l.status <> 'deleted' AND l.surprise = 0 ORDER BY c.created_at DESC LIMIT 20`, userId);
}

// ---- a1 additions: friends, profiles ----
export async function friendsOf(userId) {
  return all(`SELECT u.*, f.created_at AS friends_since FROM friends f JOIN users u ON u.id = f.friend_id WHERE f.user_id = ? AND f.status = 'friends' ORDER BY u.name ASC`, userId);
}

export async function areFriends(a, b) {
  return !!(await get("SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ? AND status = 'friends'", a, b));
}

// Lists a viewer may see on someone's profile: open, own (not collab, not surprise) lists.
// Public for everyone; private ones only for people the owner picked (list_members viewers).
export async function publicListsOf(userId, viewerId) {
  const rows = await all("SELECT * FROM lists WHERE owner_id = ? AND status = 'open' AND surprise = 0 AND for_who = 'me' ORDER BY created_at DESC", userId);
  const out = [];
  for (const l of rows) {
    if (l.visibility === 'public' || viewerId === userId) out.push(l);
    else if (viewerId && (await get('SELECT 1 FROM list_members WHERE list_id = ? AND user_id = ?', l.id, viewerId))) out.push(l);
  }
  return out;
}

// Things friends added lately to their open, non-surprise lists (shown in Lately as "+1").
export async function friendsLately(userId) {
  return all(`SELECT i.id AS item_id, i.name AS item_name, i.store, i.created_at, u.id AS giver_id, u.name, u.color, u.seed, u.photo, l.slug, l.title, l.for_who, l.owner_id
    FROM items i JOIN lists l ON l.id = i.list_id JOIN users u ON u.id = COALESCE(i.added_by, l.owner_id)
    JOIN friends f ON f.friend_id = u.id AND f.user_id = ? AND f.status = 'friends'
    WHERE i.removed = 0 AND l.status = 'open' AND l.surprise = 0 AND l.visibility = 'public'
    ORDER BY i.created_at DESC LIMIT 10`, userId);
}

// Gifts between two people, both ways, no amounts.
export async function between(a, b) {
  return all(`SELECT c.id, c.giver_id, c.units, c.created_at, i.name AS item_name, i.store, i.quantity, l.owner_id, l.title, l.slug, l.surprise
    FROM contributions c JOIN items i ON i.id = c.item_id JOIN lists l ON l.id = c.list_id
    WHERE ((c.giver_id = ? AND l.owner_id = ?) OR (c.giver_id = ? AND l.owner_id = ?)) AND l.for_who = 'me' AND l.surprise = 0
    ORDER BY c.created_at DESC`, a, b, b, a);
}

export async function profileStats(userId) {
  const lists = (await get("SELECT COUNT(*) AS n FROM lists WHERE owner_id = ? AND status = 'open'", userId)).n;
  const friends = (await get("SELECT COUNT(*) AS n FROM friends WHERE user_id = ? AND status = 'friends'", userId)).n;
  const items = await all('SELECT i.* FROM items i JOIN lists l ON l.id = i.list_id WHERE l.owner_id = ? AND i.removed = 0 AND i.quantity > 0', userId);
  let covered = 0;
  for (const it of items) if ((await withProgress(it)).covered) covered++;
  return { lists, friends, covered };
}

export const money = (cents) => '$' + (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);

// An item saved with a link but no photo: try the link once and keep what it gives.
export async function ensureItemPhoto(it) {
  const mins = Math.floor(Date.now() / 60000);
  if (!it || it.photo || !it.url || (it.photo_tried > 1 && mins - it.photo_tried < 360)) return it;
  const { run } = await import('./db');
  await run('UPDATE items SET photo_tried = ? WHERE id = ?', mins, it.id);
  try {
    const { fetchLink } = await import('./fetchlink');
    const r = await fetchLink(it.url);
    if (r.ok && r.photo) { await run('UPDATE items SET photo = ? WHERE id = ?', r.photo, it.id); return { ...it, photo: r.photo }; }
  } catch {}
  return it;
}

// A friend's profile "Lately": only what happened on lists the viewer can already see.
// New lists, things added, things covered. Never who gave or how much.
export async function profileLately(lists, limit = 5) {
  const ev = [];
  for (const l of lists) {
    ev.push({ key: 'l' + l.id, at: Number(l.created_at), kind: 'list', title: l.title, href: `/l/${l.slug}` });
    const items = await all(`SELECT i.id, i.name, i.created_at, i.quantity, i.price_cents,
        (SELECT COALESCE(SUM(amount_cents),0) FROM contributions c WHERE c.item_id = i.id) AS got,
        (SELECT MAX(created_at) FROM contributions c WHERE c.item_id = i.id) AS last_at
      FROM items i WHERE i.list_id = ? AND i.removed = 0`, l.id);
    for (const i of items) {
      if (Number(i.created_at) - Number(l.created_at) > 60000) ev.push({ key: 'a' + i.id, at: Number(i.created_at), kind: 'added', item: i.name, title: l.title, href: `/l/${l.slug}/i/${i.id}` });
      if (i.quantity > 0 && Number(i.got) >= i.price_cents * i.quantity && i.last_at) ev.push({ key: 'c' + i.id, at: Number(i.last_at), kind: 'covered', item: i.name, title: l.title, href: `/l/${l.slug}/i/${i.id}` });
    }
  }
  return ev.sort((a, b) => b.at - a.at).slice(0, limit);
}

// Friend count, and how many of them the viewer also knows.
export async function friendCounts(userId, viewerId) {
  const n = Number((await get("SELECT COUNT(*) AS n FROM friends WHERE user_id = ? AND status = 'friends'", userId)).n);
  const mutual = viewerId && viewerId !== userId ? Number((await get(`SELECT COUNT(*) AS n FROM friends a JOIN friends b ON b.friend_id = a.friend_id
    WHERE a.user_id = ? AND a.status = 'friends' AND b.user_id = ? AND b.status = 'friends'`, userId, viewerId)).n) : 0;
  return { n, mutual };
}

// Replies (comments) on gifts or Lately rows, keyed by the row's key (a contribution id, or "i:<item id>").
export async function commentsFor(keys) {
  if (!keys.length) return {};
  const rows = await all(`SELECT m.ref_key, m.body, m.created_at, u.id AS uid, u.name FROM messages m JOIN users u ON u.id = m.from_id
    WHERE m.kind = 'reply' AND m.ref_key IN (${keys.map(() => '?').join(',')}) ORDER BY m.created_at ASC`, ...keys);
  const out = {};
  for (const r of rows) (out[r.ref_key] ||= []).push(r);
  return out;
}
