import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { listBySlug } from '@/lib/lists';
import { isMember, teamOf, itemsWithAdder, firstName, whoFor } from '@/lib/collab';
import { appUrl } from '@/lib/texts';
import { joinList } from '@/lib/actions-a4';
import Nav from '@/components/nav';
import { Boil, Who, TallTitle, stat, RED, DEEP } from '@/components/a4';
import { JoinSignup } from '@/components/a4-forms';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Join the list · insidejoke' };

export default async function JoinPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const list = await listBySlug(slug);
  if (!list || list.status !== 'open') notFound();
  const me = await currentUser();
  if (!(await (await import('@/lib/access')).canSeeList(list, me))) redirect(me ? '/home' : `/signup?next=${encodeURIComponent('/l/' + slug)}`);
  const team = await teamOf(list);
  const organiser = team[0];
  const name = whoFor(list);
  if (!me) {
    const invite = `${firstName(organiser)} invited you to build a list for ${name} on insidejoke 💐 Add what ${name} would love and we'll get it together: ${appUrl().replace(/^https?:\/\//, '')}/join/${slug}`;
    return (
      <main className="a4 r4-pink">
        <JoinSignup next={`/join/${slug}`} title={`“${list.title}”`} invite={invite}>
          <section style={{ position: 'relative', padding: '18px 20px 0', height: 170 }}>
            <Boil seed={21} left={30} top={0} width={300} height={170} />
            <TallTitle text={list.title} size={78} style={{ marginTop: 26 }} />
          </section>
        </JoinSignup>
      </main>
    );
  }
  if (list.recipient_phone && me.phone === list.recipient_phone) redirect('/home');
  if (me.id === list.owner_id) redirect(`/l/${slug}/collab`);
  const member = await isMember(list.id, me.id);
  const items = await itemsWithAdder(list);
  return (
    <main className="a4 r4-pink withnav">
      <div className="a4-pop" style={{ display: 'flex', flexDirection: 'column' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px 0', minHeight: 44 }}>
          <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em' }}>{member ? "Collab · you're in" : "Collab · you're invited"}</span>
          {member ? <Link href={`/l/${slug}`} style={{ fontSize: 12, color: DEEP }}>Open the list</Link> : null}
        </header>
        <div style={{ position: 'relative', height: 190 }}>
          <Boil seed={5} left={50} top={4} width={290} height={180} />
          <TallTitle text={list.title} size={92} style={{ paddingTop: 26 }} />
        </div>
        <section style={{ padding: '14px 20px 0', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', rowGap: 6 }}>
          {team.filter((m) => m.id !== me.id).map((m, i) => <span key={m.id} className="a4-chip" style={{ marginLeft: i ? -2 : 0 }}>{firstName(m)}</span>)}
          <span className="a4-chip" style={{ marginLeft: -2, background: member ? RED : 'transparent', color: member ? 'var(--inv-fg, #fff)' : RED, borderStyle: member ? 'solid' : 'dashed' }}>{firstName(me)} · you</span>
        </section>
        <p style={{ margin: '14px 20px 0', textAlign: 'center', fontSize: 14, color: DEEP }}>{firstName(organiser)} started this. {member ? 'You can add, edit and fund.' : 'Join to add, edit and fund.'}</p>
        <section style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column' }}>
          <h2 className="wide" style={{ margin: '0 0 8px', fontSize: 14, letterSpacing: '0.14em' }}>On the list</h2>
          {items.length === 0 ? <p className="a4-row" style={{ margin: 0, color: 'var(--ink, #000)', fontSize: 15 }}>Nothing yet. Be the first to add something.</p> : null}
          {items.map((it) => (
            <div key={it.id} className="a4-row">
              <Who user={{ id: it.adder_id, name: it.adder_name, color: it.adder_color, seed: it.adder_seed }} me={me} size={40} />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1, minWidth: 0 }}><span style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink, #000)' }}>{it.name}{it.unlimited ? ' (treat)' : ''}</span><span style={{ fontSize: 12 }}>added by {it.adder_id === me.id ? 'you' : firstName({ name: it.adder_name })}</span></span>
              <span className="dot" style={{ fontSize: 16 }}>{stat(it)}</span>
            </div>
          ))}
        </section>
        {member ? (
          <Link href={`/l/${slug}/add`} className="a4-btn" style={{ margin: '20px 16px 30px', width: 'auto' }}>Add something {name} would love</Link>
        ) : (
          <form action={joinList} style={{ margin: '20px 16px 30px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input type="hidden" name="slug" value={slug} />
            <button className="a4-btn">Join the list</button>
            <span style={{ textAlign: 'center', fontSize: 12, color: DEEP }}>{list.surprise ? `It's a surprise: ${name} can't see this list.` : `${firstName(organiser)} and the others get a text when you join.`}</span>
          </form>
        )}
      </div>
      <Nav me={me} active="home" />
    </main>
  );
}
