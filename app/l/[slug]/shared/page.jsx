import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { listBySlug } from '@/lib/lists';
import { canEdit, teamOf, itemsWithAdder, firstName, whoFor } from '@/lib/collab';
import Nav from '@/components/nav';
import { Boil, Hdr, Who, TallTitle, stat, fmtDate, RED, DEEP } from '@/components/a4';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Shared list · insidejoke' };

// What a non-member sees on a collab list: who organised it, the items (who added each), and give.
export default async function SharedPage({ params }) {
  const { slug } = await params;
  const list = await listBySlug(slug);
  if (!list || list.status !== 'open') notFound();
  const me = await currentUser();
  if (me && list.recipient_phone && me.phone === list.recipient_phone && !list.sent_at) redirect('/home'); // no peeking at your own surprise
  if (me && (await canEdit(list, me))) redirect(`/l/${slug}/collab`);
  const team = await teamOf(list);
  const items = await itemsWithAdder(list);
  const name = whoFor(list);
  const head = [list.occasion, fmtDate(list.date)].filter(Boolean).join(' · ') || 'Collab list';
  const names = team.map(firstName);
  const by = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
  const open = items.find((it) => !it.covered);
  return (
    <main className={`a4${me ? ' withnav' : ''}`}>
      <Hdr back={me ? '/home' : '/'}>{head}</Hdr>
      <div style={{ position: 'relative', height: 170 }}>
        <Boil seed={9} left={60} top={0} width={270} height={170} />
        <TallTitle text={list.title} size={84} style={{ paddingTop: 20 }} />
      </div>
      <p style={{ margin: '12px 20px 0', textAlign: 'center', fontSize: 14, color: DEEP }}>Built together by {by}. Every item shows who added it.</p>
      <section style={{ padding: '14px 20px 0', display: 'flex', justifyContent: 'center' }}>
        {team.slice(0, 6).map((m, i) => <span key={m.id} style={{ marginLeft: i ? -6 : 0 }}><Who user={m} me={me} size={34} /></span>)}
      </section>

      <section style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8 }}>
          <h2 className="wide" style={{ margin: 0, fontSize: 14, letterSpacing: '0.14em' }}>On the list</h2>
          <span className="dot" style={{ fontSize: 15 }}>{items.length} {items.length === 1 ? 'THING' : 'THINGS'}</span>
        </div>
        {items.length === 0 ? <p className="a4-row" style={{ margin: 0, color: '#000', fontSize: 15 }}>Nothing on it yet. Check back soon.</p> : null}
        {items.map((it) => (
          <Link key={it.id} href={`/l/${slug}/i/${it.id}`} className="a4-row">
            <Who user={{ id: it.adder_id, name: it.adder_name, color: it.adder_color, seed: it.adder_seed }} me={me} size={40} />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 800, fontSize: 15, color: '#000' }}>{it.name}{it.unlimited ? ' (treat)' : ''}</span>
              <span style={{ fontSize: 12 }}>added by {firstName({ name: it.adder_name })}{it.store ? ` · ${it.store}` : ''}</span>
            </span>
            <span className="dot" style={{ fontSize: 16 }}>{stat(it)}</span>
          </Link>
        ))}
        {items.length ? <div style={{ borderTop: `1.5px dashed ${RED}` }} /> : null}
      </section>

      <div style={{ padding: '22px 16px 30px', display: 'flex', gap: 8 }}>
        {open ? <Link href={`/l/${slug}/i/${open.id}/give`} className="a4-btn" style={{ flex: '1 1 0', fontSize: 16, padding: '16px 0' }}>Give toward a gift</Link> : null}
        <Link href={`/join/${slug}`} className="a4-ghost" style={{ flex: '1 1 0', fontSize: 16 }}>Help build it</Link>
      </div>
      {list.surprise ? <p style={{ margin: '-14px 20px 30px', textAlign: 'center', fontSize: 12, color: DEEP }}>🤫 It's a surprise. {name} can't see this list.</p> : null}
      {me ? <Nav me={me} active="home" /> : null}
    </main>
  );
}
