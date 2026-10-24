import { revalidatePath } from 'next/cache';
import { get, run, id, now } from './db';
import { sendText, appUrl } from './texts';
import { owner, withProgress } from './lists';

// Records a paid gift once (keyed on the Stripe PaymentIntent when there is one) and texts the owner when a wish is covered.
export async function recordGift({ me, list, it, cents, units, note, visibility, res }) {
  if (res.paymentIntentId) {
    const had = await get('SELECT id FROM contributions WHERE stripe_payment_intent_id = ?', res.paymentIntentId);
    if (had) return had.id;
  }
  const cid = id();
  const { ledger, giftTypeFor } = await import('./ledger');
  const { processingCents } = await import('./payments');
  const giftType = await giftTypeFor(it, cents);
  const method = res.method || (res.pending ? 'bank' : 'card');
  const at = now();
  // Real payments become available once Stripe settles them (filled in by settleGifts); simulated ones right away.
  await run('INSERT INTO contributions (id, item_id, list_id, giver_id, amount_cents, units, note, visibility, payment_ref, created_at, stripe_payment_intent_id, pending, method, card_country, gift_type, available_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    cid, it.id, list.id, me.id, cents, units, note || null, visibility, res.ref, at, res.paymentIntentId || null, res.pending ? 1 : 0, method, res.country || null, giftType, res.paymentIntentId ? null : at);
  const meta = { userId: me.id, listId: list.id, contributionId: cid, giftType };
  await ledger('gift', cents, meta);
  // Estimated until Stripe reports the real fee (international cards cost 1.5% more).
  const intl = method === 'card' && res.country && res.country !== 'US' ? Math.round(cents * 0.015) : 0;
  await ledger('processing', processingCents(cents, method) + intl, { ...meta, est: 1 });
  const after = await withProgress(it);
  if (!it.unlimited && after.covered) {
    const o = await owner(list);
    if (o.notify_covered !== 0) await sendText(o.phone, `${it.name} on "${list.title}" is all covered 🎉${it.url ? ` Go get it: ${appUrl()}/go/${it.id}` : ''} Say thanks: ${appUrl()}/l/${list.slug}/i/${it.id}/thanks`, 'covered');
  }
  revalidatePath(`/l/${list.slug}`);
  return cid;
}
