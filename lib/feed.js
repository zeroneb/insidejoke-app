import { get, all } from './db';
import { lately, withProgress, areFriends } from './lists';

// Lately feeds. Row keys: a contribution id (a gift on your list), "i:<item>" (something added),
// "l:<list>" (a new list), "c:<item>" (a friend's wish all covered). Comments and reactions hang off the key.
// Privacy: private lists only ever show on their creator's own Lately; surprises never; no amounts, no private givers.

const WEEK2 = 14 * 24 * 3600 * 1000;
const giver = (r) => ({ id: r.uid, name: r.name, color: r.color, seed: r.seed, photo: r.photo });
// Items saved while a list was being made are part of "new list", not their own rows.
const AFTER_LIST = 60000;

// Gifts on your lists: treats on the same item grouped into one row.
async function giftRows(meId) {
  const groups = new Map();
  const out = [];
  for (const g of await lately(meId)) {
    if (g.quantity === 0) {
      if (!groups.has(g.item_id)) {
        const e = { kind: 'treat', key: g.id, item_id: g.item_id, item_name: g.item_name, store: g.store, slug: g.slug, created_at: Number(g.created_at), givers: [], units: 0, note: null, noteBy: null, noteAt: null, private: false };
        groups.set(g.item_id, e);
        out.push(e);
      }
      const e = groups.get(g.item_id);
      if (!e.givers.find((x) => x.id === g.giver_id)) e.givers.push({ id: g.giver_id, name: g.name, color: g.color, seed: g.seed, photo: g.photo });
      e.units += g.units;
      if (g.visibility === 'private') e.private = true;
      if (g.note && !e.note) { e.note = g.note; e.noteBy = g.name; e.noteAt = g.created_at; }
    } else {
      const it = await withProgress(await get('SELECT * FROM items WHERE id = ?', g.item_id));
      const last = (await get('SELECT id FROM contributions WHERE item_id = ? ORDER BY created_at DESC LIMIT 1', g.item_id)).id === g.id;
      out.push({ kind: 'wish', key: g.id, item_id: g.item_id, item_name: g.item_name, slug: g.slug, created_at: Number(g.created_at), givers: [{ id: g.giver_id, name: g.name, color: g.color, seed: g.seed, photo: g.photo }], note: g.note, pct: it.pct, finished: it.covered && last, private: g.visibility === 'private' });
    }
  }
  return out;
}

const listRow = (r) => ({ kind: 'list', key: 'l:' + r.id, slug: r.slug, title: r.title, for_name: r.for_who !== 'me' ? r.recipient_name : null, created_at: Number(r.created_at), givers: [giver(r)] });
const addRow = (r) => ({ kind: 'added', key: 'i:' + r.item_id, item_id: r.item_id, item_name: r.item_name, slug: r.slug, title: r.title, created_at: Number(r.created_at), givers: [giver(r)] });

// Your profile Lately: gifts on your lists plus your own new lists and things you added.
export async function myFeed(me) {
  const lists = await all(`SELECT l.*, u.id AS uid, u.name, u.color, u.seed, u.photo FROM lists l JOIN users u ON u.id = l.owner_id
    WHERE l.owner_id = ? AND l.status = 'open' AND l.surprise = 0 ORDER BY l.created_at DESC LIMIT 10`, me.id);
  const adds = await all(`SELECT i.id AS item_id, i.name AS item_name, i.created_at, l.slug, l.title, l.created_at AS list_at, u.id AS uid, u.name, u.color, u.seed, u.photo
    FROM items i JOIN lists l ON l.id = i.list_id JOIN users u ON u.id = COALESCE(i.added_by, l.owner_id)
    WHERE u.id = ? AND i.removed = 0 AND l.status = 'open' AND l.surprise = 0 AND (l.visibility = 'public' OR l.owner_id = ?)
    ORDER BY i.created_at DESC LIMIT 15`, me.id, me.id);
  return [
    ...(await giftRows(me.id)),
    ...lists.map(listRow),
    ...adds.filter((a) => Number(a.created_at) - Number(a.list_at) > AFTER_LIST).map(addRow),
  ];
}

