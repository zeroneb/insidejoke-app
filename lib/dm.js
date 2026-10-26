import { all, get, run } from './db';

// Direct messages between two friends. They live in the app only: nothing here sends a text.

export async function areFriends(meId, otherId) {
  if (!meId || !otherId || meId === otherId) return false;
  return !!(await get("SELECT 1 AS ok FROM friends WHERE user_id = ? AND friend_id = ? AND status = 'friends'", meId, otherId));
}

// Oldest first, so the newest sits at the bottom of the thread.
export async function threadBetween(meId, otherId, limit = 200) {
  const rows = await all(`SELECT * FROM dm_messages WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)
    ORDER BY created_at DESC LIMIT ?`, meId, otherId, otherId, meId, limit);
  return rows.reverse();
}

export async function markThreadRead(meId, otherId) {
  await run('UPDATE dm_messages SET read_at = ? WHERE to_id = ? AND from_id = ? AND read_at IS NULL', Date.now(), meId, otherId);
}

// One row per person you've messaged with: their latest message, newest conversation first.
export async function inboxFor(meId) {
  const latest = await all(`SELECT DISTINCT ON (p) p, id, from_id, body, created_at FROM (
      SELECT CASE WHEN from_id = ? THEN to_id ELSE from_id END AS p, id, from_id, body, created_at
      FROM dm_messages WHERE from_id = ? OR to_id = ?) x
    ORDER BY p, created_at DESC`, meId, meId, meId);
  if (!latest.length) return [];
  const ids = latest.map((r) => r.p);
  const marks = ids.map(() => '?').join(', ');
  const users = await all(`SELECT id, name, color, seed, photo FROM users WHERE id IN (${marks})`, ...ids);
  const unread = await all(`SELECT from_id, COUNT(*) AS n FROM dm_messages WHERE to_id = ? AND read_at IS NULL GROUP BY from_id`, meId);
  const byId = Object.fromEntries(users.map((u) => [u.id, u]));
  const un = Object.fromEntries(unread.map((u) => [u.from_id, Number(u.n)]));
  return latest
    .filter((r) => byId[r.p])
    .map((r) => ({ user: byId[r.p], body: r.body, at: +r.created_at, mine: r.from_id === meId, unread: un[r.p] || 0 }))
    .sort((a, b) => b.at - a.at);
}

export async function unreadDmCount(meId) {
  return Number((await get('SELECT COUNT(*) AS n FROM dm_messages WHERE to_id = ? AND read_at IS NULL', meId))?.n || 0);
}
