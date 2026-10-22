import GiveView from '@/components/views/give-view';

export const dynamic = 'force-dynamic';

export default async function GivePage({ params, searchParams }) {
  const { slug, itemId } = await params;
  const sp = await searchParams;
  return <GiveView slug={slug} itemId={itemId} mode={sp?.mode} />;
}
