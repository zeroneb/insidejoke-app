'use server';
// a2: owner list actions (edit item remove, list settings / manage).

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { get, run, now } from './db';
import { currentUser } from './auth';
import { listBySlug } from './lists';
import { isPastDay, PAST_DATE_ERROR } from './time';

const str = (fd, k) => String(fd.get(k) ?? '').trim();

async function ownList(fd) {
  const me = await currentUser();
  const list = await listBySlug(str(fd, 'slug'));
  if (!me || !list || list.owner_id !== me.id) return null;
  return list;
}

export async function removeItemAndReturn(fd) {
  const list = await ownList(fd);
  if (!list) redirect('/home');
  await run('UPDATE items SET removed = 1 WHERE id = ? AND list_id = ?', str(fd, 'itemId'), list.id);
  revalidatePath(`/l/${list.slug}`);
  redirect(`/l/${list.slug}`);
}

export async function saveListSettings(prev, fd) {
  const list = await ownList(fd);
  if (!list) return { error: 'This is not your list.' };
  const title = str(fd, 'title').slice(0, 80);
  if (!title) return { error: 'Give the list a name.' };
  const visibility = list.surprise ? 'private' : (str(fd, 'visibility') === 'private' ? 'private' : 'public');
  const date = str(fd, 'date') || null;
  if (date && date !== list.date && isPastDay(date)) return { error: PAST_DATE_ERROR };
  const sendAt = list.surprise && date ? new Date(date + 'T00:00:00').getTime() || null : list.send_at;
  const ring = str(fd, 'ring').replace(/\s+/g, ' ').slice(0, 70) || null;
  const treats = fd.has('treats') ? (str(fd, 'treats') === '1' && list.for_who !== 'other' && !list.surprise ? 1 : 0) : (list.treats || 0);
  await run('UPDATE lists SET title = ?, visibility = ?, date = ?, send_at = ?, ring_text = ?, treats = ? WHERE id = ?', title, visibility, date, sendAt, ring, treats, list.id);
  revalidatePath(`/l/${list.slug}`);
  redirect(`/l/${list.slug}`);
}

export async function setListArchived(fd) {
  const list = await ownList(fd);
  if (!list) return;
  const archive = str(fd, 'archive') === '1';
  await run('UPDATE lists SET status = ?, archived_at = ? WHERE id = ?', archive ? 'archived' : 'open', archive ? now() : null, list.id);
  revalidatePath('/home');
  revalidatePath('/home/archived');
  revalidatePath('/wallet');
  revalidatePath(`/l/${list.slug}`);
  revalidatePath(`/l/${list.slug}/manage`);
}

export async function setItemRemoved(fd) {
  const list = await ownList(fd);
  if (!list) return;
  await run('UPDATE items SET removed = ? WHERE id = ? AND list_id = ?', str(fd, 'removed') === '1' ? 1 : 0, str(fd, 'itemId'), list.id);
  revalidatePath(`/l/${list.slug}`);
  revalidatePath(`/l/${list.slug}/manage`);
}

// Heart on a note (item page): toggles the viewer's reaction.
export async function toggleLike(fd) {
  const me = await currentUser();
  if (!me) return;
  const cid = str(fd, 'contributionId');
  const had = await get("SELECT 1 FROM reactions WHERE contribution_id = ? AND user_id = ? AND emoji = '❤️'", cid, me.id);
  if (had) await run("DELETE FROM reactions WHERE contribution_id = ? AND user_id = ? AND emoji = '❤️'", cid, me.id);
  else await run("INSERT INTO reactions (contribution_id, user_id, emoji, created_at) VALUES (?, ?, '❤️', ?) ON CONFLICT DO NOTHING", cid, me.id, Date.now());
  const path = str(fd, 'path');
  if (path.startsWith('/l/')) revalidatePath(path);
  revalidatePath('/home');
}

// Delete a list for good (owner only). Blocked while money given on it hasn't been cashed out.
export async function deleteList(fd) {
  const me = await currentUser();
  const slug = String(fd.get('slug') || '');
  const back = String(fd.get('back') || '/home');
  const list = await listBySlug(slug);
  if (!me || !list || list.owner_id !== me.id || String(fd.get('confirm')) !== 'delete') return;
  const { balanceFor } = await import('./wallet');
  const b = await balanceFor(list.id);
  b.available += b.waiting || 0;
  if (b.available > 0) redirect(`/l/${slug}/manage?delete=cashout`);
  await run("UPDATE lists SET status = 'deleted', archived_at = COALESCE(archived_at, ?) WHERE id = ?", now(), list.id);
  revalidatePath('/home');
  revalidatePath('/home/archived');
  redirect(back.startsWith('/') ? back : '/home');
}
