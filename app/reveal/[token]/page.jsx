import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { all, get } from '@/lib/db';
import { itemsFor } from '@/lib/lists';
import { teamOf, giversOf, firstName, whoFor } from '@/lib/collab';
import { listByToken, messagesFor, maskPhone } from '@/lib/surprise';
import { appUrl } from '@/lib/texts';
import { openReveal, claimReveal } from '@/lib/actions-a4';
import { Avatar, ItemSketch } from '@/components/ui';
import { Boil, RUST } from '@/components/a4';
import { RevealSignup, VoicePlayer } from '@/components/a4-forms';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'A surprise for you · insidejoke' };

const CANDLE = 'M34 44 L44 44 L44 88 L34 88 Z M56 44 L66 44 L66 88 L56 88 Z M39 34 Q34 26 39 18 Q44 26 39 34 Z M61 34 Q56 26 61 18 Q66 26 61 34 Z';
const GIFT_BG = [['#E8642C', '#FFFFFF'], ['#8A5A2B', '#F4D3EE'], ['#96E084', '#000000'], ['#13286B', '#D8F75A'], ['#B36EE0', '#FFFFFF']];
const HEAT = 'radial-gradient(circle at 30% 20%, #FFE34D 0%, rgba(255,227,77,0) 40%), radial-gradient(circle at 70% 60%, #FF8A3D 0%, rgba(255,138,61,0) 45%), linear-gradient(160deg, #B53CF0 0%, #E85BD8 40%, #FF9A3C 75%, #FFE34D 100%)';

function forWhat(list) {
  const m = /'s\s+(.+)$/i.exec(list.title || '');
  return m ? `your ${m[1]}` : list.occasion ? `your ${list.occasion.toLowerCase()}` : 'you';
}

function Gift({ size = 210 }) {
  return (
    <svg aria-hidden="true" style={{ position: 'relative' }} width={size} height={size} viewBox="0 0 200 200" fill="none" stroke="#000" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M38 96 C37 120 38 150 40 180 C80 184 124 184 162 179 C164 150 164 122 162 96" /><path d="M36 98 C80 101 122 101 164 97" strokeWidth="2.4" />
      <path d="M92 99 C93 128 92 156 91 182 M108 99 C109 128 108 156 108 182" /><path d="M120 112 L150 110 M121 124 L151 122 M121 136 L151 134 M122 148 L151 147 M122 160 L151 159 M50 112 L80 111 M50 124 L80 123" strokeWidth="2" />
      <path d="M26 78 C70 70 130 66 176 70 L178 96 C130 92 72 96 28 102 Z" /><path d="M24 76 C60 69 110 64 150 66" strokeWidth="2" /><path d="M92 71 L94 99 M108 69 L110 97" />
      <path d="M100 68 C84 40 52 34 56 54 C60 68 88 70 100 68 Z" /><path d="M100 68 C116 38 150 36 146 56 C142 70 112 70 100 68 Z" />
      <path d="M100 68 C94 74 88 86 84 92 M100 68 C106 76 112 86 116 92" strokeWidth="2.6" /><path d="M66 50 C72 52 80 56 86 62 M134 48 C128 52 120 56 114 62" strokeWidth="1.8" />
      <path d="M30 40 L36 48 M42 30 L40 42 M170 38 L162 46 M178 54 L166 56 M166 22 L160 34" strokeWidth="2.4" />
      <path d="M164 128 C176 126 186 132 186 140 C186 148 176 150 170 146 L164 128 Z" strokeWidth="2.2" /><path d="M158 126 L164 128" strokeWidth="2" />
    </svg>
  );
}

