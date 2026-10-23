import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { listBySlug } from '@/lib/lists';
import { canEdit, teamOf, itemsWithAdder, firstName, whoFor, findMatch } from '@/lib/collab';
import { matchAction } from '@/lib/actions-r4';
import Nav from '@/components/nav';
import { Boil, Hdr, Who, TallTitle, stat, fmtDate, RED, DEEP } from '@/components/a4';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Shared list · insidejoke' };

// What a non-member sees on a collab list: who organised it, the items (who added each), and give.
export default async function SharedPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = (await searchParams) || {};
  const list = await listBySlug(slug);
  if (!list || list.status !== 'open') notFound();
  const me = await currentUser();
  if (!(await (await import('@/lib/access')).canSeeList(list, me))) redirect(me ? '/home' : `/signup?next=${encodeURIComponent('/l/' + slug)}`);
  if (me && list.recipient_phone && me.phone === list.recipient_phone && !list.sent_at) redirect('/home'); // no peeking at your own surprise
  // r4: collaborators see the SharedList board (who added what, matches, add a wish or treat); others see give / help build.
  const editor = !!me && (await canEdit(list, me));
  const team = await teamOf(list);
  const all = await itemsWithAdder(list);
  const match = editor ? findMatch(all) : null;
  const items = match ? all.filter((it) => it.id !== match.dupe.id) : all;
  const by_ = (id, nm) => (me && id === me.id ? 'you' : firstName({ name: nm }));
  const name = whoFor(list);
  const head = [list.occasion, fmtDate(list.date)].filter(Boolean).join(' · ') || 'Collab list';
  const names = team.map(firstName);
  const by = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
  const open = items.find((it) => !it.covered);
  return (
    <main className={`a4 r4-pink${me ? ' withnav' : ''}`}>
      <Hdr back={me ? '/home' : '/'} right={editor ? <Link href={`/l/${slug}/collab`} aria-label="Collab settings" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg></Link> : null}>{head}</Hdr>
      <div style={{ position: 'relative', height: 170 }}>
        <Boil seed={9} left={60} top={0} width={270} height={170} />
        <TallTitle text={list.title} size={84} style={{ paddingTop: 20 }} />
      </div>
      <p style={{ margin: '12px 20px 0', textAlign: 'center', fontSize: 14, color: DEEP }}>{editor ? 'Built together.' : `Built together by ${by}.`} Every item shows who added it.</p>
      {editor ? null : (
        <section style={{ padding: '14px 20px 0', display: 'flex', justifyContent: 'center' }}>
          {team.slice(0, 6).map((m, i) => <span key={m.id} style={{ marginLeft: i ? -6 : 0 }}><Who user={m} me={me} size={34} /></span>)}
        </section>
      )}

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
              <span style={{ fontSize: 12 }}>added by {by_(it.adder_id, it.adder_name)}{it.store ? ` · ${it.store}` : ''}</span>
            </span>
            <span className="dot" style={{ fontSize: 16 }}>{stat(it)}</span>
          </Link>
        ))}
        {items.length ? <div style={{ borderTop: `1.5px dashed ${RED}` }} /> : null}
      </section>

      {match ? (
        <form action={matchAction} className="pop" role="alert" style={{ margin: '18px 16px 0', background: '#FFFFFF', padding: 16, display: 'flex', flexDirection: 'column', gap: 12, color: '#000' }}>
          <input type="hidden" name="slug" value={slug} /><input type="hidden" name="keep" value={match.keep.id} /><input type="hidden" name="dupe" value={match.dupe.id} />
          <span className="wide" style={{ fontSize: 12, letterSpacing: '0.16em', color: RED }}>Looks like a match</span>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.35 }}>{by_(match.dupe.adder_id, match.dupe.adder_name).replace(/^you$/, 'You').replace(/^./, (c) => c.toUpperCase())} added something similar: <span style={{ fontWeight: 800 }}>{match.dupe.name}</span>. You already have <span style={{ fontWeight: 800 }}>{match.keep.name}</span>.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button name="merge" value="1" style={{ flex: '1 1 0', border: 0, background: RED, color: '#FFFFFF', fontFamily: 'inherit', fontWeight: 800, fontSize: 15, padding: '14px 0', borderRadius: 999, cursor: 'pointer' }}>Merge into one</button>
            <button name="keepboth" value="1" style={{ flex: '1 1 0', border: `2px solid ${RED}`, background: 'transparent', color: RED, fontFamily: 'inherit', fontWeight: 800, fontSize: 15, padding: '12px 0', borderRadius: 999, cursor: 'pointer' }}>Keep both</button>
          </div>
          <span style={{ fontSize: 12, color: '#6A4A44' }}>Merging keeps the progress from both.</span>
        </form>
      ) : null}
      {editor ? (
        <div style={{ padding: '22px 16px 30px', display: 'flex', gap: 8 }}>
          <Link href={`/l/${slug}/add`} className="a4-btn" style={{ flex: '1 1 0', fontSize: 16, padding: '16px 0' }}>Add a wish</Link>
          <Link href={`/l/${slug}/add?treat=1`} className="a4-ghost" style={{ flex: '1 1 0', fontSize: 16 }}>Add a treat</Link>
        </div>
      ) : (
        <div style={{ padding: '22px 16px 30px', display: 'flex', gap: 8 }}>
          {open ? <Link href={`/l/${slug}/i/${open.id}/give`} className="a4-btn" style={{ flex: '1 1 0', fontSize: 16, padding: '16px 0' }}>Give toward a gift</Link> : null}
          <Link href={`/join/${slug}`} className="a4-ghost" style={{ flex: '1 1 0', fontSize: 16 }}>Help build it</Link>
        </div>
      )}
      {list.surprise ? <p style={{ margin: '-14px 20px 30px', textAlign: 'center', fontSize: 12, color: DEEP }}>🤫 It's a surprise. {name} can't see this list.</p> : null}
      {me ? <Nav me={me} active="home" /> : null}
    </main>
  );
}
