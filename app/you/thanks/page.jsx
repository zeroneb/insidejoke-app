// r3: weekly thank-you for treats (Option 10 WeeklyThanks).
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Avatar, Blob } from '@/components/ui';
import { currentUser } from '@/lib/auth';
import { weeklyTreats } from '@/lib/reminders';
import WeeklyForm from './weekly-form';
import { appUrl } from '@/lib/texts';

export const dynamic = 'force-dynamic';
export const metadata = { title: "This week's treats · insidejoke" };

export default async function WeeklyThanksPage() {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/you/thanks');
  const { people } = await weeklyTreats(me.id);
  const n = people.length;
  const first = ((me.name || 'Me').trim().split(/\s+/)[0]);
  return (
    <main className="r3-full" style={{ background: '#ECECEF', color: '#000000', display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 0 8px' }}>
        <Link href="/home" aria-label="Back" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></Link>
        <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em' }}>This week's treats</span>
        <span style={{ width: 44 }} />
      </header>
      <section style={{ position: 'relative', padding: '14px 20px 0', height: 180, boxSizing: 'border-box' }}>
        <Blob seed={73} color="#D8F75A" style={{ left: -16, top: 0 }} width={300} height={180} />
        <h1 style={{ position: 'relative', margin: '46px 0 0 12px', fontWeight: 400, fontSize: 44, lineHeight: 0.95, letterSpacing: '-0.03em' }}>{n ? <>{n} {n === 1 ? 'friend' : 'friends'} <span className="serif" style={{ fontStyle: 'italic' }}>treated you</span></> : <>No treats <span className="serif" style={{ fontStyle: 'italic' }}>yet</span></>}</h1>
      </section>
      <p style={{ margin: '2px 20px 0', fontSize: 15, lineHeight: 1.45 }}>
        {n ? 'Treats never get “covered,” so here’s a weekly moment to thank everyone at once. Each person gets it as their own text.' : 'Nobody has treated you this week, or you have thanked everyone already. Treats show up here as they come in.'}
      </p>
      {n ? (
        <>
          <section aria-label="Who treated you" style={{ padding: '18px 20px 0', display: 'flex', flexDirection: 'column' }}>
            {people.map((f) => (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid #000000' }}>
                <Avatar user={f} size={36} />
                <span style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}><span style={{ fontSize: 15, fontWeight: 700 }}>{f.name || 'A friend'}</span><span style={{ fontSize: 13 }}>{f.what}</span></span>
                <span className="dot" style={{ flexShrink: 0, fontSize: 18, color: '#13286B' }}>×{f.times}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid #000000' }} />
          </section>
          <WeeklyForm count={n} first={first} link={`${appUrl()}/u/${me.id}`} />
        </>
      ) : null}
      <section style={{ margin: '26px 20px 0', paddingTop: 16, borderTop: '1.5px solid #000000', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45 }}>Wishes still get their own thank-you when they're covered.</p>
        <Link href="/home" style={{ alignSelf: 'flex-start', fontSize: 14, textDecoration: 'underline', textUnderlineOffset: 3, padding: '6px 0' }}>{n ? 'Skip this week' : 'Back home'}</Link>
      </section>
      <div style={{ height: 40 }} />
    </main>
  );
}
