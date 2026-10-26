import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { inboxFor } from '@/lib/dm';
import { ago } from '@/lib/time';
import { FaceSm } from '@/components/ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Messages · insidejoke' };

const first = (n) => (n || 'Someone').trim().split(/\s+/)[0];

// Your conversations with friends, newest first. Each opens its thread at /messages/<friendId>.
export default async function Inbox() {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/messages');
  const rows = await inboxFor(me.id);

  return (
    <main className="withnav" style={{ display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 0 8px' }}>
        <Link href="/home" aria-label="Back" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="1.73" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></Link>
        <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em' }}>Messages</span>
        <span style={{ width: 44 }} />
      </header>
      <section style={{ padding: '18px 20px 0' }}>
        <h1 className="serif" style={{ margin: 0, fontWeight: 400, fontSize: 40, lineHeight: 1 }}>Your <span style={{ fontWeight: 600 }}>messages</span></h1>
      </section>
      <section style={{ padding: '18px 20px 24px', display: 'flex', flexDirection: 'column' }}>
        {rows.length === 0 ? (
          <div style={{ padding: '16px 0', borderTop: '1px solid var(--line, #000000)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45 }}>No messages yet. Open a friend’s profile and tap the message button to say hi. Only you two see it.</p>
            <Link href="/friends?view=list" style={{ alignSelf: 'flex-start', fontWeight: 800, fontSize: 15, color: 'var(--ink, #000000)' }}>See your friends</Link>
          </div>
        ) : rows.map((r) => (
          <Link key={r.user.id} href={`/messages/${r.user.id}`} aria-label={`${r.user.name || 'Someone'}${r.unread ? `, ${r.unread} new` : ''}`} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '14px 0', borderTop: '1px solid var(--line, #000000)', color: 'var(--ink, #000000)', textDecoration: 'none' }}>
            <FaceSm user={r.user} size={48} uid={`ib${r.user.id.replace(/[^a-z0-9]/gi, '')}`} />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flexGrow: 1, minWidth: 0 }}>
              <span style={{ fontSize: 16, fontWeight: r.unread ? 800 : 700 }}>{r.user.name || first(r.user.name)}</span>
              <span style={{ fontSize: 14, lineHeight: 1.3, color: r.unread ? 'var(--ink, #000000)' : 'var(--muted, #4A4A4A)', fontWeight: r.unread ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.mine ? 'You: ' : ''}{r.body}</span>
            </span>
            <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted, #4A4A4A)' }}>
              {r.unread ? <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--lt, #E8642C)' }} /> : null}{ago(r.at)}
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}
