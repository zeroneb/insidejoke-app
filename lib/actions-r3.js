'use server';

// r3: Option 10 cash-out, one list at a time; payout setup (bank, 3 steps).
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { get, all, run, now } from './db';
import { currentUser } from './auth';
import { cashOut, balanceFor, savePayoutMethod, connectOnboardingLink } from './wallet';
import { stripeOn, stripeTestKey } from './stripe';
import { appUrl } from './texts';

const str = (fd, k) => String(fd.get(k) ?? '').trim();
import { safeNext } from './access';

export async function cashOutList(prev, fd) {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/wallet');
  const list = await get('SELECT * FROM lists WHERE id = ? AND owner_id = ?', str(fd, 'listId'), me.id);
  if (!list) return { error: 'That list is not yours.' };
  const members = (await get('SELECT COUNT(*) AS n FROM list_members WHERE list_id = ?', list.id)).n;
  const shared = list.for_who === 'other' || !!list.surprise || members > 0;
  // Collab lists close when cashed out; your own list only if you asked. Closing first releases money on wishes still filling.
  const closing = shared || str(fd, 'archive') === '1';
  if (closing) await run("UPDATE lists SET status = 'archived', archived_at = ? WHERE id = ?", now(), list.id);
  const b = await balanceFor(list.id);
  if (b.available <= 0) return { error: 'Nothing to cash out on this list right now.' };
  let sent;
  try {
    sent = (await cashOut({ ...list, status: closing ? 'archived' : list.status }, me.id))?.id;
  } catch (e) {
    if (e.message === 'payout_not_ready') return { error: 'Your bank is still being checked. That usually takes a minute or two; try again shortly. If it keeps saying this, tap Change your bank to finish setup.' };
    if (e.message === 'no_payout_method') redirect(`/wallet/payout?next=${encodeURIComponent('/wallet?l=' + list.id)}`);
    console.error('cash out', e.message);
    (await import('./events')).logEvent('payout_fail', { userId: me.id, ref: list.id, detail: e.message });
    const { stripeTestKey } = await import('./stripe');
    return { error: 'Something went wrong. Nothing was sent.' + (stripeTestKey() ? ` (Stripe test: ${e.message})` : '') };
  }
  revalidatePath('/wallet');
  revalidatePath('/home');
  redirect(sent ? `/wallet/history?sent=${sent}` : '/wallet/history');
}

// Bank payout, Option 10: pick bank, confirm ID, done. Simulated in test mode (nothing is checked or stored).
export async function savePayoutBank(prev, fd) {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/wallet/payout');
  const bank = ['Chase', 'Bank of America', 'Citi'].includes(str(fd, 'bank')) ? str(fd, 'bank') : 'Another bank';
  const short = { 'Bank of America': 'BofA', 'Another bank': 'Bank' }[bank] || bank;
  const digits = str(fd, 'acct').replace(/\D/g, '').slice(-4) || '4417';
  const label = `${short} ••${digits}`;
  if (stripeOn()) {
    // Real payouts: Stripe's own screens collect the bank and ID, then send the owner back here.
    const next = safeNext(str(fd, 'next'), '/wallet');
    let url;
    try {
      const back = `${appUrl()}/api/stripe/connect?next=${encodeURIComponent(next)}`;
      const email = str(fd, 'email').toLowerCase();
      const has = await get('SELECT stripe_account_id FROM payout_methods WHERE user_id = ?', me.id);
      if (!has?.stripe_account_id && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(email)) return { error: 'Add your email for cash-out receipts.' };
      url = await connectOnboardingLink(me.id, 'bank', { returnUrl: `${back}&step=return`, refreshUrl: `${back}&step=refresh`, email });
    } catch (e) {
      console.error('stripe connect', e.message);
      (await import('./events')).logEvent('payout_fail', { userId: me.id, detail: `setup: ${e.message}` });
      const digits = (p) => String(p || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
      const admin = String(process.env.ADMIN_PHONES || '').split(',').map(digits).includes(digits(me.phone));
      return { error: 'Could not start payout setup. Try again in a minute.' + (stripeTestKey() || admin ? ` (Stripe: ${e.message})` : '') };
    }
    redirect(url);
  }
  await savePayoutMethod(me.id, 'bank', label);
  revalidatePath('/wallet');
  return { done: true, label, next: safeNext(str(fd, 'next'), '/wallet') };
}

// Wallet: close a list so money on wishes still filling can be cashed out too.
export async function closeListForCashOut(fd) {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/wallet');
  const list = await get('SELECT * FROM lists WHERE id = ? AND owner_id = ?', str(fd, 'listId'), me.id);
  if (list) await run("UPDATE lists SET status = 'archived', archived_at = ? WHERE id = ?", now(), list.id);
  revalidatePath('/wallet');
  revalidatePath('/home');
  redirect(`/wallet?l=${list ? list.id : ''}`);
}
