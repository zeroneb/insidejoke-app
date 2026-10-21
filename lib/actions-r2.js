'use server';
// r2: owner list actions for the Option 10 Manage board (item archive / remove / restore with undo).
// items.removed: 0 = on the list, 1 = removed, 2 = archived (hidden from friends, kept in Manage).

import { revalidatePath } from 'next/cache';
import { run } from './db';
import { currentUser } from './auth';
import { listBySlug } from './lists';
import { isMember } from './collab';

export async function setItemStateR2(slug, itemId, state) {
  const me = await currentUser();
  const list = await listBySlug(String(slug || ''));
  if (!me || !list || !(list.owner_id === me.id || (await isMember(list.id, me.id)))) return { error: 'This is not your list.' };
  const v = state === 'removed' ? 1 : state === 'archived' ? 2 : 0;
  await run('UPDATE items SET removed = ? WHERE id = ? AND list_id = ?', v, String(itemId || ''), list.id);
  revalidatePath(`/l/${list.slug}`);
  revalidatePath(`/l/${list.slug}/manage`);
  return { ok: true };
}
