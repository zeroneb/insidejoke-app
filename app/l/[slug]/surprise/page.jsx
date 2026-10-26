import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { listBySlug } from '@/lib/lists';
import { canEdit, giversOf, itemsWithAdder, listProgress, firstName, whoFor } from '@/lib/collab';
import { messagesFor, countKinds, surpriseText, ensureToken, sendLabel } from '@/lib/surprise';
import { ago } from '@/lib/time';
import { sendSurpriseNow } from '@/lib/actions-a4';
import Nav from '@/components/nav';
import { Boil, RUST, BROWN } from '@/components/a4';
import { VoicePlayer } from '@/components/a4-forms';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'The surprise · insidejoke' };

const Check = () => <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={RUST} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6" /></svg>;

export default async function SurpriseSendPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const list = await listBySlug(slug);
  if (!list) notFound();
  const me = await currentUser();
  if (!me) redirect(`/signup?next=/l/${slug}/surprise`);
  if (!(await canEdit(list, me))) redirect(`/l/${slug}`);
  if (list.handoff !== 'surprise' || !list.recipient_phone) redirect(`/l/${slug}/handoff`);
  const token = await ensureToken(list);
  const name = whoFor(list);
  const p = await listProgress(list.id);
  const items = await itemsWithAdder(list);
  const givers = await giversOf(list.id);
  const msgs = await messagesFor(list.id);
  const kinds = countKinds(msgs);
  const voice = [...msgs].reverse().find((m) => m.kind === 'voice' && m.media);
  const text = surpriseText(list, token);
  const titleWords = list.title.split(/\s+/);
  const sent = !!list.sent_at;
  const stamp = sent ? (list.opened_at ? `Opened ${ago(list.opened_at)}` : `Sent ${ago(list.sent_at)} · not opened yet`) : list.send_at ? sendLabel(list) : 'Ready when you are';

  return (
    <main className="a4 a4-blue r4-sky withnav">
      <section style={{ position: 'relative', height: 430, background: 'var(--lt, #A9CDF5)' }}>
        <header className="a4-hdr" style={{ position: 'relative', zIndex: 2 }}>
          <Link href={`/l/${slug}/collab`} aria-label="Back" className="a4-back"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--inv-fg, #fff)" strokeWidth="2.2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></Link>
          <span aria-hidden="true" style={{ width: 18, height: 18, marginRight: 14, borderRadius: '50%', background: RUST }} />
        </header>
        <svg aria-hidden="true" className="a4-breathe" style={{ position: 'absolute', right: -100, top: 150 }} width="320" height="320" viewBox="0 0 270 270"><defs><pattern id="ht" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="2.7" fill={RUST} /></pattern><radialGradient id="f" cx="40%" cy="40%" r="65%"><stop offset="0" stopColor="#000" /><stop offset="1" stopColor="#fff" /></radialGradient><mask id="m"><rect width="270" height="270" fill="url(#f)" /></mask></defs><circle cx="135" cy="135" r="135" fill="#E7B48A" /><circle cx="135" cy="135" r="135" fill="url(#ht)" mask="url(#m)" /></svg>
        <h1 className="wide" style={{ position: 'relative', zIndex: 2, margin: '20px 0 0', padding: '0 20px', color: 'var(--inv-fg, #fff)', fontSize: titleWords.some((w) => w.length > 8) ? 38 : 50, letterSpacing: '0.1em', lineHeight: 1 }}>{titleWords.slice(0, Math.ceil(titleWords.length / 2)).join(' ')}<br />{titleWords.slice(Math.ceil(titleWords.length / 2)).join(' ')}</h1>
        <Boil seed={5} fill="#F4D3EE" left={-30} top={168} width={300} height={170} style={{ zIndex: 1 }} />
        <div style={{ position: 'relative', zIndex: 2, margin: '26px 0 0 20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, color: RUST }}>
          <span className="wide" style={{ fontSize: 12, letterSpacing: '0.2em', borderBottom: `2px solid ${RUST}`, paddingBottom: 3 }}>Surprise</span>
          <span style={{ fontWeight: 800, fontSize: 24, lineHeight: 1.1 }}>{p.pct >= 100 ? 'Fully funded' : `${p.pct}% funded`}<br />by {givers.length} {givers.length === 1 ? 'friend' : 'friends'}</span>
        </div>
        <span className="dot" style={{ position: 'absolute', left: 20, bottom: 16, zIndex: 2, color: 'var(--inv-fg, #fff)', fontSize: 64 }}>{p.pct}%</span>
      </section>

      <section style={{ padding: '6px 20px 0', display: 'flex', flexDirection: 'column' }}>
        <h2 className="wide" style={{ margin: '0 0 6px', fontSize: 14, letterSpacing: '0.16em', color: BROWN }}>{name}'s gifts</h2>
        {items.map((it) => (
          <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: `2px solid ${RUST}` }}>
            <span style={{ fontWeight: 800, fontSize: 16 }}>{it.name}</span>
            {it.covered ? <Check /> : <span className="dot" style={{ fontSize: 15, color: RUST, flexShrink: 0 }}>{it.unlimited ? `×${it.timesTreated}` : `${it.pct}%`}</span>}
          </div>
        ))}
        {p.short > 0 && !sent ? <Link href={`/l/${slug}/partly`} style={{ padding: '12px 0', borderTop: `2px solid ${RUST}`, fontSize: 14, fontWeight: 700, color: BROWN }}>{p.short === 1 ? '1 gift is' : `${p.short} gifts are`} not fully covered yet →</Link> : null}
      </section>

      <section style={{ margin: '22px 16px 0', background: 'var(--surface, #fff)', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 className="wide" style={{ margin: 0, fontSize: 14, letterSpacing: '0.16em', color: RUST }}>{name}'s surprise card</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, textAlign: 'center' }}>
          <Link href={`/l/${slug}/record?mode=card`} style={{ background: 'var(--lt, #F4D3EE)', padding: '12px 4px', display: 'flex', flexDirection: 'column', gap: 4, textDecoration: 'none' }}><span className="dot" style={{ fontSize: 26, color: '#E2452B' }}>{kinds.card}</span><span style={{ fontSize: 12, fontWeight: 700 }}>{kinds.card === 1 ? 'note' : 'notes'}</span></Link>
          <div style={{ background: 'var(--lt, #96E084)', padding: '12px 4px', display: 'flex', flexDirection: 'column', gap: 4 }}><span className="dot" style={{ fontSize: 26 }}>{kinds.voice}</span><span style={{ fontSize: 12, fontWeight: 700 }}>{kinds.voice === 1 ? 'voice note' : 'voice notes'}</span></div>
          <div style={{ background: 'var(--dk, #13286B)', color: 'var(--inv-fg, #fff)', padding: '12px 4px', display: 'flex', flexDirection: 'column', gap: 4 }}><span className="dot" style={{ fontSize: 26, color: '#D4FA4F' }}>{kinds.video}</span><span style={{ fontSize: 12, fontWeight: 700 }}>{kinds.video === 1 ? 'video' : 'videos'}</span></div>
        </div>
        {!sent ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href={`/l/${slug}/record?mode=voice`} style={{ flex: '1 1 0', height: 54, border: '2px solid var(--line, #000)', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none' }}><span className="a4-blink" aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--dk, #E2452B)' }} />Record voice</Link>
            <Link href={`/l/${slug}/record?mode=video`} style={{ flex: '1 1 0', height: 54, border: '2px solid var(--line, #000)', fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none' }}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3" /></svg>Add video</Link>
          </div>
        ) : null}
        {voice ? (
          <VoicePlayer src={voice.media} who={firstName(voice)} />
        ) : !sent ? <Link href={`/l/${slug}/record?mode=card`} style={{ fontSize: 14, fontWeight: 700 }}>Write a note for the card →</Link> : null}
      </section>

      <section style={{ margin: '22px 16px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 className="wide" style={{ margin: 0, fontSize: 14, letterSpacing: '0.16em', color: BROWN }}>Text {name} the surprise</h2>
        <div style={{ background: 'var(--surface, #fff)', borderRadius: 18, padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ textAlign: 'center', fontSize: 11, color: 'var(--mute2, #6A6A6A)' }}>To: {name}</span>
          <div style={{ alignSelf: 'flex-end', maxWidth: '88%', background: 'var(--lt, #1E88FF)', color: 'var(--inv-fg, #fff)', borderRadius: '18px 18px 4px 18px', padding: '10px 13px', fontSize: 14, lineHeight: 1.4, wordBreak: 'break-word' }}>{text}</div>
          <span style={{ alignSelf: 'flex-end', fontSize: 11, color: 'var(--mute2, #6A6A6A)' }}>{stamp}</span>
        </div>
        {sent ? (
          <p className="pop" style={{ margin: 0, textAlign: 'center', fontWeight: 800, fontSize: 16 }}>{sp.sent ? `Sent. ${name} has it now 🎁` : list.opened_at ? `${name} opened it.` : `On its way. ${name} gets a nudge if it stays wrapped.`}</p>
        ) : (
          <form action={sendSurpriseNow} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input type="hidden" name="slug" value={slug} />
            <button className="a4-btn" style={{ background: RUST }}>{list.send_at ? `Send it to ${name} now` : `Text it to ${name}`}</button>
          </form>
        )}
        <span style={{ textAlign: 'center', fontSize: 12, color: 'var(--warm-ink, #4A3A2A)' }}>{list.send_at && !sent ? `${sendLabel(list)} on its own. ` : ''}{name} signs up to open it and claim the gifts.</span>
        {!sent ? <Link href={`/l/${slug}/handoff`} style={{ textAlign: 'center', fontSize: 13, color: 'var(--navy-ink, #13286B)' }}>Change the number or the day</Link> : null}
      </section>
      <div style={{ height: 30 }} />
      <Nav me={me} active="home" addHref={`/l/${slug}/add`} />
    </main>
  );
}
