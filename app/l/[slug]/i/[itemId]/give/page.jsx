import { notFound, redirect } from 'next/navigation';
import { listBySlug, itemById, owner as ownerOf } from '@/lib/lists';
import { currentUser } from '@/lib/auth';
import { paymentMethod } from '@/lib/payments';
import GiveForm from './give-form';

export const dynamic = 'force-dynamic';

function firstName(u) { return ((u?.name || 'a friend').trim().split(/\s+/)[0]) || 'a friend'; }

export default async function GivePage({ params, searchParams }) {
  const { slug, itemId } = await params;
  const sp = await searchParams;
  const list = await listBySlug(slug);
  if (!list) notFound();
  const it = await itemById(itemId);
  if (!it || it.list_id !== list.id) notFound();
  if (it.covered) redirect(`/l/${slug}/i/${it.id}`);
  const owner = await ownerOf(list);
  const me = await currentUser();
  const forName = list.for_who === 'other' && list.recipient_name ? list.recipient_name : firstName(owner);
  const item = { id: it.id, name: it.name, price_cents: it.price_cents, quantity: it.quantity, unlimited: it.unlimited, remaining: it.remaining, pct: it.pct, color: it.color, store: it.store };
  return (
    <GiveForm
      slug={slug}
      item={item}
      forName={forName}
      signedIn={!!me}
      hasPayment={!!(me && (await paymentMethod(me.id)))}
      initialMode={sp?.mode === 'rest' ? 'rest' : 'amount'}
    />
  );
}
