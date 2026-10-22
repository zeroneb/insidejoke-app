import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { listBySlug, itemById } from '@/lib/lists';
import { recordGift } from '@/lib/gifts';

export const dynamic = 'force-dynamic';

// Stripe sends the giver here after a bank check on the bank's own page. Records the gift if it paid.
export async function GET(req) {
  const me = await currentUser();
  const piId = new URL(req.url).searchParams.get('payment_intent') || '';
  if (!me || !/^pi_/.test(piId)) redirect('/home');
  const pi = await stripe('GET', `/payment_intents/${encodeURIComponent(piId)}`);
  const md = pi.metadata || {};
  const list = await listBySlug(md.list_slug || '');
  const it = list ? await itemById(md.item_id || '') : null;
  if (md.user_id !== me.id || !list || !it || it.list_id !== list.id) redirect('/home');
  if (!['succeeded', 'processing'].includes(pi.status)) redirect(`/l/${list.slug}/i/${it.id}/give?declined=1`);
  const gid = await recordGift({ me, list, it, cents: pi.amount, units: parseInt(md.units || '0', 10) || 0, note: md.note || '', visibility: md.visibility === 'private' ? 'private' : 'public', res: { ref: pi.id, paymentIntentId: pi.id } });
  redirect(`/l/${list.slug}/sent/${gid}`);
}
