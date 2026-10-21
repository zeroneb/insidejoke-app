import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { all } from '@/lib/db';
import { listBySlug } from '@/lib/lists';
import { canEdit, teamOf, whoFor } from '@/lib/collab';
import { appUrl } from '@/lib/texts';
import { Avatar } from '@/components/ui';
import Nav from '@/components/nav';
import { Boil, Hdr, DEEP } from '@/components/a4';
import { ContactPicker } from '@/components/a4-forms';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Invite · insidejoke' };

export default async function InvitePage({ params }) {
  const { slug } = await params;
  const list = await listBySlug(slug);
  if (!list) notFound();
  const me = await currentUser();
  if (!me) redirect(`/signup?next=/l/${slug}/invite`);
  if (!(await canEdit(list, me))) redirect(`/l/${slug}/shared`);
  const team = await teamOf(list);
  const inTeam = new Set(team.map((m) => m.id));
  const rows = await all("SELECT u.* FROM friends f JOIN users u ON u.id = f.friend_id WHERE f.user_id = ? AND f.status = 'friends' ORDER BY u.name", me.id);
  const friends = rows
    .filter((u) => u.phone !== list.recipient_phone)
    .map((u) => ({ id: u.id, name: u.name || 'Friend', sub: 'On insidejoke', member: inTeam.has(u.id), avatar: <Avatar user={u} size={42} /> }))
    .sort((a, b) => a.member - b.member);
  const name = whoFor(list);
  return (
    <main className="a4 withnav">
      <Hdr back={`/l/${slug}/collab`}>{list.title} · invite</Hdr>
      <section style={{ position: 'relative', padding: '14px 20px 0', height: 150 }}>
        <Boil seed={14} left={10} top={0} width={250} height={150} />
        <h1 style={{ position: 'relative', margin: '30px 0 0 14px', fontWeight: 400, fontSize: 42, lineHeight: 0.95, letterSpacing: '-0.03em', color: '#000' }}>Who's in <span className="serif" style={{ fontStyle: 'italic' }}>on it?</span></h1>
      </section>
      <p style={{ margin: '10px 20px 0', fontSize: 14, lineHeight: 1.4, color: DEEP }}>Pick from your friends or type a number. insidejoke texts them the link, and they can add and give right away.</p>
      <ContactPicker slug={slug} friends={friends} link={`${appUrl()}/join/${slug}`} name={name} surprise={!!list.surprise} />
      <Nav me={me} active="friends" addHref={`/l/${slug}/add`} />
    </main>
  );
}
