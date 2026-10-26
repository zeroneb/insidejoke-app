import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { listBySlug } from '@/lib/lists';
import { canEdit, movePlan, whoFor } from '@/lib/collab';
import { sendLabel } from '@/lib/surprise';
import { choosePartly } from '@/lib/actions-a4';
import { moveMoneyAction } from '@/lib/actions-r4';
import Nav from '@/components/nav';
import { Boil, Hdr, RUST, BROWN } from '@/components/a4';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Almost there · insidejoke' };

// The organiser's choice when a surprise is not fully funded at send time. Never amounts: % covered only.
export default async function PartlyPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const list = await listBySlug(slug);
  if (!list) notFound();
  const me = await currentUser();
  if (!me) redirect(`/signup?next=/l/${slug}/partly`);
  if (!(await canEdit(list, me))) redirect(`/l/${slug}`);
  if (list.sent_at) redirect(`/l/${slug}/surprise`);
  const name = whoFor(list);
  const plan = await movePlan(list.id);
  const p = plan.progress;
  const now = !!sp?.now || !list.send_at;
  const when = now ? 'Sends now' : sendLabel(list).replace(/^Sends .* at /, 'Sends at ');
  const shortN = p.short;
  const until = now ? '' : when.replace('Sends at ', '');
  const canMove = plan.targets.length > 0 && shortN > 1;
  const pick = canMove && plan.any && list.partly !== 'asis' ? 'move' : 'asis';
  const firstOk = plan.targets.find((t) => t.ok);
  const nm = (n) => { const w = n.split(/[,(]/)[0].trim().split(/\s+/); return w.length > 2 ? `the ${w.find((x) => /^(class|boots|candles|print|oven|vase|bag|camera|ticket)s?$/i.test(x)) || w[w.length - 1].toLowerCase()}` : `the ${w.join(' ').toLowerCase()}`; };
  const sub = (t) => !t.ok
    ? (t.others ? 'Not enough given to the others to move yet.' : 'Nothing given to the others to move yet.')
    : t.takes.length === 1 ? `Move some from ${nm(t.takes[0].name)}. ${nm(t.takes[0].name).replace(/^the/, 'The')} drops to ${t.takes[0].after}%.` : `Move some from ${t.takes.map((x) => nm(x.name)).join(' and ')}.`;
  const choices = [
    ...(canMove ? [['move', 'cMove', 'Move money', 'Shift what was given so one more gift is fully covered.']] : []),
    ['asis', 'cAsis', 'Send it as it is', `${name} sees what each gift is at and can keep the list open, cash out, or move items to another list.`]
  ];
  return (
    <main className="a4 a4-blue r4-sky withnav">
      <Hdr back={`/l/${slug}/surprise`} ink="#000" wide>Only organizers see this</Hdr>
      <section style={{ position: 'relative', padding: '14px 20px 0', height: 200 }}>
        <Boil seed={52} fill="#FFFFFF" left={-24} top={0} width={320} height={200} />
        <span className="wide" style={{ position: 'relative', display: 'block', margin: '40px 0 0 10px', fontSize: 12, letterSpacing: '0.2em', color: RUST }}>{when}</span>
        <h1 style={{ position: 'relative', margin: '8px 0 0 10px', fontWeight: 400, fontSize: 40, lineHeight: 0.98, letterSpacing: '-0.03em', color: 'var(--ink, #000)' }}>Almost <span className="serif" style={{ fontStyle: 'italic' }}>there</span></h1>
      </section>
      <p style={{ margin: '4px 20px 0', fontSize: 15, lineHeight: 1.45, color: 'var(--ink, #000)' }}>{shortN === 0 ? 'Everything is covered now. Send it whenever you like.' : `${shortN === 1 ? 'One gift isn’t' : `${['Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'][shortN - 2] || shortN} gifts aren’t`} fully covered yet. ${name} will only ever see % covered, never amounts.`}</p>

      <section aria-label="Gifts" style={{ padding: '18px 20px 0', display: 'flex', flexDirection: 'column', color: 'var(--ink, #000)' }}>
        {p.items.map((it) => (
          <div key={it.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 0', borderTop: `2px solid ${RUST}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
              <span style={{ fontWeight: 800, fontSize: 16 }}>{it.name}</span>
              <span className="dot" style={{ flexShrink: 0, fontSize: 16, color: it.covered ? '#2E9B47' : RUST }}>{it.covered ? 'DONE' : `${100 - it.pct}% TO GO`}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flexGrow: 1, height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.8)', overflow: 'hidden' }}><div className="grow" style={{ width: `${it.pct}%`, background: it.covered ? 'var(--lt, #2E9B47)' : 'var(--dk, #13286B)' }} /></div>
              <span style={{ flexShrink: 0, width: 84, textAlign: 'right', fontSize: 12, fontWeight: 500 }}>{it.covered ? 'Covered' : `${it.pct}% covered`}</span>
            </div>
          </div>
        ))}
        <div style={{ borderTop: `2px solid ${RUST}` }} />
      </section>

      <form action={choosePartly} style={{ display: 'flex', flexDirection: 'column' }}>
        <input type="hidden" name="slug" value={slug} />
        {now ? <input type="hidden" name="now" value="1" /> : null}
        {sp?.nomove ? <div className="err" style={{ margin: '18px 16px 0' }}>That move no longer works. Pick again.</div> : null}
        <section role="radiogroup" aria-label="What to do" style={{ padding: '22px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {choices.map(([k, idd, t, s]) => (
            <label key={k} className="a4-radio">
              <input id={idd} type="radio" name="choice" value={k} defaultChecked={pick === k} />
              <span className="a4-dot" />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><span style={{ fontWeight: 800, fontSize: 17 }}>{t}</span><span style={{ fontSize: 13, lineHeight: 1.4 }}>{s}</span></span>
            </label>
          ))}
        </section>
        {canMove ? (
          <section className="a4-up r4-if r4-if-move" style={{ margin: '12px 16px 0', background: 'var(--surface, #FFFFFF)', padding: 16, flexDirection: 'column', gap: 10 }}>
            <span className="wide" style={{ fontSize: 12, letterSpacing: '0.16em', color: RUST }}>Fully cover</span>
            {plan.targets.map((t) => (
              <label key={t.id} className={`r4-target${t.ok ? '' : ' r4-off'}`}>
                <input type="radio" name="target" value={t.id} disabled={!t.ok} defaultChecked={t.id === firstOk?.id} />
                <span style={{ fontWeight: 800, fontSize: 15 }}>{t.name}</span><span style={{ fontSize: 13, lineHeight: 1.35 }}>{sub(t)}</span>
              </label>
            ))}
          </section>
        ) : null}
        <div style={{ padding: '22px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {canMove ? <button className="a4-btn r4-if r4-if-move" formAction={moveMoneyAction} disabled={!plan.any} style={{ background: RUST, justifyContent: 'center' }}>{now ? `Move it and send to ${name}` : `Move it and keep the ${until} send`}</button> : null}
          <button className="a4-btn a4-if a4-if-asis" style={{ background: RUST }}>{now ? `Send it to ${name} as it is` : `${when.replace('Sends', 'Send')} as it is`}</button>
          <button name="wait" value="1" style={{ border: 0, background: 'transparent', fontFamily: 'inherit', textAlign: 'center', fontSize: 13, color: 'var(--navy-ink, #13286B)', padding: '4px 0', cursor: 'pointer' }}>{now ? 'Or wait: friends can still chip in.' : `Or wait: friends can still chip in until ${until}.`}</button>
        </div>
      </form>
      <div style={{ height: 40 }} />
      <Nav me={me} active="home" addHref={`/l/${slug}/add`} />
    </main>
  );
}
