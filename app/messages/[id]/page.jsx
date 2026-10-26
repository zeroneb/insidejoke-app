import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { get } from '@/lib/db';
import { areFriends, threadBetween, markThreadRead } from '@/lib/dm';
import { FaceSm } from '@/components/ui';
import MessageForm from '@/components/message-form';
import MessageThread from '@/components/message-thread';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const u = await get('SELECT name FROM users WHERE id = ?', id);
  return { title: `${u?.name || 'Messages'} · insidejoke` };
}

const first = (n) => (n || '').trim().split(/\s+/)[0] || 'them';
const Back = () => <svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="1.73" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg>;

// A direct-message thread with one friend. Newest at the bottom; opening it marks their messages read.
export default async function Thread({ params }) {
  const { id } = await params;
  const me = await currentUser();
  if (!me) redirect(`/signup?next=/messages/${id}`);
  const them = await get('SELECT id, name, color, seed, photo, phone FROM users WHERE id = ?', id);
  if (!them || them.id === me.id || them.phone.startsWith('deleted:')) notFound();
  const name = first(them.name);
  const friend = await areFriends(me.id, them.id);

  const head = (
    <header className="bleed-top" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px 10px 8px', borderBottom: '1px solid var(--line, #000000)', background: 'var(--bg, #ECECEF)' }}>
      <Link href={`/u/${them.id}`} aria-label={`Back to ${possessive(name)} profile`} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Back /></Link>
      <Link href={`/u/${them.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, textDecoration: 'none', color: 'var(--ink, #000000)' }}>
        <FaceSm user={them} size={36} uid="dmhead" />
        <span style={{ fontWeight: 800, fontSize: 17, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{them.name || 'Someone'}</span>
      </Link>
      <Link href="/messages" style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: 'var(--ink, #000000)', flexShrink: 0 }}>All messages</Link>
    </header>
  );

  if (!friend) {
    return (
      <main className="withnav" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        {head}
        <section style={{ padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p className="serif" style={{ margin: 0, fontSize: 28, lineHeight: 1.1 }}>You can message <span style={{ fontWeight: 600 }}>friends</span> only.</p>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45 }}>Once you and {name} are friends on insidejoke, you can message each other here.</p>
          <Link href={`/u/${them.id}`} style={{ alignSelf: 'flex-start', marginTop: 6, fontWeight: 800, fontSize: 15, color: 'var(--ink, #000000)' }}>See {possessive(name)} profile</Link>
        </section>
      </main>
    );
  }

  const msgs = await threadBetween(me.id, them.id);
  await markThreadRead(me.id, them.id);

  return (
    <main className="dm-main" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      {head}
      <MessageThread them={{ id: them.id, name: them.name, color: them.color, seed: them.seed, photo: them.photo }}
        msgs={msgs.map((m) => ({ id: m.id, mine: m.from_id === me.id, body: m.body, at: +m.created_at, read: !!m.read_at }))} />
      <MessageForm userId={them.id} name={name} count={msgs.length} />
    </main>
  );
}

const possessive = (n) => (n.endsWith('s') ? `${n}’` : `${n}’s`);
