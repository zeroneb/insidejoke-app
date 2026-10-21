import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { get } from '@/lib/db';
import { listBySlug, itemsFor } from '@/lib/lists';
import { recipientsOf, firstName, whoFor } from '@/lib/collab';
import { Avatar, shortNoun } from '@/components/ui';
import { Boil } from '@/components/a4';
import { ThankGroupForm } from '@/components/a4-forms';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Thank everyone · insidejoke' };

export default async function ThankGroupPage({ params }) {
  const { slug } = await params;
  const list = await listBySlug(slug);
  if (!list) notFound();
  const me = await currentUser();
  if (!me) redirect(`/signup?next=/l/${slug}/thank-group`);
  if (list.recipient_id !== me.id && list.owner_id !== me.id) redirect(`/l/${slug}`);
  const people = await recipientsOf({ ...list, recipient_phone: null }, me.id);
  const friends = [];
  for (const p of people) friends.push(p.userId ? await get('SELECT * FROM users WHERE id = ?', p.userId) : { id: p.phone, name: p.phone.slice(-4), color: '#D7D7DC', seed: 9 });
  const items = await itemsFor(list.id);
  const names = items.map((it) => `the ${shortNoun(it.name.split(',')[0])}`);
  const things = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0] || 'everything';
  const suggestion = `Thank you for ${things}. This one felt good with you all.`;
  const token = list.reveal_token;
  return (
    <main style={{ background: '#ECECEF', color: '#000', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header className="a4-hdr">
        <Link href={token ? `/reveal/${token}?open=1` : `/l/${slug}`} aria-label="Back" className="a4-back"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></Link>
        <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em' }}>{list.title}</span>
        <span style={{ width: 44 }} />
      </header>
      <section style={{ position: 'relative', padding: '14px 20px 0', height: 180 }}>
        <Boil seed={73} fill="#D8F75A" left={-16} top={0} width={300} height={180} />
        <h1 style={{ position: 'relative', margin: '46px 0 0 12px', fontWeight: 400, fontSize: 44, lineHeight: 0.95, letterSpacing: '-0.03em' }}>Thank <span className="serif" style={{ fontStyle: 'italic' }}>everyone</span></h1>
      </section>
      <p style={{ margin: '2px 20px 0', fontSize: 15, lineHeight: 1.45 }}>One message reaches all {friends.length} {friends.length === 1 ? 'friend' : 'friends'} who chipped in. No group chat needed.</p>
      <section aria-label="Going to" style={{ padding: '18px 20px 0', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {friends.map((f) => (
          <span key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1.5px solid #000', borderRadius: 999, padding: '3px 10px 3px 3px', fontSize: 13, fontWeight: 700 }}><Avatar user={f} size={26} />{firstName(f)}</span>
        ))}
      </section>
      <ThankGroupForm slug={slug} count={friends.length} suggestion={suggestion} name={firstName(me)} />
      <section style={{ margin: '26px 20px 0', paddingTop: 18, borderTop: '1.5px solid #000', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0, fontFamily: "'EB Garamond', serif", fontSize: 22, lineHeight: 1.25 }}>Your turn next time. What would <span style={{ fontStyle: 'italic' }}>you</span> love?</p>
        <Link href="/lists/new" style={{ alignSelf: 'flex-start', textDecoration: 'none', border: '1.5px solid #000', background: '#D8F75A', fontWeight: 800, fontSize: 15, padding: '12px 18px', borderRadius: 999 }}>Start your own list</Link>
        <span style={{ fontSize: 13, color: '#4A4A4A' }}>Maybe later. Your surprise stays in Archived as a keepsake.</span>
      </section>
      <div style={{ height: 40 }} />
    </main>
  );
}
