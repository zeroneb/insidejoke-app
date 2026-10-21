'use server';

// a1: home feed replies, phone change, friends.
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { get, run, id, now } from './db';
import { normalizePhone, startPhoneCode, checkPhoneCode, currentUser } from './auth';
import { sendText, appUrl, isTestMode } from './texts';

const str = (fd, k) => String(fd.get(k) ?? '').trim();

// ---------- Lately: reply to a giver by text ----------
export async function replyToGiver(prev, fd) {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/home');
  const cid = str(fd, 'contributionId');
  const body = str(fd, 'body').slice(0, 280);
  if (!body) return { error: 'Write something first.', cid };
  let target;
  if (cid.startsWith('i:')) {
    // A friend added something: reply to whoever added it (they must be your friend).
    target = await get(`SELECT i.name AS item_name, l.id AS list_id, l.slug, u.id AS uid, u.phone, u.name
      FROM items i JOIN lists l ON l.id = i.list_id JOIN users u ON u.id = COALESCE(i.added_by, l.owner_id)
      JOIN friends f ON f.user_id = ? AND f.friend_id = u.id WHERE i.id = ?`, me.id, cid.slice(2));
  } else {
    // A gift on one of your lists: reply to the giver.
    target = await get(`SELECT i.name AS item_name, l.id AS list_id, l.slug, l.owner_id, u.id AS uid, u.phone, u.name
      FROM contributions c JOIN lists l ON l.id = c.list_id JOIN items i ON i.id = c.item_id JOIN users u ON u.id = c.giver_id WHERE c.id = ?`, cid);
    if (target && target.owner_id !== me.id) target = null;
  }
  if (!target) return { error: 'You can only reply to friends here.', cid };
  await run('INSERT INTO messages (id, list_id, from_id, kind, body, media, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?)', id(), target.list_id, me.id, 'reply', body, now());
  await sendText(target.phone, `${me.name || 'A friend'} replied about ${target.item_name}: "${body}" ${appUrl()}/l/${target.slug}`, 'reply');
  return { ok: true, cid, to: (target.name || '').split(' ')[0] || 'them' };
}

// ---------- phone change: code goes to the NEW number ----------
export async function startPhoneChange(prev, fd) {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/you/settings');
  const phone = normalizePhone(str(fd, 'phone'));
  if (!phone) return { error: 'That phone number does not look right.' };
  if (phone === me.phone) return { error: 'That is already your number.' };
  if (await get('SELECT 1 FROM users WHERE phone = ?', phone)) return { error: 'That number already has an insidejoke account.' };
  const code = await startPhoneCode(phone);
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

// From a friend's profile: send them a quick text (friends only; their number stays hidden).
export async function textFriend(prev, fd) {
  const me = await currentUser();
  const other = str(fd, 'userId');
  if (!me) redirect(`/signup?next=/u/${other}`);
  const body = str(fd, 'body').slice(0, 280);
  if (!body) return { error: 'Write something first.' };
  const u = await get("SELECT u.* FROM friends f JOIN users u ON u.id = f.friend_id WHERE f.user_id = ? AND f.friend_id = ? AND f.status = 'friends'", me.id, other);
  if (!u) return { error: 'You can text friends only.' };
  await sendText(u.phone, `${me.name || 'A friend'} on insidejoke: "${body}" ${appUrl()}/u/${me.id}`, 'friend_text');
  return { ok: true, to: (u.name || '').split(' ')[0] || 'them' };
}
