import { db } from './db';

export function listBySlug(slug) {
  return db().prepare('SELECT * FROM lists WHERE slug = ?').get(slug) || null;
}

export function owner(list) {
  return db().prepare('SELECT * FROM users WHERE id = ?').get(list.owner_id);
}

export function itemsFor(listId) {
  const items = db().prepare('SELECT * FROM items WHERE list_id = ? AND removed = 0 ORDER BY created_at ASC').all(listId);
  return items.map(withProgress);
}

export function itemById(itemId) {
  const it = db().prepare('SELECT * FROM items WHERE id = ? AND removed = 0').get(itemId);
  return it ? withProgress(it) : null;
}

export function withProgress(it) {
  const row = db().prepare('SELECT COALESCE(SUM(amount_cents),0) AS cents, COALESCE(SUM(units),0) AS units, COUNT(DISTINCT giver_id) AS givers FROM contributions WHERE item_id = ?').get(it.id);
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

export function notesFor(itemId, viewerIsOwner) {
  const rows = db().prepare(`SELECT c.*, u.name, u.color, u.seed FROM contributions c JOIN users u ON u.id = c.giver_id WHERE c.item_id = ? ORDER BY c.created_at DESC`).all(itemId);
  return rows.filter((r) => viewerIsOwner || r.visibility === 'public');
}

export function listsOwnedBy(userId) {
  return db().prepare("SELECT * FROM lists WHERE owner_id = ? AND status = 'open' ORDER BY created_at DESC").all(userId);
}

export function lately(userId) {
  // Activity on your lists: never amounts. Private gifts show as "someone" to the owner? No: the owner sees who.
  return db().prepare(`SELECT c.id, c.note, c.units, c.created_at, c.visibility, u.name, u.color, u.seed, i.name AS item_name, i.quantity, l.slug, l.title
    FROM contributions c JOIN items i ON i.id = c.item_id JOIN lists l ON l.id = c.list_id JOIN users u ON u.id = c.giver_id
    WHERE l.owner_id = ? ORDER BY c.created_at DESC LIMIT 20`).all(userId);
}

export const money = (cents) => '$' + (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
