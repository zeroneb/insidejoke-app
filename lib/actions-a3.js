'use server';
import { smsEnabled } from './texts';

// a3: thank-yous, wallet (cash out, payout method), giving method.
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { get, all, run, id, now } from './db';
import { currentUser } from './auth';
import { sendText, appUrl, isTestMode } from './texts';
import { savePaymentMethod } from './payments';
import { cashOut, savePayoutMethod, balanceFor, connectOnboardingLink } from './wallet';
import { stripeOn } from './stripe';
import { listBySlug, itemById } from './lists';
import { weeklyTreats, runWeeklyThanks } from './reminders';

const str = (fd, k) => String(fd.get(k) ?? '').trim();
const first = (n) => ((n || '').trim().split(/\s+/)[0]) || 'A friend';

async function photoFrom(fd) {
  const f = fd.get('photo');
  if (f && typeof f === 'object' && f.size > 0 && f.size < 5 * 1024 * 1024 && /^image\//.test(f.type)) {
    const buf = Buffer.from(await f.arrayBuffer());
    return `data:${f.type};base64,${buf.toString('base64')}`;
  }
  return null;
}

// Owner thanks everyone who gave to a covered wish. One text each, privately.
export async function sendItemThanks(prev, fd) {
  const me = await currentUser();
  const slug = str(fd, 'slug');
  const itemId = str(fd, 'itemId');
  if (!me) redirect(`/signup?next=/l/${slug}/i/${itemId}/thanks`);
  const list = await listBySlug(slug);
  const it = await itemById(itemId);
  if (!list || !it || it.list_id !== list.id || list.owner_id !== me.id) return { error: 'This is not your item.' };
  const message = str(fd, 'message').slice(0, 600);
  if (!message) return { error: 'Write a line or two first.' };
  const photo = await photoFrom(fd);
  const givers = await all(`SELECT DISTINCT u.id, u.phone, u.name FROM contributions c JOIN users u ON u.id = c.giver_id WHERE c.item_id = ? AND c.giver_id <> ?`, it.id, me.id);
  const tid = id();
  await run('INSERT INTO thanks (id, list_id, item_id, from_id, kind, message, recipients, photo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    tid, list.id, it.id, me.id, 'item', message, givers.length, photo, now());
  for (const g of givers) {
    await sendText(g.phone, `${first(me.name)} says thank you for the ${it.name}: “${message}”${photo ? ' (with a photo)' : ''} ${appUrl()}/l/${slug}/i/${it.id}`, 'thanks');
  }
  await run('UPDATE contributions SET thanked_at = ? WHERE item_id = ? AND thanked_at IS NULL', now(), it.id);
  revalidatePath(`/l/${slug}/i/${it.id}`);
  revalidatePath('/home');
  const text = `${first(me.name)} says thank you for the ${it.name}: “${message}” ${appUrl()}/l/${slug}/i/${it.id}`;
  return { sent: true, count: givers.length, photo: !!photo, held: !smsEnabled(), phones: givers.map((g) => g.phone), text };
}

// Weekly thank-you for treats: one message, each treater gets their own text.
export async function sendWeeklyThanks(prev, fd) {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/you/thanks');
  const message = str(fd, 'message').slice(0, 600);
  if (!message) return { error: 'Write a line or two first.' };
  const { people, rows } = await weeklyTreats(me.id);
  if (!people.length) return { error: 'Nobody treated you this week yet.' };
  const photo = await photoFrom(fd);
  await run('INSERT INTO thanks (id, list_id, item_id, from_id, kind, message, recipients, photo, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)',
    id(), rows[0].list_id, me.id, 'weekly', message, people.length, photo, now());
  for (const p of people) {
    await sendText(p.phone, `${first(me.name)} sent you a thank-you for this week’s treats 💛 “${message}”${photo ? ' (with a photo)' : ''} Open it: ${appUrl().replace(/^https?:\/\//, '')}/u/${me.id}`, 'thanks');
  }
  const ids = rows.map((r) => r.id);
  for (const cid of ids) await run('UPDATE contributions SET thanked_at = ? WHERE id = ? AND thanked_at IS NULL', now(), cid);
  revalidatePath('/you/thanks');
  const text = `${first(me.name)} sent you a thank-you for this week’s treats: “${message}” ${appUrl()}/u/${me.id}`;
  return { sent: true, count: people.length, photo: !!photo, held: !smsEnabled(), phones: people.map((p) => p.phone), text };
}

// Cash out every list with money waiting. Optionally archive the chosen collab/surprise lists.
export async function cashOutAll(prev, fd) {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/wallet');
  const lists = await all("SELECT * FROM lists WHERE owner_id = ?", me.id);
  const archive = new Set(fd.getAll('archive').map(String));
  let done = 0;
  try {
    for (const l of lists) {
      const b = await balanceFor(l.id);
      if (b.available <= 0) continue;
      await cashOut(l, me.id);
      done++;
      if (archive.has(l.id)) await run("UPDATE lists SET status = 'archived', archived_at = ? WHERE id = ?", now(), l.id);
    }
  } catch (e) {
    if (e.message === 'no_payout_method') redirect('/wallet/payout?next=/wallet');
    return { error: 'Something went wrong. Nothing was sent.' };
  }
  if (!done) return { error: 'Nothing to cash out right now.' };
  revalidatePath('/wallet');
  redirect('/wallet/history');
}

const safeNext = (n, d) => (/^\/[^/]/.test(n || '') ? n : d);

export async function savePayout(prev, fd) {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/wallet/payout');
  const kind = str(fd, 'kind') === 'card' ? 'card' : 'bank';
  const next = safeNext(str(fd, 'next'), '/wallet');
  if (stripeOn()) {
    // stripe: Stripe-hosted Express onboarding collects the bank/card and ID; we come back via /api/stripe/connect.
    let url;
    try {
      const back = `${appUrl()}/api/stripe/connect?next=${encodeURIComponent(next)}`;
      url = await connectOnboardingLink(me.id, kind, { returnUrl: `${back}&step=return`, refreshUrl: `${back}&step=refresh` });
    } catch (e) {
      console.error('stripe connect', e.message);
      return { error: 'Could not start payout setup. Try again in a minute.' };
    }
    redirect(url);
  }
  let label;
  if (kind === 'bank') {
    const bank = str(fd, 'bank') || 'Chase';
    const short = { 'Bank of America': 'BofA' }[bank] || bank;
    label = `${short} checking ••${String(Math.floor(10 + Math.random() * 89))}`;
  } else {
    const d = str(fd, 'card').replace(/\D/g, '').slice(-4) || '4242';
    label = `Debit card ••${d}`;
  }
  await savePayoutMethod(me.id, kind, label);
  revalidatePath('/wallet');
  return { done: true, label, next };
}

export async function savePayment(prev, fd) {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/you/payment');
  const kind = ['apple', 'card', 'bank'].includes(str(fd, 'payKind')) ? str(fd, 'payKind') : 'apple';
  const d = str(fd, 'last4').replace(/\D/g, '').slice(-4) || '4242';
  const f = str(fd, 'cardFirst')[0] || '4';
  const brand = f === '5' || f === '2' ? 'Mastercard' : f === '3' ? 'Amex' : 'Visa';
  try {
    await savePaymentMethod(me.id, kind, kind === 'card' ? `${brand} ·· ${d}` : kind === 'apple' ? 'Apple Pay' : 'Bank ·· 6789', { paymentMethodId: str(fd, 'paymentMethodId') });
  } catch (e) {
    console.error('save payment', e.message);
    const { stripeTestKey } = await import('./stripe');
    return { error: 'That card did not go through. Try another one.' + (stripeTestKey() ? ` (Stripe test: ${e.message})` : '') };
  }
  redirect(safeNext(str(fd, 'next'), '/you'));
}

// Test mode: /dev/texts "Run Sunday digest".
export async function runSundayDigest() {
  if (!isTestMode()) return;
  await runWeeklyThanks();
  revalidatePath('/dev/texts');
}

// Stripe card form: a SetupIntent client secret for the signed-in person.
export async function cardSetupSecret() {
  const me = await currentUser();
  if (!me || !stripeOn()) return { error: 'off' };
  try {
    const { startCardSetup } = await import('./payments');
    return { clientSecret: await startCardSetup(me.id) };
  } catch (e) {
    console.error('setup intent', e.message);
    return { error: 'Card payments are not available right now.' };
  }
}
