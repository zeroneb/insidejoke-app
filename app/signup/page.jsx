import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { isTestMode } from '@/lib/texts';
import { Header, Blob } from '@/components/ui';
import SignupForm from '@/components/signup-form';

export const dynamic = 'force-dynamic';

export default async function SignupPage({ searchParams, title = 'Sign up' }) {
  const sp = await searchParams;
  const next = typeof sp?.next === 'string' && sp.next.startsWith('/') ? sp.next : '/home';
  const me = await currentUser();
  if (me) redirect(next);
  const login = title === 'Log in';
  return (
    <main>
      <Header back="/" title={title} />
      <section style={{ position: 'relative', height: 200, margin: '6px 20px 0' }}>
        <Blob seed={12} width={300} height={190} style={{ left: -10, top: 0 }} />
        <h1 style={{ position: 'absolute', left: 22, right: 40, top: 46, margin: 0, fontWeight: 400, fontSize: 42, lineHeight: 0.96, letterSpacing: '-0.04em' }}>
          {login ? <>Welcome <span className="it" style={{ fontSize: 48 }}>back.</span></> : <>What should we <span className="it" style={{ fontSize: 48 }}>call you?</span></>}
        </h1>
      </section>
      <SignupForm next={next} testMode={isTestMode()} title={title} />
      <div style={{ height: 40 }} />
    </main>
  );
}
