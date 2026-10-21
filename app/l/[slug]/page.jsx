import { notFound } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { listBySlug, itemsFor, owner } from '@/lib/lists';
import OwnerList from '@/components/owner-list';
import FriendList from '@/components/friend-list';

export const dynamic = 'force-dynamic';

export default async function ListPage({ params }) {
  const { slug } = await params;
  const list = await listBySlug(slug);
  if (!list) notFound();
  const me = await currentUser();
  const items = await itemsFor(list.id);
  if (me && me.id === list.owner_id) return <OwnerList list={list} items={items} me={me} />;
  return <FriendList list={list} owner={await owner(list)} items={items} me={me} />;
}
