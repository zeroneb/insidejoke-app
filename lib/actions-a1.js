'use server';

// a1: home feed replies, phone change, friends.
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { get, run, id, now } from './db';
import { normalizePhone, startPhoneCode, checkPhoneCode, currentUser } from './auth';
import { sendText, appUrl, isTestMode } from './texts';
import { feedRowFor } from './feed';
import { areFriends } from './dm';
import { allow } from './ratelimit';

const str = (fd, k) => String(fd.get(k) ?? '').trim();

// ---------- Lately: reply to a giver by text ----------
export async function replyToGiver(prev, fd) {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/home');
  const cid = str(fd, 'contributionId');
  const body = str(fd, 'body').slice(0, 280);
  if (!body) return { error: 'Write something first.', cid };
  // Only rows you can see in a feed take comments. Reply goes to whoever the row is about.
  const row = await feedRowFor(me.id, cid);
  const target = row && (await get('SELECT id AS uid, phone, name FROM users WHERE id = ?', row.uid));
  if (!target) return { error: 'You can only reply to friends here.', cid };
  await run('INSERT INTO messages (id, list_id, from_id, kind, body, media, created_at, ref_key) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)', id(), row.list_id, me.id, 'reply', body, now(), cid);
  // A comment lives in the row's thread (and the person's notifications), never as a text message.
  revalidatePath('/friends');
  revalidatePath('/home');
  revalidatePath(`/l/${row.slug}`);
  return { ok: true, cid, at: now() };
}

// ---------- phone change: code goes to the NEW number ----------
export async function startPhoneChange(prev, fd) {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/you/settings');
  const phone = normalizePhone(str(fd, 'phone'));
  if (!phone) return { error: 'That phone number does not look right.' };
  if (phone === me.phone) return { error: 'That is already your number.' };
  if (await get('SELECT 1 FROM users WHERE phone = ?', phone)) return { error: 'That number already has an insidejoke account.' };
  let code;
  try { code = await startPhoneCode(phone); } catch { return { error: "We couldn't text that number. Check it and try again." }; }
  return { step: 'code', phone, testCode: isTestMode() ? code : undefined };
}

export async function confirmPhoneChange(prev, fd) {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/you/settings');
  const phone = str(fd, 'phone');
  const code = str(fd, 'code');
  if (!(await checkPhoneCode(phone, code))) return { step: 'code', phone, error: 'That code did not match. Try again.' };
  if (await get('SELECT 1 FROM users WHERE phone = ? AND id <> ?', phone, me.id)) return { step: 'code', phone, error: 'That number already has an insidejoke account.' };
  await run('UPDATE users SET phone = ? WHERE id = ?', phone, me.id);
  revalidatePath('/you');
  revalidatePath('/you/settings');
  redirect('/you/settings?phone=changed');
}

// ---------- friends ----------
async function befriend(a, b) {
  const t = now();
  await run("INSERT INTO friends (user_id, friend_id, status, created_at) VALUES (?, ?, 'friends', ?) ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'friends'", a, b, t);
  await run("INSERT INTO friends (user_id, friend_id, status, created_at) VALUES (?, ?, 'friends', ?) ON CONFLICT (user_id, friend_id) DO UPDATE SET status = 'friends'", b, a, t);
}

// Add a friend by phone. On insidejoke: friends both ways. Not yet: text an invite.
export async function addFriendByPhone(prev, fd) {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/friends');
  const phone = normalizePhone(str(fd, 'phone'));
  if (!phone) return { error: 'That phone number does not look right.' };
  if (phone === me.phone) return { error: 'That is your own number.' };
  const u = await get('SELECT * FROM users WHERE phone = ?', phone);
  if (u) {
    await befriend(me.id, u.id);
    if (u.notify_share !== 0) await sendText(u.phone, `${me.name || 'A friend'} added you as a friend on insidejoke. See their lists: ${appUrl()}/u/${me.id}`, 'friend');
    revalidatePath('/friends');
    return { ok: true, added: u.name || 'Your friend', id: u.id };
  }
  await sendText(phone, `${me.name || 'A friend'} wants you on insidejoke, the wishlist friends actually use. Join and see their lists: ${appUrl()}/signup?next=/u/${me.id}`, 'invite');
  revalidatePath('/friends');
  return { ok: true, invited: true, phone };
}

// From a profile: add (or re-add) a friend.
export async function addFriend(fd) {
  const me = await currentUser();
  const other = str(fd, 'userId');
  if (!me || !other || other === me.id) return;
  const u = await get('SELECT * FROM users WHERE id = ?', other);
  if (!u) return;
  await befriend(me.id, u.id);
  revalidatePath(`/u/${other}`);
  revalidatePath('/friends');
}

// Unfriend, quietly: the other person is not notified.
export async function unfriend(fd) {
  const me = await currentUser();
  const other = str(fd, 'userId');
  if (!me || !other) return;
  await run('DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)', me.id, other, other, me.id);
  revalidatePath(`/u/${other}`);
  revalidatePath('/friends');
}

// A message to a friend: saved as a thread in the app (/messages/<id>). Never sent as a text.
export async function sendMessage(prev, fd) {
  const me = await currentUser();
  const other = str(fd, 'userId');
  if (!me) redirect(`/signup?next=/messages/${other}`);
  const body = str(fd, 'body').trim();
  if (!body) return { error: 'Write something first.' };
  if (body.length > 500) return { error: 'Keep it under 500 characters.' };
  if (!(await areFriends(me.id, other))) return { error: 'You can message friends only.' };
  if (!(await allow('dm', me.id, 30, 60 * 1000))) return { error: 'That’s a lot of messages at once. Try again in a minute.' };
  await run('INSERT INTO dm_messages (id, from_id, to_id, body, created_at) VALUES (?, ?, ?, ?, ?)', id(), me.id, other, body, now());
  revalidatePath(`/messages/${other}`);
  revalidatePath('/messages');
  return { ok: true, at: now() };
}

// Android "Choose from contacts": add everyone already on insidejoke; hand back the rest to invite.
export async function addFriendsFromContacts(contacts) {
  const me = await currentUser();
  if (!me) return { error: 'Sign in first.' };
  const added = [], notOn = [];
  const seen = new Set();
  for (const c of (Array.isArray(contacts) ? contacts : []).slice(0, 300)) {
    const phones = (c?.tel || []).map((t) => normalizePhone(String(t))).filter(Boolean);
    const name = String((c?.name || [])[0] || '').slice(0, 60);
    let hit = null;
    for (const p of phones) {
      if (p === me.phone) { hit = 'me'; break; }
      const u = await get('SELECT id, name FROM users WHERE phone = ?', p);
      if (u) { hit = u; break; }
    }
    if (hit === 'me') continue;
    if (hit) { if (!seen.has(hit.id)) { seen.add(hit.id); await befriend(me.id, hit.id); added.push({ id: hit.id, name: hit.name || name || 'A friend' }); } }
    else if (phones[0] && !seen.has(phones[0])) { seen.add(phones[0]); notOn.push({ name: name || phones[0], phone: phones[0] }); }
  }
  revalidatePath('/friends');
  revalidatePath('/home');
  return { ok: true, added, notOn };
}
