import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import PhotoStep from './photo-step';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Add your face? · insidejoke' };

// r1: sign up step 3 of 3 (Option 10 SignUp board): optional profile photo.
export default async function SignupPhoto({ searchParams }) {
  const me = await currentUser();
  const sp = await searchParams;
  const next = typeof sp?.next === 'string' && sp.next.startsWith('/') && !sp.next.startsWith('//') ? sp.next : '/home';
  if (!me) redirect(`/signup?next=${encodeURIComponent(next)}`);
  const firstList = next === '/home';
  return (
    <main className="r1-nonav" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <PhotoStep me={{ id: me.id, name: me.name, color: me.color, seed: me.seed, photo: me.photo || null }} href={firstList ? '/lists/new' : next} firstList={firstList} />
    </main>
  );
}
