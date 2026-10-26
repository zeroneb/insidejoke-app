import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { listBySlug } from '@/lib/lists';
import { canEdit, teamOf, listProgress, firstName, whoFor } from '@/lib/collab';
import { Avatar } from '@/components/ui';
import Nav from '@/components/nav';
import { Boil, Hdr, DEEP } from '@/components/a4';
import { HandoffForm } from '@/components/a4-forms';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Handoff · insidejoke' };

export default async function HandoffPage({ params }) {
  const { slug } = await params;
  const list = await listBySlug(slug);
  if (!list) notFound();
  const me = await currentUser();
  if (!me) redirect(`/signup?next=/l/${slug}/handoff`);
  if (!(await canEdit(list, me))) redirect(`/l/${slug}`);
  if (list.sent_at) redirect(`/l/${slug}/surprise`);
  const team = await teamOf(list);
  const p = await listProgress(list.id);
  const name = whoFor(list);
  const others = team.filter((m) => m.id !== me.id).map(firstName);
  const together = others.length === 0 ? 'You decide.' : `You and ${others.length === 1 ? others[0] : `${others.slice(0, -1).join(', ')} and ${others[others.length - 1]}`} decide together. Any of you can pick, the others get a text.`;
  const members = [...team.filter((m) => m.id === me.id), ...team.filter((m) => m.id !== me.id)].map((m) => ({ id: m.id, first: firstName(m), avatar: <Avatar user={m} size={28} owner={m.id === me.id} /> }));
  return (
    <main className="a4 r4-pink withnav">
      <Hdr back={`/l/${slug}/collab`}>{list.title} · {p.pct}% covered</Hdr>
      <section style={{ position: 'relative', padding: '10px 20px 0', height: 160 }}>
        <Boil seed={23} left={20} top={0} width={300} height={160} />
        <h1 style={{ position: 'relative', margin: '34px 0 0', textAlign: 'center', fontWeight: 400, fontSize: 40, lineHeight: 0.98, letterSpacing: '-0.03em', color: 'var(--ink, #000)' }}>How does it <span className="serif" style={{ fontStyle: 'italic' }}>reach {name}?</span></h1>
      </section>
      <p style={{ margin: '12px 24px 0', textAlign: 'center', fontSize: 14, lineHeight: 1.4, color: DEEP }}>{together}</p>
      <HandoffForm slug={slug} team={members} meId={me.id} name={name} list={{ handoff: list.handoff, cashout_user_id: list.cashout_user_id, recipient_phone: list.recipient_phone, send_at: list.send_at }} />
      <Nav me={me} active="home" addHref={`/l/${slug}/add`} />
    </main>
  );
}
