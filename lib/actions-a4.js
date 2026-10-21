'use server';

// a4: collab lists, text blasts, handoff, surprises, reminders.
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { get, all, run, id, now } from './db';
import { normalizePhone, currentUser } from './auth';
import { sendText, appUrl, isTestMode } from './texts';
import { listBySlug } from './lists';
import { canEdit, isMember, addMember, recipientsOf, saveBlast, unpinBlast, firstName, whoFor, listProgress, teamOf } from './collab';
import { sendSurprise, addMessage, listByToken, openSurprise, claimSurprise, ensureToken } from './surprise';
import { scheduleReminders, runReminders, runWeeklyDigest } from './reminders';

const str = (fd, k) => String(fd.get(k) ?? '').trim();

async function editable(fd) {
  const me = await currentUser();
  const slug = str(fd, 'slug');
  if (!me) redirect(`/signup?next=/l/${slug}`);
  const list = await listBySlug(slug);
  if (!list || !(await canEdit(list, me))) return { me, list: null, slug };
  return { me, list, slug };
}

// ---------- invites ----------
// Pick friends (userIds) and/or type numbers (phones, one per line or comma separated). Each gets a join link.
export async function inviteMembers(prev, fd) {
  const { me, list, slug } = await editable(fd);
  if (!list) return { error: 'Only people on this list can invite.' };
  const phones = new Set();
  for (const uid of fd.getAll('userId')) {
    const u = await get('SELECT phone FROM users WHERE id = ?', String(uid));
    if (u) phones.add(u.phone);
  }
  const typed = str(fd, 'phones');
  const bad = [];
  for (const raw of typed.split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean)) {
    const p = normalizePhone(raw);
    if (p) phones.add(p); else bad.push(raw);
  }
  if (bad.length) return { error: `${bad[0]} does not look like a phone number.` };
  if (!phones.size) return { error: 'Pick someone or type a number.' };
  if (list.recipient_phone) phones.delete(list.recipient_phone);
  phones.delete(me.phone);
  const link = `${appUrl()}/join/${slug}`;
  const name = whoFor(list);
  for (const p of phones) {
    await sendText(p, `${firstName(me)} invited you to build a list for ${name} on insidejoke 💐 Add what ${name} would love and we'll get it together: ${link}`, 'invite');
    await run('INSERT INTO list_shares (id, list_id, phone, created_at) VALUES (?, ?, ?, ?) ON CONFLICT (list_id, phone) DO NOTHING', id(), list.id, p, now());
  }
  if (!list.shared_at) {
    await run('UPDATE lists SET shared_at = ? WHERE id = ?', now(), list.id);
    await scheduleReminders({ ...list, shared_at: now() });
  }
  revalidatePath(`/l/${slug}/collab`);
  return { ok: true, count: phones.size, at: now() };
}

export async function joinList(fd) {
  const me = await currentUser();
  const slug = str(fd, 'slug');
  if (!me) redirect(`/join/${slug}`);
  const list = await listBySlug(slug);
  if (!list) redirect('/home');
  if (list.recipient_phone && list.recipient_phone === me.phone) redirect('/home'); // the receiver never joins their own surprise
  if (list.owner_id !== me.id && !(await isMember(list.id, me.id))) {
    await addMember(list.id, me.id);
    for (const m of await teamOf(list)) if (m.id !== me.id) await sendText(m.phone, `${firstName(me)} joined “${list.title}” 🙌 ${appUrl()}/l/${slug}/collab`, 'joined');
  }
  revalidatePath(`/join/${slug}`);
  redirect(`/join/${slug}?joined=1`);
}

export async function setSurpriseMode(fd) {
  const { list, slug } = await editable(fd);
  if (!list) return;
  const on = str(fd, 'on') === '1' ? 1 : 0;
  await run('UPDATE lists SET surprise = ?, visibility = ? WHERE id = ?', on, on ? 'private' : list.visibility, list.id);
  revalidatePath(`/l/${slug}/collab`);
}

// ---------- text blast ----------
export async function sendBlast(prev, fd) {
  const { me, list, slug } = await editable(fd);
  if (!list) return { error: 'Only organisers can send a text blast.' };
  const body = str(fd, 'body').slice(0, 320);
  if (!body) return { error: 'Write the message first.' };
  const pin = !!fd.get('pin');
  const people = await recipientsOf(list, me.id);
  const link = `${appUrl()}/l/${slug}`;
  for (const p of people) await sendText(p.phone, `From ${firstName(me)}, on “${list.title}”: ${body} ${link}`, 'blast');
  await saveBlast(list, me.id, body, people.length, pin);
  revalidatePath(`/l/${slug}`);
  redirect(`/l/${slug}/blast?sent=${people.length}`);
}

