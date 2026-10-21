import { redirect, notFound } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { listBySlug } from '@/lib/lists';
import { Header } from '@/components/ui';
import AddItemForm from '@/components/add-item-form';

export const dynamic = 'force-dynamic';

export default async function AddItemPage({ params }) {
  const { slug } = await params;
  const list = await listBySlug(slug);
  if (!list) notFound();
  const me = await currentUser();
  if (!me) redirect(`/signup?next=/l/${slug}/add`);
  if (list.owner_id !== me.id) redirect(`/l/${slug}`);
  return (
    <main>
      <Header back={`/l/${slug}`} right={<span style={{ fontWeight: 800, fontSize: 15, paddingRight: 8 }}>Add to "{list.title}"</span>} />
      <AddItemForm slug={slug} listTitle={list.title} />
    </main>
  );
}
