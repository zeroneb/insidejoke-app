import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { get } from '@/lib/db';
import { friendsOf } from '@/lib/lists';
import { FaceSm } from '@/components/ui';
import { Chevron } from '@/components/profile-hero';
import { isAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const u = await get('SELECT name FROM users WHERE id = ?', id);
  return { title: `${u?.name || 'Profile'} · Friends · insidejoke` };
}

const first = (n) => (n || '').trim().split(/\s+/)[0] || 'them';
const possessive = (n) => (n.endsWith('s') ? `${n}’` : `${n}’s`);

// Someone's friends, from the count on their profile. Signed-in people only; a friends-only profile shows it to friends only.
export default async function ProfileFriends({ params }) {
  const { id } = await params;
  const them = (await get('SELECT * FROM users WHERE id = ?', id)) || (await get('SELECT * FROM users WHERE handle = ?', String(id).toLowerCase()));
  if (!them || them.phone.startsWith('deleted:')) notFound();
  const me = await currentUser();
  if (!me) redirect(`/signup?next=/u/${them.id}/friends`);
  if (me.id === them.id) redirect('/friends');
  const friend = !!(await get("SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ? AND status = 'friends'", me.id, them.id));
  if (them.profile_public === 0 && !friend && !isAdmin(me)) redirect(`/u/${them.id}`);
  const name = first(them.name);
  const people = (await friendsOf(them.id)).filter((f) => !String(f.phone).startsWith('deleted:'));
  const mine = new Set((await friendsOf(me.id)).map((f) => f.id));

  return (
    <main className="withnav" style={{ display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 0 8px' }}>
        <Link href={`/u/${them.id}`} aria-label="Back" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></Link>
        <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em' }}>Friends</span>
        <span style={{ width: 44 }} />
      </header>
      <section style={{ padding: '22px 20px 0' }}>
        <h1 style={{ margin: 0, fontWeight: 400, fontSize: 44, letterSpacing: '-0.03em', lineHeight: 0.95 }}>{possessive(name)} <span className="it">friends</span></h1>
      </section>
      <section aria-label={`${possessive(name)} friends`} style={{ padding: '18px 20px 0', display: 'flex', flexDirection: 'column' }}>
        {people.map((f) => (
          <Link key={f.id} href={f.id === me.id ? '/home' : `/u/${f.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderTop: '1px solid var(--line, #000000)', textDecoration: 'none' }}>
            <FaceSm user={f} size={44} />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flexGrow: 1, minWidth: 0 }}>
              <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>{f.id === me.id ? 'You' : f.name || 'Someone'}</span>
              {mine.has(f.id) ? <span style={{ fontSize: 13, lineHeight: 1.35, color: 'var(--muted, #4A4A4A)' }}>Your friend too</span> : null}
            </span>
            <Chevron />
          </Link>
        ))}
        {!people.length ? <p style={{ margin: 0, padding: '16px 0', borderTop: '1px solid var(--line, #000000)', fontSize: 15, lineHeight: 1.45 }}>{name} has no friends on insidejoke yet.</p> : null}
        <div style={{ borderTop: '1.5px solid var(--line, #000000)' }} />
      </section>
      <div style={{ height: 24 }} />
    </main>
  );
}