// The Friends tab: friends' public, non-surprise activity. New lists, things added, wishes all covered.
export async function friendsFeed(meId) {
  const F = "JOIN friends f ON f.friend_id = u.id AND f.user_id = ? AND f.status = 'friends'";
  const lists = await all(`SELECT l.*, u.id AS uid, u.name, u.color, u.seed, u.photo FROM lists l JOIN users u ON u.id = l.owner_id ${F}
    WHERE l.status = 'open' AND l.surprise = 0 AND l.visibility = 'public' ORDER BY l.created_at DESC LIMIT 15`, meId);
  const adds = await all(`SELECT i.id AS item_id, i.name AS item_name, i.created_at, l.slug, l.title, l.created_at AS list_at, u.id AS uid, u.name, u.color, u.seed, u.photo
    FROM items i JOIN lists l ON l.id = i.list_id JOIN users u ON u.id = COALESCE(i.added_by, l.owner_id) ${F}
    WHERE i.removed = 0 AND l.status = 'open' AND l.surprise = 0 AND l.visibility = 'public' ORDER BY i.created_at DESC LIMIT 20`, meId);
  const cov = await all(`SELECT i.*, l.slug, u.id AS uid, u.name AS uname, u.color, u.seed, u.photo, MAX(c.created_at) AS last_at
    FROM contributions c JOIN items i ON i.id = c.item_id JOIN lists l ON l.id = c.list_id JOIN users u ON u.id = l.owner_id ${F}
    WHERE i.quantity > 0 AND i.removed = 0 AND l.status = 'open' AND l.surprise = 0 AND l.visibility = 'public' AND c.created_at > ?
    GROUP BY i.id, l.slug, u.id, u.name, u.color, u.seed, u.photo ORDER BY last_at DESC LIMIT 8`, meId, Date.now() - WEEK2);
  const covered = [];
  for (const r of cov) {
    if (!(await withProgress(r)).covered) continue;
    covered.push({ kind: 'fcovered', key: 'c:' + r.id, item_id: r.id, item_name: r.name, slug: r.slug, created_at: Number(r.last_at), givers: [{ id: r.uid, name: r.uname, color: r.color, seed: r.seed, photo: r.photo }] });
  }
  return [
    ...lists.map(listRow),
    ...adds.filter((a) => Number(a.created_at) - Number(a.list_at) > AFTER_LIST).map(addRow),
    ...covered,
  ];
}

// Who may see (and so react to or comment on) a feed row. Same rules as the feeds above.
export async function feedRowFor(meId, key) {
  const ok = async (uid) => uid === meId || areFriends(meId, uid);
  const t = key.slice(0, 2);
  const ref = key.slice(2);
  if (t === 'i:') {
    const r = await get(`SELECT i.name AS item_name, l.id AS list_id, l.slug, l.owner_id, l.visibility, COALESCE(i.added_by, l.owner_id) AS uid
      FROM items i JOIN lists l ON l.id = i.list_id WHERE i.id = ? AND l.status <> 'deleted' AND l.surprise = 0`, ref);
    if (!r) return null;
    if (r.visibility !== 'public') return r.owner_id === meId && r.uid === meId ? r : null;
    return (await ok(r.uid)) ? r : null;
  }
  if (t === 'l:') {
    const r = await get(`SELECT title AS item_name, id AS list_id, slug, owner_id, visibility, owner_id AS uid FROM lists WHERE id = ? AND status <> 'deleted' AND surprise = 0`, ref);
    if (!r) return null;
    if (r.visibility !== 'public') return r.owner_id === meId ? r : null;
    return (await ok(r.uid)) ? r : null;
  }
  if (t === 'c:') {
    const r = await get(`SELECT i.name AS item_name, l.id AS list_id, l.slug, l.owner_id, l.owner_id AS uid
      FROM items i JOIN lists l ON l.id = i.list_id WHERE i.id = ? AND l.status <> 'deleted' AND l.surprise = 0 AND l.visibility = 'public'`, ref);
    return r && (await ok(r.uid)) ? r : null;
  }
  // A gift on one of your lists: only the list's owner. The giver is who you reply to.
  const r = await get(`SELECT i.name AS item_name, l.id AS list_id, l.slug, l.owner_id, c.giver_id AS uid
    FROM contributions c JOIN lists l ON l.id = c.list_id JOIN items i ON i.id = c.item_id WHERE c.id = ?`, key);
  return r && r.owner_id === meId ? r : null;
}

// Reactions per row: most-used emoji, total count, the viewer's own picks, and when someone else last reacted.
export async function reactionsFor(keys, meId) {
  if (!keys.length) return {};
  const rows = await all(`SELECT contribution_id, emoji, user_id, created_at FROM reactions WHERE contribution_id IN (${keys.map(() => '?').join(',')})`, ...keys);
  const out = {};
  for (const r of rows) {
    const e = (out[r.contribution_id] ||= { count: 0, by: {}, mine: [], at: 0 });
    e.count += 1;
    e.by[r.emoji] = (e.by[r.emoji] || 0) + 1;
    if (r.user_id === meId) e.mine.push(r.emoji);
    else e.at = Math.max(e.at, Number(r.created_at) || 0);
  }
  for (const e of Object.values(out)) e.list = Object.entries(e.by).sort((x, y) => y[1] - x[1]).map(([emoji, n]) => ({ emoji, n }));
  return out;
}
