import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { listBySlug } from '@/lib/lists';
import { canEdit, listProgress, whoFor } from '@/lib/collab';
import { sendLabel } from '@/lib/surprise';
import { choosePartly } from '@/lib/actions-a4';
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
  const p = await listProgress(list.id);
  const now = !!sp?.now || !list.send_at;
  const when = now ? 'Sends now' : sendLabel(list).replace(/^Sends .* at /, 'Sends at ');
  const shortN = p.short;
  const choices = [
    ['asis', 'cAsis', 'Send it as it is', `${name} sees what each gift is at and can keep the list open, cash out, or move items to another list.`],
    ['wait', 'cWait', 'Wait a little', now ? `Hold it. Friends can still chip in, and you send it when you're ready.` : `Keep the scheduled send. Friends can still chip in until then, and this asks again if it's still short.`]
  ];
  return (
    <main className="a4 a4-blue withnav">
      <Hdr back={`/l/${slug}/surprise`} ink="#000" wide>Only organizers see this</Hdr>
      <section style={{ position: 'relative', padding: '14px 20px 0', height: 200 }}>
        <Boil seed={52} fill="#A9CDF5" left={-24} top={0} width={320} height={200} />
        <span className="wide" style={{ position: 'relative', display: 'block', margin: '40px 0 0 10px', fontSize: 12, letterSpacing: '0.2em', color: RUST }}>{when}</span>
        <h1 style={{ position: 'relative', margin: '8px 0 0 10px', fontWeight: 400, fontSize: 40, lineHeight: 0.98, letterSpacing: '-0.03em', color: '#000' }}>Almost <span className="serif" style={{ fontStyle: 'italic' }}>there</span></h1>
      </section>
      <p style={{ margin: '4px 20px 0', fontSize: 15, lineHeight: 1.45, color: '#000' }}>{shortN === 0 ? 'Everything is covered now. Send it whenever you like.' : `${shortN === 1 ? 'One gift isn’t' : `${shortN} gifts aren’t`} fully covered yet. ${name} will only ever see % covered, never amounts.`}</p>

      <section aria-label="Gifts" style={{ padding: '18px 20px 0', display: 'flex', flexDirection: 'column', color: '#000' }}>
        {p.items.map((it) => (
          <div key={it.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 0', borderTop: `2px solid ${RUST}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
              <span style={{ fontWeight: 800, fontSize: 16 }}>{it.name}</span>
              <span className="dot" style={{ flexShrink: 0, fontSize: 16, color: it.covered ? '#2E9B47' : RUST }}>{it.covered ? 'DONE' : `${100 - it.pct}% TO GO`}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flexGrow: 1, height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.8)', overflow: 'hidden' }}><div className="grow" style={{ width: `${it.pct}%`, background: it.covered ? '#2E9B47' : '#13286B' }} /></div>
              <span style={{ flexShrink: 0, width: 84, textAlign: 'right', fontSize: 12, fontWeight: 500 }}>{it.covered ? 'Covered' : `${it.pct}% covered`}</span>
            </div>
          </div>
        ))}
        <div style={{ borderTop: `2px solid ${RUST}` }} />
      </section>

      <form action={choosePartly} style={{ display: 'flex', flexDirection: 'column' }}>
        <input type="hidden" name="slug" value={slug} />
        {now ? <input type="hidden" name="now" value="1" /> : null}
        <section role="radiogroup" aria-label="What to do" style={{ padding: '22px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {choices.map(([k, idd, t, s], i) => (
            <label key={k} className="a4-radio">
              <input id={idd} type="radio" name="choice" value={k} defaultChecked={(list.partly || 'asis') === k || (!list.partly && i === 0)} />
              <span className="a4-dot" />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><span style={{ fontWeight: 800, fontSize: 17 }}>{t}</span><span style={{ fontSize: 13, lineHeight: 1.4 }}>{s}</span></span>
            </label>
          ))}
        </section>
        <div style={{ padding: '22px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button className="a4-btn a4-if a4-if-asis" style={{ background: RUST }}>{now ? `Send it to ${name} as it is` : `${when.replace('Sends', 'Send')} as it is`}</button>
          <button className="a4-btn a4-if a4-if-wait" style={{ background: RUST }}>{now ? 'Wait for now' : `Keep the ${when.replace('Sends at ', '')} send`}</button>
          <span style={{ textAlign: 'center', fontSize: 13, color: '#13286B' }}>{now ? 'Or wait: friends can still chip in.' : `Or wait: friends can still chip in until ${when.replace('Sends at ', '')}.`}</span>
        </div>
      </form>
      <div style={{ height: 40 }} />
      <Nav me={me} active="home" addHref={`/l/${slug}/add`} />
    </main>
  );
}