export async function unpinBlastAction(fd) {
  const { list, slug } = await editable(fd);
  if (!list) return;
  const b = await get('SELECT * FROM blasts WHERE id = ? AND list_id = ?', str(fd, 'blastId'), list.id);
  if (b) await unpinBlast(b.id);
  revalidatePath(`/l/${slug}`);
  redirect(`/l/${slug}/blast?sent=${b?.recipients ?? 0}&unpinned=1`);
}

// ---------- handoff ----------
// "One of us cashes out" -> handoff 'cashout' + who. "Send it as a surprise" -> handoff 'surprise', receiver's number, when.
export async function chooseHandoff(prev, fd) {
  const { me, list, slug } = await editable(fd);
  if (!list) return { error: 'Only people on this list can choose.' };
  const pick = str(fd, 'pick');
  const team = await teamOf(list);
  const notify = async (text) => { for (const m of team) if (m.id !== me.id) await sendText(m.phone, text, 'handoff'); };
  if (pick === 'cashout') {
    const who = str(fd, 'who') || me.id;
    if (!team.some((m) => m.id === who)) return { error: 'Pick someone on the list.' };
    // The balance follows lists.owner_id (that is what /wallet cashes out), so the chosen person becomes the owner;
    // the previous organiser stays on as a member.
    if (who !== list.owner_id) {
      await addMember(list.id, list.owner_id, 'organiser');
      await run('DELETE FROM list_members WHERE list_id = ? AND user_id = ?', list.id, who);
    }
    await run("UPDATE lists SET handoff = 'cashout', cashout_user_id = ?, owner_id = ? WHERE id = ?", who, who, list.id);
    const w = team.find((m) => m.id === who);
    await notify(`${firstName(me)} picked: ${who === me.id ? firstName(me) : firstName(w)} cashes out “${list.title}” and buys the gifts. ${appUrl()}/l/${slug}`);
    redirect(who === me.id ? '/wallet' : `/l/${slug}/collab`);
  }
  if (pick === 'surprise') {
    const phone = normalizePhone(str(fd, 'phone'));
    if (!phone) return { error: `Add ${whoFor(list)}'s number so the surprise can reach them.`, pick };
    const when = str(fd, 'when');
    let sendAt = null;
    if (when === 'date') {
      const d = str(fd, 'date');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return { error: 'Pick the day it goes out.', pick };
      const [y, m, dd] = d.split('-').map(Number);
      // Midnight their time: the browser sends its offset; default to server midnight.
      const local = parseInt(str(fd, 'sendAtMs') || 'NaN', 10); // the browser's own midnight for that day
      sendAt = Number.isFinite(local) ? local : new Date(y, m - 1, dd).getTime();
      if (sendAt <= now()) return { error: 'Pick a day after today, or send it now.', pick };
    }
    await run("UPDATE lists SET handoff = 'surprise', surprise = 1, visibility = 'private', recipient_phone = ?, send_at = ?, timezone = ? WHERE id = ?", phone, sendAt, str(fd, 'tz') || null, list.id);
    await ensureToken(list);
    await notify(`${firstName(me)} set “${list.title}” to go to ${whoFor(list)} as a surprise 🎁 ${appUrl()}/l/${slug}/surprise`);
    redirect(`/l/${slug}/surprise`);
  }
  return { error: 'Pick one of the two.' };
}

// ---------- surprise ----------
export async function sendSurpriseNow(fd) {
  const { list, slug } = await editable(fd);
  if (!list) redirect(`/l/${slug}`);
  if (!list.recipient_phone) redirect(`/l/${slug}/handoff`);
  const p = await listProgress(list.id);
  if (p.short > 0 && list.partly !== 'asis' && !fd.get('asis')) redirect(`/l/${slug}/partly?now=1`);
  await sendSurprise(list);
  revalidatePath(`/l/${slug}/surprise`);
  redirect(`/l/${slug}/surprise?sent=1`);
}

// Not fully funded at send time: send as it is, or wait.
export async function choosePartly(fd) {
  const { list, slug } = await editable(fd);
  if (!list) redirect(`/l/${slug}`);
  const choice = str(fd, 'choice') === 'wait' ? 'wait' : 'asis';
  await run('UPDATE lists SET partly = ? WHERE id = ?', choice, list.id);
  if (choice === 'asis' && (fd.get('now') || !list.send_at)) {
    await sendSurprise({ ...list, partly: 'asis' });
    redirect(`/l/${slug}/surprise?sent=1`);
  }
  redirect(`/l/${slug}/surprise${choice === 'wait' ? '?waiting=1' : ''}`);
}

