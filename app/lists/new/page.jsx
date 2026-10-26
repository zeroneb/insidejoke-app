import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { all } from '@/lib/db';
import NewListForm from '@/components/new-list-form';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // reading a store link can take a while

export default async function NewListPage() {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/lists/new');
  const friends = await all("SELECT u.id, u.name, u.color, u.seed, u.photo FROM friends f JOIN users u ON u.id = f.friend_id WHERE f.user_id = ? AND f.status = 'friends' ORDER BY u.name ASC", me.id);
  return (
    <main style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px 0 8px' }}>
        <Link href="/home" aria-label="Back" className="iconbtn"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></Link>
        <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em' }}>New list</span>
      </header>
      <NewListForm me={{ id: me.id, name: me.name, color: me.color, seed: me.seed, photo: me.photo, handle: me.handle || null }} friends={friends} />
    </main>
  );
}
