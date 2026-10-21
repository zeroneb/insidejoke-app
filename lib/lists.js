import { get, all } from './db';

export async function listBySlug(slug) {
  return (await get('SELECT * FROM lists WHERE slug = ?', slug)) || null;
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
  return all(`SELECT c.id, c.note, c.units, c.created_at, c.visibility, u.name, u.color, u.seed, i.id AS item_id, i.name AS item_name, i.quantity, i.price_cents, l.slug, l.title
    FROM contributions c JOIN items i ON i.id = c.item_id JOIN lists l ON l.id = c.list_id JOIN users u ON u.id = c.giver_id
    WHERE l.owner_id = ? ORDER BY c.created_at DESC LIMIT 20`, userId);
}

export const money = (cents) => '$' + (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
