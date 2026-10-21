import { get, all, run, id, now } from './db';
import { sendText, appUrl } from './texts';
import { recipientsOf, listProgress, whoFor, firstName } from './collab';

// Reminders: rows in `reminders`, sent by runReminders() (cron, or the button on /dev/texts in test mode).
//  - a shared list with no date: 'week_after' (7 days after shared_at)
//  - a shared list with a date: 'week_after' + 'before_date' (2 hours before the gift-by moment)
//  - a sent surprise: 'surprise_unopened' 1 day and 3 days after sent_at (to the receiver, only if unopened)
// Reminders never single anyone out: people who already gave get a progress update instead.

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// The gift-by moment: the list's date at 6 pm (server time; lists.timezone is not used yet).
export function giftByAt(list) {
  if (!list.date || !/^\d{4}-\d{2}-\d{2}$/.test(list.date)) return null;
  const [y, m, d] = list.date.split('-').map(Number);
  return new Date(y, m - 1, d, 18, 0, 0).getTime();
}

async function ensure(listId, kind, dueAt) {
  const row = await get('SELECT id, sent_at FROM reminders WHERE list_id = ? AND kind = ? AND due_at = ?', listId, kind, dueAt);
  if (row) return;
  // A changed date replaces the unsent reminder of the same kind.
  await run('DELETE FROM reminders WHERE list_id = ? AND kind = ? AND sent_at IS NULL', listId, kind);
  await run('INSERT INTO reminders (id, list_id, kind, due_at, sent_at, created_at) VALUES (?, ?, ?, ?, NULL, ?)', id(), listId, kind, dueAt, now());
}

export async function scheduleReminders(list) {
  const l = (await get('SELECT * FROM lists WHERE id = ?', list.id)) || list;
  const merged = { ...l, ...list };
  if (merged.shared_at) await ensure(merged.id, 'week_after', merged.shared_at + 7 * DAY);
  const at = giftByAt(merged);
  if (merged.shared_at && at) await ensure(merged.id, 'before_date', at - 2 * HOUR);
  else if (!at) await run("DELETE FROM reminders WHERE list_id = ? AND kind = 'before_date' AND sent_at IS NULL", merged.id);
  if (merged.surprise && merged.sent_at) {
    const has = await all("SELECT due_at FROM reminders WHERE list_id = ? AND kind = 'surprise_unopened'", merged.id);
    const want = [merged.sent_at + DAY, merged.sent_at + 3 * DAY];
    for (const due of want) if (!has.some((r) => r.due_at === due)) await run('INSERT INTO reminders (id, list_id, kind, due_at, sent_at, created_at) VALUES (?, ?, ?, ?, NULL, ?)', id(), merged.id, 'surprise_unopened', due, now());
  }
}

export async function remindersFor(listId) {
  return all('SELECT * FROM reminders WHERE list_id = ? ORDER BY due_at ASC', listId);
}

// What a reminder says. `gave` = this person already gave (gets a progress update instead).
export async function reminderText(list, kind, { gave = false, nth = 1 } = {}) {
  const o = await get('SELECT * FROM users WHERE id = ?', list.owner_id);
  const link = `${appUrl()}/l/${list.slug}`;
  const p = await listProgress(list.id);
  const name = list.for_who === 'other' ? whoFor(list) : firstName(o);
  if (kind === 'surprise_unopened') {
    const tok = list.reveal_token;
    return nth === 1
      ? `Your friends are waiting for you to open your surprise 🎁 ${appUrl()}/reveal/${tok}`
      : `Your surprise is still wrapped 🎀 Open it whenever you're ready: ${appUrl()}/reveal/${tok}`;
  }
  const hush = list.surprise ? ' 🤫 Keep it secret.' : '';
  if (gave) return `${name}'s list is ${p.pct}% covered, thanks to you and others 💐 ${link}${hush}`;
  if (kind === 'before_date') {
    return list.for_who === 'other'
      ? `${name}'s gift-by date is in 2 hours. ${p.pct}% covered. Still time to chip in: ${link}${hush}`
      : `${name}'s day is almost here. Still time to give: ${link}`;
  }
  return list.for_who === 'other'
    ? `${firstName(o)} is getting gifts for ${name} 💐 Add something or chip in: ${link}${hush}`
    : `${firstName(o)}'s list is ${p.pct}% covered so far. See what's left: ${link}`;
}

