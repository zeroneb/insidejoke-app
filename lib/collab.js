import { get, all, run, id, now } from './db';
import { withProgress } from './lists';

// Collaborative lists: lists.for_who = 'other' with rows in list_members.
// The owner (organiser) and every member can add, edit and fund.

// Invited to help build this list: the organiser (or a member) sent this number a collab invite.
export async function isInvited(list, me) {
  if (!list || !me) return false;
  return !!(await get('SELECT 1 FROM list_shares WHERE list_id = ? AND phone = ? AND collab = 1', list.id, me.phone));
}

export async function isMember(listId, userId) {
  if (!userId) return false;
  return !!(await get('SELECT 1 FROM list_members WHERE list_id = ? AND user_id = ?', listId, userId));
}

export async function canEdit(list, user) {
  if (!user) return false;
  return list.owner_id === user.id || (await isMember(list.id, user.id));
}

export async function addMember(listId, userId, role = 'collaborator') {
  await run('INSERT INTO list_members (list_id, user_id, role, created_at) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING', listId, userId, role, now());
}

// Owner first, then members in the order they joined.
export async function membersOf(listId) {
  return all(`SELECT u.*, m.role, m.created_at AS joined_at FROM list_members m JOIN users u ON u.id = m.user_id WHERE m.list_id = ? ORDER BY m.created_at ASC`, listId);
}

export async function teamOf(list) {
  const o = await get('SELECT * FROM users WHERE id = ?', list.owner_id);
  const members = await membersOf(list.id);
  return [{ ...o, role: 'organiser' }, ...members.filter((m) => m.id !== o.id)];
}

// Items with who added them (added_by falls back to the owner for older rows).
export async function itemsWithAdder(list) {
  const rows = await all(`SELECT i.*, u.name AS adder_name, u.color AS adder_color, u.seed AS adder_seed, u.id AS adder_id
    FROM items i LEFT JOIN users u ON u.id = COALESCE(i.added_by, ?) WHERE i.list_id = ? AND i.removed = 0 ORDER BY i.created_at ASC`, list.owner_id, list.id);
  return Promise.all(rows.map(withProgress));
}

// Everyone a text blast or reminder goes to: shares, members and givers. Never the sender, never the surprise's receiver.
export async function recipientsOf(list, exceptUserId) {
  const shares = await all('SELECT phone FROM list_shares WHERE list_id = ?', list.id);
  const members = await all('SELECT u.phone, u.id FROM list_members m JOIN users u ON u.id = m.user_id WHERE m.list_id = ?', list.id);
  const givers = await all('SELECT DISTINCT u.phone, u.id FROM contributions c JOIN users u ON u.id = c.giver_id WHERE c.list_id = ?', list.id);
  const owner = await get('SELECT phone, id FROM users WHERE id = ?', list.owner_id);
  const skip = new Set();
  if (exceptUserId) {
    const u = await get('SELECT phone FROM users WHERE id = ?', exceptUserId);
    if (u) skip.add(u.phone);
  }
  if (list.recipient_phone) skip.add(list.recipient_phone);
  const out = new Map();
  for (const r of [...members, ...givers, owner, ...shares]) if (r?.phone && !skip.has(r.phone) && !r.phone.startsWith('deleted:') && !out.get(r.phone)) out.set(r.phone, r.id || null);
  return [...out].map(([phone, userId]) => ({ phone, userId }));
}

export async function giversOf(listId) {
  return all('SELECT DISTINCT u.* FROM contributions c JOIN users u ON u.id = c.giver_id WHERE c.list_id = ? ORDER BY u.name', listId);
}

export async function saveBlast(list, fromId, body, recipients, pinned) {
  const bid = id();
  await run('INSERT INTO blasts (id, list_id, from_id, body, recipients, pinned, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', bid, list.id, fromId, body, recipients, pinned ? 1 : 0, now());
  if (pinned) await run('UPDATE blasts SET pinned = 0 WHERE list_id = ? AND id <> ?', list.id, bid);
  return bid;
}

// The latest pinned text blast on a list (shown at the top of the owner's list page).
export async function latestBlast(listId) {
  return (await get(`SELECT b.*, u.name, u.color, u.seed FROM blasts b JOIN users u ON u.id = b.from_id WHERE b.list_id = ? AND b.pinned = 1 ORDER BY b.created_at DESC LIMIT 1`, listId)) || null;
}

