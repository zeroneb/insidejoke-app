import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import SignupForm from '@/components/signup-form';
import SignupArt from '@/components/signup-art';

export const dynamic = 'force-dynamic';

// Option 13 SignUp (step 1) + PhoneConfirm (step 2). /login reuses it with title "Log in".
export default async function SignupPage({ searchParams, title = 'Sign up' }) {
  const sp = await searchParams;
  const next = typeof sp?.next === 'string' && sp.next.startsWith('/') ? sp.next : '/home';
  const me = await currentUser();
  if (me) redirect(next);
  return (
    <main className="su-split" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: '100vh' }}>
      <SignupArt />
      <div className="su-form"><SignupForm next={next} title={title} /></div>
    </main>
  );
}