// A card (note + optional photo), a voice note or a video. Media arrive as data URIs (< 6MB).
export async function addToCard(prev, fd) {
  const { me, list, slug } = await editable(fd);
  if (!list) return { error: 'Only people on this list can add to the card.' };
  const kind = ['card', 'voice', 'video'].includes(str(fd, 'kind')) ? str(fd, 'kind') : 'card';
  const body = str(fd, 'body').slice(0, 500) || null;
  let media = null;
  const f = fd.get('photo');
  if (f && typeof f === 'object' && f.size > 0) {
    if (f.size > 6 * 1024 * 1024 || !/^image\//.test(f.type)) return { error: 'Photos must be images under 6MB.' };
    media = `data:${f.type};base64,${Buffer.from(await f.arrayBuffer()).toString('base64')}`;
  }
  const data = str(fd, 'media');
  if (data) {
    if (!/^data:(audio|video|image)\//.test(data)) return { error: 'That recording did not come through. Try again.' };
    if (data.length > 6 * 1024 * 1024 * 1.37) return { error: 'That one is over 6MB. Keep it under a minute.' };
    media = data;
  }
  if (kind === 'card' && !body && !media) return { error: 'Write something for the card.' };
  if (kind !== 'card' && !media) return { error: 'Record something first.' };
  await addMessage(list.id, me.id, kind, body, media);
  revalidatePath(`/l/${slug}/surprise`);
  redirect(`/l/${slug}/surprise?added=${kind}`);
}

// ---------- reveal ----------
export async function openReveal(fd) {
  const me = await currentUser();
  const token = str(fd, 'token');
  const list = await listByToken(token);
  if (!list) redirect('/');
  if (!me || me.phone !== list.recipient_phone) redirect(`/reveal/${token}`);
  await openSurprise(list, me);
  redirect(`/reveal/${token}?open=1`);
}

export async function claimReveal(fd) {
  const me = await currentUser();
  const token = str(fd, 'token');
  const list = await listByToken(token);
  if (!list) redirect('/');
  if (!me || me.phone !== list.recipient_phone) redirect(`/reveal/${token}`);
  if (await claimSurprise(list, me)) {
    const team = await teamOf(list);
    for (const m of team) if (m.id !== me.id) await sendText(m.phone, `${firstName(me)} opened the surprise and claimed the gifts 🎉 ${appUrl()}/l/${list.slug}`, 'claimed');
  }
  redirect('/wallet');
}

// ---------- thank the group ----------
export async function thankGroup(prev, fd) {
  const me = await currentUser();
  const slug = str(fd, 'slug');
  if (!me) redirect(`/signup?next=/l/${slug}/thank-group`);
  const list = await listBySlug(slug);
  if (!list || (list.recipient_id !== me.id && list.owner_id !== me.id)) return { error: 'Only the person the gifts were for can thank the group.' };
  const message = str(fd, 'message').slice(0, 500);
  if (!message) return { error: 'Write your thank-you first.' };
  let photo = null;
  const f = fd.get('photo');
  if (f && typeof f === 'object' && f.size > 0 && f.size < 6 * 1024 * 1024 && /^image\//.test(f.type)) photo = `data:${f.type};base64,${Buffer.from(await f.arrayBuffer()).toString('base64')}`;
  const people = await recipientsOf({ ...list, recipient_phone: null }, me.id);
  const tid = id();
  await run('INSERT INTO thanks (id, list_id, item_id, from_id, kind, message, recipients, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?, ?)', tid, list.id, me.id, 'group', message, people.length, now());
  if (photo) await addMessage(list.id, me.id, 'thanks_photo', tid, photo);
  for (const p of people) await sendText(p.phone, `${firstName(me)} sent you a thank-you for the surprise 💛 “${message.slice(0, 120)}${message.length > 120 ? '…' : ''}” ${appUrl()}/l/${slug}`, 'thanks');
  revalidatePath(`/l/${slug}/thank-group`);
  return { ok: true, count: people.length, message, photo: !!photo };
}

// ---------- date & reminders ----------
export async function setGiftDate(fd) {
  const { list, slug } = await editable(fd);
  if (!list) return;
  const on = !!fd.get('on');
  const date = on ? str(fd, 'date') : '';
  const value = on && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
  await run('UPDATE lists SET date = ? WHERE id = ?', value, list.id);
  await scheduleReminders({ ...list, date: value });
  revalidatePath(`/l/${slug}/reminders`);
  redirect(`/l/${slug}/reminders`);
}

// Test mode only: run due reminders + weekly digest now (the dev outbox button).
export async function runRemindersNow(fd) {
  if (!isTestMode()) return;
  const force = !!fd?.get?.('force');
  if (force) await run('UPDATE reminders SET due_at = ? WHERE sent_at IS NULL', now() - 1000);
  await runReminders();
  await runWeeklyDigest();
  revalidatePath('/dev/texts');
}
