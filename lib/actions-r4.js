'use server';

// r4: PartlyFunded "Move money".
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { run } from './db';
import { currentUser } from './auth';
import { listBySlug } from './lists';
import { canEdit, moveMoney, mergeItems } from './collab';
import { sendSurprise } from './surprise';

export async function moveMoneyAction(fd) {
  const me = await currentUser();
  const slug = String(fd.get('slug') || '');
  if (!me) redirect(`/signup?next=/l/${slug}/partly`);
  const list = await listBySlug(slug);
  if (!list || !(await canEdit(list, me))) redirect(`/l/${slug}`);
  const ok = await moveMoney(list.id, String(fd.get('target') || ''));
  if (!ok) redirect(`/l/${slug}/partly?nomove=1`);
  await run("UPDATE lists SET partly = 'asis' WHERE id = ?", list.id);
  revalidatePath(`/l/${slug}`);
  if (fd.get('now') || !list.send_at) {
    await sendSurprise({ ...list, partly: 'asis' });
    redirect(`/l/${slug}/surprise?sent=1`);
  }
  redirect(`/l/${slug}/surprise?moved=1`);
}

// SharedList: merge two similar items, or keep both.
export async function matchAction(fd) {
  const me = await currentUser();
  const slug = String(fd.get('slug') || '');
  if (!me) redirect(`/signup?next=/l/${slug}/shared`);
  const list = await listBySlug(slug);
  if (!list || !(await canEdit(list, me))) redirect(`/l/${slug}/shared`);
  const keep = String(fd.get('keep') || ''), dupe = String(fd.get('dupe') || '');
  if (fd.get('merge')) await mergeItems(list.id, keep, dupe);
  else await run('UPDATE items SET keep_both = 1 WHERE id = ? AND list_id = ?', dupe, list.id);
  revalidatePath(`/l/${slug}`);
  redirect(`/l/${slug}/shared`);
}
