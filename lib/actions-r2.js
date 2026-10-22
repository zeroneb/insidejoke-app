'use server';
// r2: owner list actions for the Option 10 Manage board (item archive / remove / restore with undo).
// items.removed: 0 = on the list, 1 = removed, 2 = archived (hidden from friends, kept in Manage).

import { revalidatePath } from 'next/cache';
import { run, get, all, id } from './db';
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

// Archive or remove an item friends already gave toward: move their gifts to another wish, or use them
// (release to the wallet now). Givers get a quiet in-app notice either way. Never amounts.
export async function retireItemWithGifts(slug, itemId, state, choice, targetId) {
  const me = await currentUser();
  const list = await listBySlug(String(slug || ''));
  if (!me || !list || list.owner_id !== me.id) return { error: 'Only the list owner can do this.' };
  const it = await get('SELECT * FROM items WHERE id = ? AND list_id = ?', String(itemId || ''), list.id);
  if (!it) return { error: 'That item is gone.' };
  // All gifts move (progress follows them); only money not cashed out yet can be released.
  const gifts = await all('SELECT * FROM contributions WHERE item_id = ?', it.id);
  const t = Date.now();
  if (choice === 'move') {
    const to = await get('SELECT * FROM items WHERE id = ? AND list_id = ? AND removed = 0 AND quantity > 0 AND id <> ?', String(targetId || ''), list.id, it.id);
    if (!to) return { error: 'Pick a wish to move the gifts to.' };
    for (const c of gifts) {
      await run('UPDATE contributions SET item_id = ?, moved_from_name = ? WHERE id = ?', to.id, it.name, c.id);
      await run('INSERT INTO gift_moves (id, contribution_id, giver_id, owner_id, from_name, to_item_id, to_name, kind, slug, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', id(), c.id, c.giver_id, me.id, it.name, to.id, to.name, 'moved', list.slug, t);
    }
  } else {
    for (const c of gifts) {
      if (!c.paid_out_id) await run('UPDATE contributions SET released = 1 WHERE id = ?', c.id);
      await run('INSERT INTO gift_moves (id, contribution_id, giver_id, owner_id, from_name, kind, slug, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', id(), c.id, c.giver_id, me.id, it.name, 'used', list.slug, t);
    }
  }
  await run('UPDATE items SET removed = ? WHERE id = ?', state === 'removed' ? 1 : 2, it.id);
  revalidatePath(`/l/${list.slug}`);
  revalidatePath(`/l/${list.slug}/manage`);
  revalidatePath('/wallet');
  return { ok: true };
}
