import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { get } from '@/lib/db';
import { listBySlug } from '@/lib/lists';
import { canEdit, teamOf, itemsWithAdder, recipientsOf, latestBlast, firstName, whoFor } from '@/lib/collab';
import { appUrl } from '@/lib/texts';
import { ago } from '@/lib/time';
import { unpinBlastAction } from '@/lib/actions-a4';
import { Avatar } from '@/components/ui';
import Nav from '@/components/nav';
import { Boil, Hdr, Who, TallTitle, stat, fmtDate, RED, DEEP } from '@/components/a4';
import { BlastForm } from '@/components/a4-forms';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Text blast · insidejoke' };

export default async function BlastPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const list = await listBySlug(slug);
  if (!list) notFound();
  const me = await currentUser();
  if (!me) redirect(`/signup?next=/l/${slug}/blast`);
  if (!(await canEdit(list, me))) redirect(`/l/${slug}`);
  const team = await teamOf(list);
  const items = await itemsWithAdder(list);
  const people = await recipientsOf(list, me.id);
  const memberIds = new Set(team.map((m) => m.id));
  const collaborators = people.filter((p) => p.userId && memberIds.has(p.userId)).length;
  const invited = people.length - collaborators;
  const peopleLine = list.for_who === 'other'
    ? `${collaborators} ${collaborators === 1 ? 'collaborator' : 'collaborators'} + ${invited} invited`
    : `${people.length} ${people.length === 1 ? 'person' : 'people'} the list was shared with`;
  const faces = [];
  for (const p of people.slice(0, 4)) faces.push(p.userId ? await get('SELECT * FROM users WHERE id = ?', p.userId) : { id: p.phone, name: '#', color: '#D7D7DC', seed: 11 });
  const name = whoFor(list);
  const best = items.filter((it) => !it.unlimited && !it.covered).sort((a, b) => b.pct - a.pct)[0];
  const suggestion = `${list.occasion && list.for_who === 'other' ? list.occasion : `${name}'s day`} is coming!${best ? ` The ${best.name.split(',')[0]} is ${best.pct}% there, every bit helps 💐` : ' Every bit helps 💐'}`;
  const link = `${appUrl().replace(/^https?:\/\//, '')}/l/${slug}`;
  const sent = sp?.sent != null;
  const blast = sent ? await latestBlast(list.id) : null;
  const last = sent && !blast ? await get('SELECT * FROM blasts WHERE list_id = ? ORDER BY created_at DESC LIMIT 1', list.id) : null;
  const shown = blast || last;
  const head = [list.occasion, fmtDate(list.date)].filter(Boolean).join(' · ') || list.title;

  return (
    <main className="a4 withnav">
      <Hdr back={list.for_who === 'other' ? `/l/${slug}/collab` : `/l/${slug}`}>{sent ? head : `Organizer · ${list.title}`}</Hdr>
      {!sent ? (
        <>
          <div style={{ position: 'relative', height: 170 }}>
            <Boil seed={9} left={50} top={0} width={290} height={170} />
            <h1 className="tall" style={{ position: 'relative', margin: '26px 0 0', textAlign: 'center', fontSize: 76, lineHeight: 0.84 }}>Text<br />blast</h1>
          </div>
          <p style={{ margin: '14px 24px 0', textAlign: 'center', fontSize: 15, lineHeight: 1.4, color: DEEP }}>One message to everyone on “{list.title}.” It goes out by text and stays pinned on the list.</p>
          <BlastForm slug={slug} suggestion={suggestion} count={people.length} people={peopleLine}>
            <span style={{ display: 'flex', paddingLeft: 6 }}>{faces.map((u) => <span key={u.id} style={{ marginLeft: -6 }}><Avatar user={u} size={28} /></span>)}</span>
          </BlastForm>
        </>
      ) : (
        <>
          <div style={{ position: 'relative', height: 130 }}>
            <Boil seed={9} left={70} top={0} width={250} height={130} />
            <TallTitle text={list.title} size={84} oneLine style={{ paddingTop: 16 }} />
          </div>
          {blast ? (
            <section className="pop" aria-label="Pinned message" style={{ margin: '18px 16px 0', background: '#fff', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, color: '#000', borderTop: `4px solid ${RED}` }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <Who user={{ id: blast.from_id, name: blast.name, color: blast.color, seed: blast.seed }} me={me} size={40} />
                <span className="serif" style={{ fontSize: 20, lineHeight: 1.25 }}>{blast.body}</span>
              </div>
              <form action={unpinBlastAction} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#4A4A4A' }}>
                <input type="hidden" name="slug" value={slug} /><input type="hidden" name="blastId" value={blast.id} />
                <span>Pinned · sent by text to {blast.recipients} · {ago(blast.created_at)}</span>
                <button style={{ border: 0, background: 'transparent', color: RED, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, padding: '10px 0 10px 10px', cursor: 'pointer' }}>Unpin</button>
              </form>
            </section>
          ) : (
            <p className="pop" style={{ margin: '18px 20px 0', fontSize: 14, color: DEEP }}>{sp.unpinned ? 'Unpinned. ' : 'Not pinned. '}The text already went out to {shown?.recipients ?? sp.sent} {Number(shown?.recipients ?? sp.sent) === 1 ? 'person' : 'people'}.</p>
          )}
          <section style={{ padding: '18px 20px 0', display: 'flex', flexDirection: 'column' }}>
            <h2 className="wide" style={{ margin: '0 0 8px', fontSize: 14, letterSpacing: '0.14em' }}>On the list</h2>
            {items.map((it) => (
              <div key={it.id} className="a4-row">
                <Who user={{ id: it.adder_id, name: it.adder_name, color: it.adder_color, seed: it.adder_seed }} me={me} size={36} />
                <span style={{ flexGrow: 1, minWidth: 0, fontWeight: 800, fontSize: 15, color: '#000' }}>{it.name}</span>
                <span className="dot" style={{ fontSize: 16 }}>{stat(it)}</span>
              </div>
            ))}
          </section>
          {shown ? (
            <section style={{ margin: '22px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <h2 className="wide" style={{ margin: 0, fontSize: 13, letterSpacing: '0.16em' }}>What people get</h2>
              <div style={{ background: '#fff', borderRadius: 18, padding: 14, display: 'flex', flexDirection: 'column', gap: 6, color: '#000' }}>
                <span style={{ textAlign: 'center', fontSize: 11, color: '#6A6A6A' }}>Text message · insidejoke</span>
                <div style={{ alignSelf: 'flex-start', maxWidth: '88%', background: '#ECECEC', borderRadius: '18px 18px 18px 4px', padding: '10px 13px', fontSize: 14, lineHeight: 1.4 }}>From {firstName(me)}, on “{list.title}”: {shown.body} {link}</div>
                <span style={{ alignSelf: 'flex-start', fontSize: 11, color: '#6A6A6A' }}>Reply STOP to opt out</span>
              </div>
            </section>
          ) : null}
          <div style={{ height: 36 }} />
        </>
      )}
      <Nav me={me} active="home" addHref={`/l/${slug}/add`} />
    </main>
  );
}