function SignUpView({ list, people, organiser, me, token }) {
  const name = whoFor(list);
  return (
    <main className="r4-sky" style={{ background: '#A9CDF5', color: '#000', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <section style={{ position: 'relative', background: RUST, padding: '22px 20px 26px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span className="wide" style={{ fontSize: 11, letterSpacing: '0.22em', color: '#fff' }}>insidejoke</span>
        <div style={{ marginTop: 10, maxWidth: '100%' }}>
          <svg role="img" aria-label="A hand-drawn gift box with its lid lifting" width="350" height="300" style={{ maxWidth: '100%', height: 'auto' }} viewBox="0 0 300 260" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M74 132 C72 168 73 204 76 238 C124 243 178 243 226 236 C229 202 229 166 227 130" /><path d="M70 134 C120 138 182 137 231 131" />
            <path d="M141 136 C143 170 142 206 140 242 M159 136 C161 172 160 206 160 241" />
            <path d="M172 150 L218 147 M173 162 L219 159 M173 174 L219 172 M174 186 L220 184 M174 198 L220 196 M175 210 L220 209 M176 222 L220 221" strokeWidth="2" /><path d="M84 150 L104 149 M84 162 L101 161" strokeWidth="2" />
            <g className="a4-lift">
              <path d="M58 96 C110 86 190 84 244 90 L246 120 C190 116 112 118 60 126 Z" /><path d="M54 94 C100 86 160 82 206 84" strokeWidth="2" /><path d="M140 88 L142 122 M158 87 L160 120" />
              <path d="M150 86 C128 50 86 44 92 70 C96 88 132 90 150 86 Z" /><path d="M150 86 C170 46 214 44 208 70 C204 88 168 90 150 86 Z" />
              <path d="M104 64 C114 68 126 74 136 80 M196 62 C186 66 174 74 164 80" strokeWidth="1.8" /><path d="M150 86 C140 96 130 112 126 128 M150 86 C162 98 170 112 176 126" strokeWidth="2.4" />
            </g>
            <path className="a4-tw" d="M40 70 L50 80 M54 52 L52 66 M30 98 L44 98" strokeWidth="2.4" /><path className="a4-tw2" d="M262 66 L250 78 M270 92 L254 94 M246 46 L244 60" strokeWidth="2.4" />
            <path d="M60 246 C110 252 200 252 248 244" strokeWidth="2" />
          </svg>
        </div>
      </section>
      <section style={{ position: 'relative', padding: '30px 20px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Boil seed={61} fill="#F4D3EE" left={40} top={6} width={310} height={170} />
        <span className="wide" style={{ position: 'relative', fontSize: 12, letterSpacing: '0.2em', color: RUST }}>Happy {forWhat(list).replace(/^your /, '')}, {name}</span>
        <h1 className="serif" style={{ position: 'relative', margin: '14px 0 0', fontWeight: 400, fontSize: 42, lineHeight: 1 }}>Your friends have a <span style={{ fontStyle: 'italic' }}>surprise</span> for you</h1>
      </section>
      <div style={{ padding: '22px 20px 0', display: 'flex', justifyContent: 'center' }}>
        {people.slice(0, 8).map((u) => <span key={u.id} style={{ marginLeft: -4 }}><Avatar user={u} size={36} /></span>)}
      </div>
      <p style={{ margin: '10px 20px 0', textAlign: 'center', fontSize: 14 }}>From {firstName(organiser)}{people.length > 1 ? ` and ${people.length - 1} ${people.length - 1 === 1 ? 'friend' : 'friends'}` : ''}</p>
      {me && me.phone !== list.recipient_phone ? (
        <p style={{ margin: '18px 16px 0', background: '#fff', padding: '14px 16px', fontSize: 14, lineHeight: 1.4 }}>You're signed in as {firstName(me)}. This surprise is for {name}, so only {name}'s number can open it.</p>
      ) : null}
      <RevealSignup phone={list.recipient_phone} name={name} next={`/reveal/${token}`} masked={maskPhone(list.recipient_phone)} auto={!me} />
      <p style={{ margin: '22px 20px 0', textAlign: 'center', fontFamily: "'EB Garamond', serif", fontSize: 18, lineHeight: 1.3 }}>Your number becomes your insidejoke account. No password, nothing else to fill in.</p>
      <div style={{ height: 40 }} />
    </main>
  );
}

export default async function RevealPage({ params, searchParams }) {
  const { token } = await params;
  const sp = await searchParams;
  const list = await listByToken(token);
  if (!list) notFound();
  const me = await currentUser();
  const team = await teamOf(list);
  const organiser = (await get("SELECT u.* FROM list_members m JOIN users u ON u.id = m.user_id WHERE m.list_id = ? AND m.role = 'organiser'", list.id)) || team[0];
  const givers = await giversOf(list.id);
  const seen = new Set();
  const people = [organiser, ...team, ...givers].filter((u) => u && u.phone !== list.recipient_phone && !seen.has(u.id) && seen.add(u.id));
  const isReceiver = me && list.recipient_phone && me.phone === list.recipient_phone;
  if (!isReceiver) return <SignUpView list={list} people={people} organiser={organiser} me={me} token={token} />;

  const name = whoFor(list);
  const opened = !!sp?.open && !!list.opened_at;
  const names = people.map(firstName);
  const line1 = `From ${names.slice(0, 3).join(', ')}`;
  const line2 = `${names.length > 3 ? `and ${names.length - 3} more, ` : ''}for ${forWhat(list)}`;
  const items = opened ? await itemsFor(list.id) : [];
  const msgs = opened ? await messagesFor(list.id) : [];
  const notes = msgs.filter((m) => m.kind === 'card');
  const voices = msgs.filter((m) => m.kind === 'voice' && m.media);
  const videos = msgs.filter((m) => m.kind === 'video' && m.media);
  const confetti = Array.from({ length: 22 }, (_, i) => { const k = i % 3; return { x: (i * 53 + 9) % 380, w: k === 0 ? 12 : 7, h: k === 0 ? 12 : 18, r: k === 0 ? '50%' : 2, c: ['#000', '#fff', '#FFE34D', '#13286B', '#96E084'][i % 5], d: `${(-(i * 0.45) % 6).toFixed(2)}s`, dur: `${(5 + (i % 4) * 0.7).toFixed(1)}s` }; });

  return (
    <main className="a4-heat" style={{ position: 'relative', minHeight: '100vh', color: '#000', overflow: 'hidden', backgroundImage: HEAT }}>
      <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, mixBlendMode: 'overlay', opacity: 0.45, pointerEvents: 'none' }} width="100%" height="100%"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter><rect width="100%" height="100%" filter="url(#g)" /></svg>
      {opened ? confetti.map((c, i) => <div key={i} aria-hidden="true" className="a4-fall" style={{ position: 'absolute', left: c.x, top: 0, width: c.w, height: c.h, borderRadius: c.r, background: c.c, animationDelay: c.d, animationDuration: c.dur, pointerEvents: 'none' }} />) : null}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', fontSize: 12, fontWeight: 700 }}>
          <span><span className="wide" style={{ fontSize: 14, textTransform: 'none' }}>inside</span><span className="dot" style={{ fontSize: 17 }}>joke</span></span>
          <span>{appUrl().replace(/^https?:\/\//, '')}/reveal</span>
        </header>
        <h1 style={{ margin: '60px 0 0', padding: '0 22px', fontWeight: 400, fontSize: 60, lineHeight: 0.92, letterSpacing: '-0.035em' }}>Your friends have a <span style={{ fontFamily: "'EB Garamond', serif", fontStyle: 'italic', fontSize: 66 }}>surprise</span> for you</h1>
        <div style={{ margin: '26px 22px 0', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
          <span style={{ background: '#000', color: '#fff', fontSize: 20, fontWeight: 600, padding: '4px 8px' }}>{line1}</span>
          <span style={{ background: '#000', color: '#fff', fontSize: 20, fontWeight: 600, padding: '4px 8px' }}>{line2}</span>
        </div>

        {!opened ? (
          <form action={openReveal} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: '60px 20px 80px' }}>
            <input type="hidden" name="token" value={token} />
            <div className="a4-shake" style={{ position: 'relative' }}>
              <Boil seed={5} fill="#D8F75A" left={-45} top={-35} width={300} height={280} />
              <Gift />
            </div>
            <button style={{ border: 0, background: '#000', color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 19, padding: '18px 42px', borderRadius: 999, cursor: 'pointer' }}>Open it</button>
            {!list.sent_at ? <span style={{ fontSize: 13, fontWeight: 600 }}>It isn't quite ready yet, but you can peek.</span> : null}
          </form>
        ) : (
          <>
            <section className="a4-pop" style={{ padding: '36px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h2 className="wide" style={{ margin: '0 0 4px 4px', fontSize: 16, letterSpacing: '0.16em' }}>They got you</h2>
              {items.map((it, i) => {
                const [bg, ink] = GIFT_BG[i % GIFT_BG.length];
                return (
                  <div key={it.id} style={{ display: 'flex', gap: 14, alignItems: 'center', background: 'rgba(255,255,255,0.88)', padding: 12 }}>
                    <span style={{ width: 70, height: 70, flexShrink: 0, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {it.photo ? <img src={it.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : /candle/i.test(it.name) ? <svg aria-hidden="true" width="56" height="56" viewBox="0 0 100 100" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path className="draw" d={CANDLE} /></svg> : <ItemSketch name={it.name} unlimited={it.unlimited} size={56} ink={ink} strokeWidth={3} />}
                    </span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                      <span style={{ fontWeight: 800, fontSize: 17 }}>{it.name}</span>
                      <span style={{ fontSize: 13 }}>{[it.note, it.store].filter(Boolean).join(' · ') || ' '}{!it.unlimited && !it.covered ? ` · ${it.pct}% covered` : ''}{it.unlimited ? ` · ×${it.timesTreated}` : ''}</span>
                    </span>
                  </div>
                );
              })}
            </section>
            {notes.length ? (
              <section className="a4-pop" style={{ position: 'relative', margin: '24px 16px 0', background: '#fff', padding: '22px 18px', display: 'flex', flexDirection: 'column', gap: 14, animationDelay: '.2s' }}>
                <svg aria-hidden="true" className="a4-spin" style={{ position: 'absolute', right: -40, top: -40 }} width="130" height="130" viewBox="0 0 130 130"><defs><path id="r" d="M65 65 m-50 0 a50 50 0 1 1 100 0 a50 50 0 1 1 -100 0" /></defs><text style={{ fontFamily: "'Archivo', sans-serif", fontWeight: 800, fontSize: 12, fill: '#B53CF0', letterSpacing: 1 }}><textPath href="#r">{`HAPPY ${forWhat(list).replace(/^your /, '').toUpperCase()} ${name.toUpperCase()} · HAPPY ${forWhat(list).replace(/^your /, '').toUpperCase()} ·`}</textPath></text></svg>
                <h2 style={{ margin: 0, fontWeight: 400, fontSize: 28, letterSpacing: '-0.02em' }}>Happy {forWhat(list).replace(/^your /, '')}, {name}</h2>
                {notes.map((n) => (
                  <div key={n.id} style={{ borderTop: '1.5px solid #000', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {n.media ? <img src={n.media} alt={`Photo from ${firstName(n)}`} style={{ width: '100%', maxHeight: 260, objectFit: 'cover' }} /> : null}
                    {n.body ? <span style={{ fontSize: 16, lineHeight: 1.35 }}>{n.body}</span> : null}
                    <span style={{ fontSize: 13, fontWeight: 800 }}>{firstName(n)}</span>
                  </div>
                ))}
              </section>
            ) : null}
            {voices.length || videos.length ? (
              <section className="a4-pop" style={{ margin: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 8, animationDelay: '.35s' }}>
                {voices.map((v, i) => <VoicePlayer key={v.id} src={v.media} who={firstName(v)} dark seed={[37, 23, 29, 41][i % 4]} />)}
                {videos.map((v) => (
                  <div key={v.id} style={{ position: 'relative', background: '#13286B' }}>
                    <video src={v.media} controls playsInline preload="metadata" style={{ display: 'block', width: '100%', maxHeight: 360 }} />
                    <span style={{ position: 'absolute', left: 12, top: 10, color: '#fff', fontSize: 13, fontWeight: 700, background: 'rgba(0,0,0,.5)', padding: '2px 6px' }}>Video from {firstName(v)}</span>
                  </div>
                ))}
              </section>
            ) : null}
            <section className="a4-pop" style={{ padding: '26px 16px 40px', display: 'flex', flexDirection: 'column', gap: 10, animationDelay: '.5s' }}>
              {list.claimed_at ? (
                <>
                  <Link href="/wallet" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', background: '#000', color: '#fff', fontWeight: 800, fontSize: 18, padding: '18px 0', borderRadius: 999 }}>Go to your wallet</Link>
                  <Link href={`/l/${list.slug}/thank-group`} style={{ display: 'block', textAlign: 'center', textDecoration: 'none', border: '2px solid #000', fontWeight: 800, fontSize: 16, padding: '15px 0', borderRadius: 999 }}>Thank everyone</Link>
                </>
              ) : (
                <form action={claimReveal} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input type="hidden" name="token" value={token} />
                  <button style={{ border: 0, background: '#000', color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 18, padding: '18px 0', borderRadius: 999, cursor: 'pointer' }}>Claim your gifts</button>
                  <span style={{ textAlign: 'center', fontSize: 13, fontWeight: 600 }}>What they gave moves to your wallet. Cash out or buy them yourself.</span>
                </form>
              )}
              <Link href={`/reveal/${token}`} style={{ alignSelf: 'center', fontSize: 13, padding: 8 }}>Wrap it back up</Link>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