// Send every due, unsent reminder. Returns how many texts went out.
export async function runReminders() {
  const due = await all(`SELECT r.*, l.id AS lid FROM reminders r JOIN lists l ON l.id = r.list_id WHERE r.sent_at IS NULL AND r.due_at <= ? ORDER BY r.due_at ASC`, now());
  let texts = 0;
  for (const r of due) {
    const list = await get('SELECT * FROM lists WHERE id = ?', r.list_id);
    const o = await get('SELECT * FROM users WHERE id = ?', list.owner_id);
    const mark = () => run('UPDATE reminders SET sent_at = ? WHERE id = ?', now(), r.id);
    // Archived lists and owners who turned reminders off: mark and skip.
    if (list.status !== 'open' || o?.notify_reminders === 0) { await mark(); continue; }
    if (r.kind === 'surprise_unopened') {
      if (!list.opened_at && list.recipient_phone && list.reveal_token) {
        const nth = (await get("SELECT COUNT(*) AS n FROM reminders WHERE list_id = ? AND kind = 'surprise_unopened' AND sent_at IS NOT NULL", list.id)).n + 1;
        await sendText(list.recipient_phone, await reminderText(list, r.kind, { nth }), 'reminder');
        texts++;
      }
      await mark();
      continue;
    }
    // Once a surprise has gone out (or been claimed) the group reminders are moot.
    if (list.sent_at || list.claimed_at) { await mark(); continue; }
    // Never remind the receiver of a surprise; everyone else on the list hears.
    const gaveRows = await all('SELECT DISTINCT u.phone FROM contributions c JOIN users u ON u.id = c.giver_id WHERE c.list_id = ?', list.id);
    const gave = new Set(gaveRows.map((g) => g.phone));
    const people = await recipientsOf(list, list.for_who === 'other' ? null : list.owner_id);
    for (const p of people) {
      await sendText(p.phone, await reminderText(list, r.kind, { gave: gave.has(p.phone) }), 'reminder');
      texts++;
    }
    await mark();
  }
  return { reminders: due.length, texts };
}

// Weekly digest: owners who chose weekly thank-yous (users.weekly_thanks = 1) get one text a week
// naming the friends who gave and have not been thanked yet. Never amounts.
export async function runWeeklyDigest() {
  const owners = await all('SELECT * FROM users WHERE weekly_thanks = 1');
  let texts = 0;
  for (const o of owners) {
    if (o.phone.startsWith('deleted:')) continue;
    const last = await get("SELECT MAX(created_at) AS t FROM texts WHERE to_phone = ? AND kind = 'digest'", o.phone);
    if (last?.t && now() - last.t < 6.5 * DAY) continue;
    const rows = await all(`SELECT DISTINCT u.name FROM contributions c JOIN lists l ON l.id = c.list_id JOIN users u ON u.id = c.giver_id
      WHERE l.owner_id = ? AND c.thanked_at IS NULL AND c.created_at >= ?`, o.id, now() - 7 * DAY);
    if (!rows.length) continue;
    const names = rows.map((r) => firstName(r));
    const who = names.length <= 3 ? names.join(', ').replace(/, ([^,]*)$/, ' and $1') : `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
    await sendText(o.phone, `This week ${who} gave on your lists 💛 Thank them all at once: ${appUrl()}/home`, 'digest');
    texts++;
  }
  return { texts };
}

// ---- a3: weekly thank-you for treats (/you/thanks) ----
// Treats (unlimited items) given to this owner in the last 7 days and not yet thanked.
export async function weeklyTreats(ownerId) {
  const rows = await all(`SELECT c.id, c.list_id, c.units, c.giver_id, c.created_at, c.visibility, i.name AS item_name, u.name, u.phone, u.color, u.seed
    FROM contributions c JOIN items i ON i.id = c.item_id JOIN lists l ON l.id = c.list_id JOIN users u ON u.id = c.giver_id
    WHERE l.owner_id = ? AND i.quantity = 0 AND c.thanked_at IS NULL AND c.giver_id <> ? AND c.created_at >= ?
    ORDER BY c.created_at DESC`, ownerId, ownerId, now() - 7 * DAY);
  const by = new Map();
  for (const r of rows) {
    const p = by.get(r.giver_id) || { id: r.giver_id, name: r.name, phone: r.phone, color: r.color, seed: r.seed, items: new Map(), times: 0 };
    p.items.set(r.item_name, (p.items.get(r.item_name) || 0) + Math.max(1, r.units));
    p.times += Math.max(1, r.units);
    by.set(r.giver_id, p);
  }
  const people = [...by.values()].sort((a, b) => b.times - a.times).map((p) => ({ ...p, what: [...p.items.keys()].join(', '), items: undefined }));
  return { people, rows };
}

// Sunday digest (cron in production; "Run Sunday digest" on /dev/texts in test mode):
// owners with weekly_thanks = 1 and unthanked treats this week get a link to /you/thanks.
export async function runWeeklyThanks() {
  const owners = await all("SELECT * FROM users WHERE weekly_thanks = 1 AND phone NOT LIKE 'deleted:%'");
  let texts = 0;
  for (const o of owners) {
    const { people } = await weeklyTreats(o.id);
    if (!people.length) continue;
    const n = people.length;
    await sendText(o.phone, `${n} ${n === 1 ? 'friend' : 'friends'} treated you this week 💛 Thank them all at once: ${appUrl()}/you/thanks`, 'weekly');
    texts++;
  }
  return { texts };
}
