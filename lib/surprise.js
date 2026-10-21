import crypto from 'node:crypto';
import { get, all, run, id, now } from './db';
import { sendText, appUrl } from './texts';
import { scheduleReminders } from './reminders';
import { whoFor } from './collab';

// Surprises: a collab list with lists.surprise = 1. The receiver is only told at send time,
// by one text with a one-time reveal link. Opening it signs them up and lets them claim the balance.

export async function ensureToken(list) {
  if (list.reveal_token) return list.reveal_token;
  const token = crypto.randomBytes(12).toString('base64url');
  await run('UPDATE lists SET reveal_token = ? WHERE id = ? AND reveal_token IS NULL', token, list.id);
  return (await get('SELECT reveal_token FROM lists WHERE id = ?', list.id)).reveal_token;
}

export async function listByToken(token) {
  if (!token) return null;
  return (await get('SELECT * FROM lists WHERE reveal_token = ?', token)) || null;
}

export const revealUrl = (token) => `${appUrl()}/reveal/${token}`;

export function surpriseText(list, token) {
  return `Your friends have a surprise for you 🎁 Open it here: ${revealUrl(token)}`;
}

// Text the receiver the reveal link. Idempotent: a sent list is not sent twice.
export async function sendSurprise(list) {
  if (list.sent_at) return { already: true };
  if (!list.recipient_phone) throw new Error('no_recipient');
  const token = await ensureToken(list);
  await sendText(list.recipient_phone, surpriseText(list, token), 'surprise');
  const t = now();
  await run('UPDATE lists SET sent_at = ?, send_at = COALESCE(send_at, ?) WHERE id = ?', t, t, list.id);
  await scheduleReminders({ ...list, sent_at: t });
  return { token };
}

// Due scheduled surprises (send_at passed, not yet sent). Called from the cron route.
export async function sendDueSurprises() {
  const due = await all("SELECT * FROM lists WHERE surprise = 1 AND handoff = 'surprise' AND sent_at IS NULL AND send_at IS NOT NULL AND send_at <= ? AND recipient_phone IS NOT NULL AND status = 'open'", now());
  let n = 0;
  for (const l of due) {
    if (l.partly === 'wait' || l.partly === 'waiting') {
      const short = await get('SELECT COUNT(*) AS n FROM items i WHERE i.list_id = ? AND i.removed = 0 AND i.quantity > 0 AND (SELECT COALESCE(SUM(amount_cents),0) FROM contributions c WHERE c.item_id = i.id) < i.price_cents * i.quantity', l.id);
      if (short.n > 0) {
        if (l.partly === 'wait') {
          const o = await get('SELECT phone FROM users WHERE id = ?', l.owner_id);
          await sendText(o.phone, `Heads up: ${short.n === 1 ? '1 gift' : `${short.n} gifts`} in ${whoFor(l)}'s surprise ${short.n === 1 ? 'is' : 'are'} still partly covered, so it is waiting for you. Send it when you're ready: ${appUrl()}/l/${l.slug}/surprise`, 'reminder');
          await run("UPDATE lists SET partly = 'waiting' WHERE id = ?", l.id);
        }
        continue;
      }
    }
    await sendSurprise(l); n++;
  }
  return n;
}

// Cards, voice notes and videos on the surprise.
export async function messagesFor(listId) {
  return all(`SELECT m.*, u.name, u.color, u.seed FROM messages m JOIN users u ON u.id = m.from_id WHERE m.list_id = ? ORDER BY m.created_at ASC`, listId);
}

export async function addMessage(listId, fromId, kind, body, media) {
  const mid = id();
  await run('INSERT INTO messages (id, list_id, from_id, kind, body, media, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', mid, listId, fromId, kind, body || null, media || null, now());
  return mid;
}

export function countKinds(messages) {
  const c = { card: 0, voice: 0, video: 0 };
  for (const m of messages) if (c[m.kind] != null) c[m.kind]++;
  return c;
}

// The receiver opens the surprise: record who, when. Claiming hands the balance to them (cash out from /wallet).
export async function openSurprise(list, user) {
  await run('UPDATE lists SET opened_at = COALESCE(opened_at, ?), recipient_id = COALESCE(recipient_id, ?) WHERE id = ?', now(), user.id, list.id);
}

export async function claimSurprise(list, user) {
  if (list.claimed_at) return false;
  // The balance follows the owner of the list: moving ownership to the receiver lets them cash out from /wallet.
  // The organiser keeps their place in list_members so the keepsake stays on their side too.
  await run('INSERT INTO list_members (list_id, user_id, role, created_at) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING', list.id, list.owner_id, 'organiser', now());
  await run("UPDATE lists SET owner_id = ?, recipient_id = ?, claimed_at = ?, opened_at = COALESCE(opened_at, ?), handoff = 'claimed' WHERE id = ?", user.id, user.id, now(), now(), list.id);
  return true;
}

export const maskPhone = (p) => {
  const d = (p || '').replace(/\D/g, '');
  if (d.length >= 10) return `(${d.slice(-10, -7)}) ••• ${d.slice(-4)}`;
  return p;
};

export const sendLabel = (list) => {
  if (!list.send_at) return 'Sends now';
  const d = new Date(list.send_at);
  return `Sends ${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${d.getHours() === 0 && d.getMinutes() === 0 ? 'midnight' : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
};

export { whoFor };