export async function unpinBlast(blastId) {
  await run('UPDATE blasts SET pinned = 0 WHERE id = ?', blastId);
}

export async function listProgress(listId) {
  const rows = await all('SELECT * FROM items WHERE list_id = ? AND removed = 0 AND quantity > 0', listId);
  const items = await Promise.all(rows.map(withProgress));
  const target = items.reduce((s, it) => s + it.target, 0);
  const raised = items.reduce((s, it) => s + Math.min(it.raised, it.target), 0);
  const pct = target ? Math.min(100, Math.floor((raised / target) * 100)) : 0;
  return { items, target, raised, pct, covered: items.filter((it) => it.covered).length, short: items.filter((it) => !it.covered).length };
}

export const firstName = (u) => ((u?.name || 'A friend').trim().split(/\s+/)[0]);
export const whoFor = (list) => list.recipient_name || list.title;

// ---- r4: PartlyFunded "Move money": shift what was given between gifts that are not fully covered,
// so one more gift is fully covered. Percentages only, never amounts.
export async function movePlan(listId) {
  const p = await listProgress(listId);
  const open = p.items.filter((it) => !it.covered);
  const targets = open.map((t) => {
    const need = t.remaining;
    const sources = open.filter((s) => s.id !== t.id && s.raised > 0).sort((a, b) => a.pct - b.pct || a.raised - b.raised);
    const pool = sources.reduce((s, x) => s + x.raised, 0);
    const ok = need > 0 && pool >= need;
    const takes = [];
    let left = need;
    for (const s of sources) {
      if (!ok || left <= 0) break;
      const take = Math.min(s.raised, left);
      left -= take;
      takes.push({ id: s.id, name: s.name, take, after: Math.floor(((s.raised - take) / Math.max(1, s.target)) * 100) });
    }
    return { id: t.id, name: t.name, pct: t.pct, need, ok, takes, others: sources.length };
  });
  targets.sort((a, b) => (b.ok - a.ok) || (b.pct - a.pct));
  return { progress: p, targets, any: targets.some((t) => t.ok) };
}

// Move contributions (newest first, splitting one if needed) from the plan's sources onto the target.
export async function moveMoney(listId, targetId) {
  const plan = await movePlan(listId);
  const t = plan.targets.find((x) => x.id === targetId && x.ok);
  if (!t) return false;
  for (const s of t.takes) {
    let left = s.take;
    const rows = await all('SELECT * FROM contributions WHERE item_id = ? ORDER BY created_at DESC', s.id);
    for (const c of rows) {
      if (left <= 0) break;
      if (c.amount_cents <= left) {
        await run('UPDATE contributions SET item_id = ? WHERE id = ?', targetId, c.id);
        left -= c.amount_cents;
      } else {
        await run('UPDATE contributions SET amount_cents = amount_cents - ? WHERE id = ?', left, c.id);
        await run('INSERT INTO contributions (id, item_id, list_id, giver_id, amount_cents, units, note, visibility, payment_ref, created_at) VALUES (?, ?, ?, ?, ?, 0, NULL, ?, ?, ?)',
          id(), targetId, listId, c.giver_id, left, c.visibility, c.payment_ref, c.created_at);
        left = 0;
      }
    }
  }
  return true;
}

// ---- r4: SharedList "Looks like a match". Two items match when their names agree before any comma or bracket.
const baseName = (n = '') => n.toLowerCase().split(/[,(]/)[0].replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
export function findMatch(items) {
  for (let i = 1; i < items.length; i++) {
    const b = items[i];
    if (b.keep_both || b.unlimited) continue;
    const a = items.slice(0, i).find((x) => !x.unlimited && baseName(x.name) && baseName(x.name) === baseName(b.name));
    if (a) return { keep: a, dupe: b };
  }
  return null;
}

// Merge: the newer item's gifts move onto the older one (progress from both), the newer one is removed.
export async function mergeItems(listId, keepId, dupeId) {
  const a = await get('SELECT id FROM items WHERE id = ? AND list_id = ? AND removed = 0', keepId, listId);
  const b = await get('SELECT id FROM items WHERE id = ? AND list_id = ? AND removed = 0', dupeId, listId);
  if (!a || !b || a.id === b.id) return false;
  await run('UPDATE contributions SET item_id = ? WHERE item_id = ?', a.id, b.id);
  await run('UPDATE items SET removed = 1 WHERE id = ?', b.id);
  return true;
}
