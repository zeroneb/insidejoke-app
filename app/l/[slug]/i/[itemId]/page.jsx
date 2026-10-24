import ItemView from '@/components/views/item-view';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export default async function ItemPage({ params }) {
  const { slug, itemId } = await params;
  return <ItemView slug={slug} itemId={itemId} />;
}
