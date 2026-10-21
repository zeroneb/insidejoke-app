'use server';

// r3: Option 10 cash-out, one list at a time; payout setup (bank, 3 steps).
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { get, all, run, now } from './db';
import { currentUser } from './auth';
import { cashOut, balanceFor, savePayoutMethod } from './wallet';

const str = (fd, k) => String(fd.get(k) ?? '').trim();
const safeNext = (n, d) => (/^\/[^/]/.test(n || '') ? n : d);

export async function cashOutList(prev, fd) {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/wallet');
  const list = await get('SELECT * FROM lists WHERE id = ? AND owner_id = ?', str(fd, 'listId'), me.id);
  if (!list) return { error: 'That list is not yours.' };
  const b = await balanceFor(list.id);
  if (b.available <= 0) return { error: 'Nothing to cash out on this list right now.' };
  const members = (await get('SELECT COUNT(*) AS n FROM list_members WHERE list_id = ?', list.id)).n;
  const shared = list.for_who === 'other' || !!list.surprise || members > 0;
  try {
    await cashOut(list, me.id);
  } catch (e) {
    if (e.message === 'no_payout_method') redirect(`/wallet/payout?next=${encodeURIComponent('/wallet?l=' + list.id)}`);
    return { error: 'Something went wrong. Nothing was sent.' };
  }
  // Collab lists close when cashed out; your own list only if you asked.
  if (shared || str(fd, 'archive') === '1') await run("UPDATE lists SET status = 'archived', archived_at = ? WHERE id = ?", now(), list.id);
  revalidatePath('/wallet');
  revalidatePath('/home');
  redirect('/wallet/history');
}

// Bank payout, Option 10: pick bank, confirm ID, done. Simulated in test mode (nothing is checked or stored).
export async function savePayoutBank(prev, fd) {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/wallet/payout');
  const bank = ['Chase', 'Bank of America', 'Citi'].includes(str(fd, 'bank')) ? str(fd, 'bank') : 'Another bank';
  const short = { 'Bank of America': 'BofA', 'Another bank': 'Bank' }[bank] || bank;
  const digits = str(fd, 'acct').replace(/\D/g, '').slice(-4) || '4417';
  const label = `${short} ••${digits}`;
  await savePayoutMethod(me.id, 'bank', label);
  revalidatePath('/wallet');
  return { done: true, label, next: safeNext(str(fd, 'next'), '/wallet') };
}
