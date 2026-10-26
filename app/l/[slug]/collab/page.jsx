import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { listBySlug } from '@/lib/lists';
import { canEdit, teamOf, itemsWithAdder, firstName, whoFor, findMatch } from '@/lib/collab';
import { appUrl } from '@/lib/texts';
import Nav from '@/components/nav';
import { Boil, Hdr, Band, Who, TallTitle, stat, fmtDate, RED, DEEP } from '@/components/a4';
import { InviteBox, SurpriseSwitch } from '@/components/a4-forms';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Collab · insidejoke' };

const Arrow = () => <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;

export default async function CollabPage({ params }) {
  const { slug } = await params;
  const list = await listBySlug(slug);
  if (!list) notFound();
  const me = await currentUser();
  if (!me) redirect(`/signup?next=/l/${slug}/collab`);
  if (!(await canEdit(list, me))) redirect(`/l/${slug}/shared`);
  const team = await teamOf(list);
  const all = await itemsWithAdder(list);
  const match = findMatch(all); // r4: a pending match is sorted out on /shared
  const items = match ? all.filter((it) => it.id !== match.dupe.id) : all;
  const others = team.filter((m) => m.id !== me.id);
  const name = whoFor(list);
  const band = ['Collab', '✦', ['You', ...others.map(firstName)].slice(0, 3).join(' + '), '✦'];
  const band2 = ['Made together', '✦', list.surprise ? 'Surprise mode on' : `For ${name}`, '✦'];
  const head = [list.occasion, fmtDate(list.date)].filter(Boolean).join(' · ') || list.title;
  const both = team.length === 2 ? 'both of you' : team.length > 2 ? `all ${team.length} of you` : 'anyone you invite';
  const preview = `${firstName(me)} invited you to build a list for ${name} on insidejoke 💐 Add what ${name} would love and we'll get it together: ${appUrl().replace(/^https?:\/\//, '')}/join/${slug}`;

  return (
    <main className="a4 r4-pink withnav">
      <Band words={band} />
      <Hdr back={`/l/${slug}`}>{head}</Hdr>

      <div style={{ position: 'relative', paddingTop: 18 }}>
        <Boil seed={5} left={50} top={6} width={290} height={190} />
        <TallTitle text={list.title} size={92} />
      </div>

      <section style={{ padding: '22px 20px 0', display: 'flex', justifyContent: 'center', flexWrap: 'wrap', rowGap: 6 }}>
        {[...team.filter((m) => m.id === me.id), ...others].map((m, i) => (
          <span key={m.id} className="a4-chip" style={{ marginLeft: i ? -2 : 0, background: m.id === me.id ? 'transparent' : undefined }}>{m.id === me.id ? 'You' : firstName(m)}</span>
        ))}
        <Link href={`/l/${slug}/invite`} className="a4-chip" style={{ border: `2px dashed ${RED}`, padding: '10px 18px', marginLeft: -2 }}>+ Invite</Link>
      </section>
      <p style={{ margin: '14px 20px 0', textAlign: 'center', fontSize: 14, color: DEEP }}>Collab list · {both} can add, edit and fund</p>

      <section style={{ margin: '24px 16px 0', background: 'var(--surface, #fff)', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 12, color: 'var(--ink, #000)' }}>
        <h2 className="wide" style={{ margin: 0, fontSize: 15, letterSpacing: '0.14em', color: RED }}>Invite by text</h2>
        <InviteBox slug={slug} preview={preview} />
      </section>

      <SurpriseSwitch slug={slug} on={list.surprise} name={name} />

      <section style={{ padding: '22px 20px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h2 className="wide" style={{ margin: 0, fontSize: 15, letterSpacing: '0.14em' }}>On the list</h2>
          <Link href={`/l/${slug}/add`} style={{ fontWeight: 800, fontSize: 14, textDecoration: 'none', padding: '8px 0' }}>+ Add</Link>
        </div>
        {items.length === 0 ? <p className="a4-row" style={{ margin: 0, color: 'var(--ink, #000)', fontSize: 15 }}>Nothing yet. Add the first thing {name} would love.</p> : null}
        {items.map((it) => (
          <Link key={it.id} href={`/l/${slug}/i/${it.id}`} className="a4-row">
            <Who user={{ id: it.adder_id, name: it.adder_name, color: it.adder_color, seed: it.adder_seed }} me={me} size={50} />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--ink, #000)' }}>{it.name}{it.unlimited ? ' (treat)' : ''}</span>
              <span style={{ fontSize: 12 }}>added by {it.adder_id === me.id ? 'you' : firstName({ name: it.adder_name })}{it.store ? ` · ${it.store}` : ''}</span>
            </span>
            <span className="dot" style={{ fontSize: 16 }}>{stat(it)}</span>
          </Link>
        ))}
        {match ? <Link href={`/l/${slug}/shared`} className="a4-row" style={{ borderTopStyle: 'dashed', fontSize: 14, fontWeight: 700 }}>Looks like a match: {match.dupe.name}. Sort it out →</Link> : null}
      </section>

      <section aria-label="Together" style={{ padding: '22px 20px 0', display: 'flex', flexDirection: 'column' }}>
        {[[`/l/${slug}/blast`, 'Text blast', 'One message to everyone on the list'],
          [`/l/${slug}/handoff`, `How does it reach ${name}?`, list.handoff === 'surprise' ? 'Sending as a surprise' : list.handoff === 'cashout' ? 'One of you cashes out' : 'Cash out, or send it as a surprise'],
          ...(list.handoff === 'surprise' ? [[`/l/${slug}/surprise`, 'The surprise', 'Card, voice notes and when it goes out']] : []),
          [`/l/${slug}/reminders`, 'Gift-by date & reminders', list.date ? `Gift-by ${fmtDate(list.date)}` : 'No date yet']].map(([href, t, s]) => (
          <Link key={href} href={href} className="a4-row" style={{ justifyContent: 'space-between' }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontWeight: 800, fontSize: 16, color: 'var(--ink, #000)' }}>{t}</span><span style={{ fontSize: 12, color: DEEP }}>{s}</span></span>
            <Arrow />
          </Link>
        ))}
      </section>

      <Band words={band2} reverse top />
      <Nav me={me} active="home" addHref={`/l/${slug}/add`} />
    </main>
  );
}
