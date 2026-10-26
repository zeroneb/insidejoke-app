import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { run } from '@/lib/db';
import { notificationsFor } from '@/lib/notifications';
import { FaceSm } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Notifications · insidejoke' };

const when = (ts) => {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 60) return m <= 1 ? 'Now' : `${m}m`;
  if (m < 60 * 24) return `${Math.round(m / 60)}h`;
  if (m < 60 * 24 * 7) return `${Math.round(m / 1440)}d`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
const first = (n) => (n || 'Someone').trim().split(/\s+/)[0];

export default async function Notifications() {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/notifications');
  const seen = Number(me.notif_seen_at || 0);
  const items = await notificationsFor(me);
  await run('UPDATE users SET notif_seen_at = ? WHERE id = ?', Date.now(), me.id);

  return (
    <main className="withnav" style={{ display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 0 8px' }}>
        <Link href="/home" aria-label="Back" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></Link>
        <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em' }}>Notifications</span>
        <span style={{ width: 44 }} />
      </header>
      <section style={{ padding: '18px 20px 0' }}>
        <h1 className="serif" style={{ margin: 0, fontWeight: 400, fontSize: 40, lineHeight: 1 }}>What’s <span style={{ fontWeight: 600 }}>new</span></h1>
      </section>
      <section style={{ padding: '18px 20px 24px', display: 'flex', flexDirection: 'column' }}>
        {items.length === 0 ? (
          <p style={{ margin: 0, padding: '16px 0', borderTop: '1px solid var(--line, #000000)', fontSize: 15, lineHeight: 1.45 }}>Nothing yet. When friends give, say thanks or start a list, it shows up here.</p>
        ) : items.map((n) => (
          <Link key={n.key} href={n.href} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 0', borderTop: '1px solid var(--line, #000000)', color: 'var(--ink, #000000)', textDecoration: 'none' }}>
            {n.who ? <FaceSm user={{ id: n.who.uid, name: n.who.name, color: n.who.color, seed: n.who.seed, photo: n.who.photo }} size={40} uid={`n${n.key.replace(/[^a-z0-9]/gi, '')}`} /> : (
              <span aria-hidden="true" style={{ width: 40, height: 40, flexShrink: 0, borderRadius: '50%', background: 'var(--lt, #D8F75A)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg></span>
            )}
            <span style={{ display: 'flex', flexDirection: 'column', gap: 4, flexGrow: 1, minWidth: 0 }}>
              <span style={{ fontSize: 15, lineHeight: 1.35 }}>{n.who ? <b>{first(n.who.name)} </b> : null}{n.big ? <b>{n.text}</b> : n.text}</span>
              {n.note ? <span className="it" style={{ fontSize: 17, lineHeight: 1.25 }}>“{n.note}”</span> : null}
            </span>
            <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted, #4A4A4A)' }}>
              {n.at > seen ? <span aria-label="New" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--lt, #E8642C)' }} /> : null}{when(n.at)}
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
