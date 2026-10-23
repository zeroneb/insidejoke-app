// insidejoke.club/<handle> → that person's profile (same page as /u/<id>).
import { notFound } from 'next/navigation';
import { get } from '@/lib/db';
import FriendProfile from '@/app/u/[id]/page';

export const dynamic = 'force-dynamic';

export default async function HandlePage({ params }) {
  const { handle } = await params;
  const h = String(handle || '').toLowerCase();
  if (!/^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$/.test(h)) notFound();
  const u = await get('SELECT id FROM users WHERE handle = ?', h);
  if (!u) notFound();
  return <FriendProfile params={Promise.resolve({ id: u.id })} />;
}
