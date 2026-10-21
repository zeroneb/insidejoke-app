import Link from 'next/link';
import { Blob, Logo } from '@/components/ui';
import { blob } from '@/lib/blob';

const rep = (a) => a.concat(a, a, a);
const BAND = rep(["Let's celebrate you", '✦', 'and life', '✦']);
const COLLAB_BAND = rep(['Collab lists', '✦', 'Make it together', '✦']);
const W7 = ['Santal 33', 'black boots, EU 38', 'a lox bagel', 'oat latte', 'pottery class for two', 'peonies', 'film camera'];
const C7 = ['#D8F75A', '#F0895A', '#5FC3D9', '#B36EE0', '#93EC75', '#E3C552', '#D8F75A'];
const TICKER = W7.map((w, i) => ({ word: w, color: C7[i] }));
const TICKER2 = TICKER.concat(TICKER);
const BARS = [
  { name: 'Leather boots', label: '82% covered', pct: 82, color: '#D8F75A', d: '0.3s' },
  { name: 'Santal 33', label: '45% covered', pct: 45, color: '#D8F75A', d: '0.5s' },
  { name: 'Beeswax candles', label: 'All covered', pct: 100, color: '#13286B', d: '0.7s' }
];
const BOOT = 'M34 14 L52 14 L52 56 Q72 60 80 70 L80 84 L26 84 L26 74 Q34 70 34 56 Z M26 76 L80 76 M40 30 L48 30 M40 40 L48 40';

function MenuIcon() {
  return (
    <Link href="/menu" aria-label="Menu: log in, company, contact" className="iconbtn">
      <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#13286B" strokeWidth="2.2" strokeLinecap="round"><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></svg>
    </Link>
  );
}

export default function Landing() {
  const priya = blob(21, 4);
  return (
    <main className="lp">
      <section aria-label="Announcement" className="lp-band">
        <div className="marq lp-bandin">{BAND.map((b, i) => <span key={i}>{b}</span>)}</div>
      </section>

      <section className="lp-hero">
        <header className="lp-hdr">
          <Logo />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Link href="/signup" className="lp-signup">Sign up</Link>
            <MenuIcon />
          </div>
        </header>
        <div className="breathe lp-pinkcircle" aria-hidden="true" />
        <Blob seed={5} color="#D8F75A" width={400} height={340} style={{ zIndex: 1, left: -40, top: 78 }} />
        <div className="tiltbob lp-sticker lp-sticker-a" style={{ '--r': '6deg', animationDelay: '-1.5s' }}>boots · 82% covered</div>
        <div className="tiltbob lp-sticker lp-sticker-b" style={{ '--r': '-8deg' }}>
          <span style={{ fontWeight: 500 }}>Priya contributed</span><br /><span className="it" style={{ fontSize: 16 }}>"for every winter walk"</span>
        </div>
        <h1 className="lp-h1">Let's celebrate you, and <span className="it" style={{ fontSize: 54 }}>life.</span></h1>
        <p className="lp-sub">Make it easy for the people who love you to celebrate you.</p>
        <Link href="/lists/new" className="lp-cta-white">Start your list</Link>
      </section>

      <section aria-label="Things on lists right now" className="lp-ticker">
        <div className="marq lp-tickerin">{TICKER2.map((t, i) => <span key={i}>{t.word} <span style={{ color: t.color }}>✺</span></span>)}</div>
      </section>

      <section className="lp-step" style={{ background: '#E3C552' }}>
        <p className="lp-lead">Your taste, down to the detail.</p>
        <h2 className="lp-h2">Name what you'd love, down to the <span className="it lp-h2i">shade.</span></h2>
        <div className="lp-card" style={{ alignItems: 'center' }}>
          <div className="lp-tile" style={{ background: '#F0895A' }}>
            <svg aria-hidden="true" width="58" height="58" viewBox="0 0 100 100" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path className="draw" d={BOOT} /></svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
            <span style={{ fontSize: 17, letterSpacing: '-0.01em' }}>Ganni Western leather boots</span>
            <span style={{ fontSize: 12, fontWeight: 500 }}>ganni.com</span>
            <span className="it" style={{ fontSize: 16 }}>the black ones, not the brown</span>
          </div>
        </div>
        <p className="lp-p">Paste a link or snap a photo. Friends see exactly what you mean and tap straight through to it.</p>
      </section>

      <section className="lp-step" style={{ background: '#ECECEF' }}>
        <p className="lp-lead">One link, anywhere.</p>
        <h2 className="lp-h2">Share it in a text, an invite, or your <span className="it lp-h2i">bio.</span></h2>
        <div className="lp-preview">
          <div className="lp-preview-top">
            <Blob seed={8} color="#D8F75A" width={220} height={106} style={{ left: 30, top: 12 }} />
            <span className="serif" style={{ position: 'relative', fontSize: 26, color: '#000' }}>For my <span style={{ fontWeight: 600 }}>birthday</span></span>
          </div>
          <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>Maya shared a birthday list with you</span>
            <span style={{ fontSize: 12, color: '#4A4A4A' }}>insidejoke.app</span>
          </div>
        </div>
        <p className="lp-p">Nobody has to guess, and nobody doubles up.</p>
      </section>

      <section className="lp-step" style={{ background: '#13286B', color: '#fff' }}>
        <p className="lp-lead">Friends and family give.</p>
        <h2 className="lp-h2">Get it, chip in, or <span className="it lp-h2i">treat.</span></h2>
        <div className="lp-card" style={{ color: '#000' }}>
          <span className="avatar" style={{ width: 44, height: 44 }}>
            <svg aria-hidden="true" width="44" height="44" viewBox="0 0 200 200"><path d={priya} fill="#B36EE0" /></svg>
            <span style={{ fontWeight: 800, fontSize: 17 }}>P</span>
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 14 }}>Priya chipped in on the boots</span>
            <span className="it" style={{ fontSize: 21, lineHeight: 1.15 }}>"for every winter walk"</span>
          </div>
        </div>
        <p className="lp-p" style={{ color: '#DCE3FF' }}>Every gift comes with a note, public or private. All of it goes to the person celebrated.</p>
      </section>

      <section className="lp-step" style={{ background: '#ECECEF' }}>
        <p className="lp-lead">Watch it fill.</p>
        <h2 className="lp-h2">See who's celebrating <span className="it lp-h2i">you.</span></h2>
        <div className="lp-bars">
          {BARS.map((b) => (
            <div key={b.name} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}><span>{b.name}</span><span style={{ fontWeight: 500 }}>{b.label}</span></div>
              <div style={{ height: 12, borderRadius: 999, background: 'rgba(255,255,255,0.35)', overflow: 'hidden' }}>
                <div className="grow" style={{ width: `${b.pct}%`, background: b.color, animationDelay: b.d }} />
              </div>
            </div>
          ))}
        </div>
        <p className="lp-p">Everyone sees how much is covered, never the amounts.</p>
      </section>

      <section className="lp-thanks">
        <h2 className="lp-thanks-h">All covered?<br />Say thank uuuuuuuuuuuuuuuuuuuuuuuuuuu</h2>
        <svg aria-hidden="true" style={{ display: 'block', margin: '8px 0 0 auto' }} width="170" height="150" viewBox="0 0 100 90" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path className="draw" d="M14 16 L86 16 L86 62 L44 62 L26 80 L28 62 L14 62 Z M28 32 L72 32 M28 44 L60 44" /></svg>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.4, color: '#5A1A08' }}>One text to everyone who chipped in, with a photo if you want.</p>
      </section>

      <section aria-label="More ways to celebrate" style={{ background: '#000', padding: '26px 22px 24px' }}>
        <p className="serif" style={{ margin: 0, fontSize: 32, lineHeight: 1, color: '#D8F75A' }}>And there's <span style={{ fontStyle: 'italic' }}>more.</span></p>
      </section>

      <section className="lp-treats">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="wide lp-rule">Treats</span>
          <span className="wide lp-rule">Unlimited</span>
        </div>
        <div style={{ position: 'relative', height: 330, marginTop: 18 }}>
          <div aria-hidden="true" className="spinslow lp-diamond" />
          <p className="dot" style={{ position: 'absolute', left: 0, right: 0, top: 70, margin: 0, textAlign: 'center', fontSize: 46, lineHeight: 1 }}>LOX<br />BAGEL</p>
          <p className="dot tick" style={{ position: 'absolute', right: 6, top: 190, margin: 0, fontSize: 58 }}>×23</p>
          <div aria-hidden="true" style={{ position: 'absolute', left: 0, bottom: 6, display: 'flex', gap: 2 }}>
            {['a1', 'a2', 'a3'].map((c) => <svg key={c} className={c} width="30" height="34" viewBox="0 0 30 34"><path d="M0 0 L30 17 L0 34 Z" fill="#000" /></svg>)}
          </div>
          <span className="wide" style={{ position: 'absolute', right: 0, bottom: 8, fontSize: 26, letterSpacing: '0.02em' }}>$17</span>
        </div>
        <h2 style={{ margin: '18px 0 0', fontWeight: 400, fontSize: 30, lineHeight: 1.02, letterSpacing: '-0.02em' }}>Some things you can never have <span className="it" style={{ fontSize: 34 }}>enough</span> of.</h2>
        <p style={{ margin: '10px 0 0', fontSize: 16, lineHeight: 1.45 }}>Add your go-to coffee, a lox bagel, a $6 pastry, fresh flowers. Friends can treat you again and again, just because.</p>
      </section>

      <section className="lp-collab">
        <div style={{ borderBottom: '1.5px solid #E2452B', overflow: 'hidden', padding: '8px 0' }}>
          <div className="marqr lp-bandin" style={{ fontSize: 13, letterSpacing: '0.14em' }}>{COLLAB_BAND.map((b, i) => <span key={i}>{b}</span>)}</div>
        </div>
        <h2 className="tall lp-collab-h">Make it<br />together</h2>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 26 }}>
          <span className="lp-chip">You</span>
          <span className="lp-chip" style={{ marginLeft: -2 }}>Sara</span>
        </div>
        <div className="bob lp-bubble">
          <span style={{ display: 'block', fontSize: 12, color: '#6A6A6A', marginBottom: 4 }}>Text message · Sara</span>
          Sara invited you to make a list for Mom for Mother's Day 💐 Add what Mom would love: insidejoke.app/j/mom
        </div>
        <p style={{ margin: '22px 20px 0', fontWeight: 700, fontSize: 18, lineHeight: 1.3 }}>Build a list with your sister for Mom, or with the group chat for a bridal shower.</p>
      </section>

      <section className="lp-surprise">
        <div aria-hidden="true" className="lp-dotc" style={{ right: 22, top: 22 }} />
        <div aria-hidden="true" className="lp-dotc" style={{ left: 22, bottom: 22 }} />
        <h2 className="wide" style={{ margin: 0, color: '#fff', fontSize: 42, letterSpacing: '0.08em', lineHeight: 1 }}>Sur<br />prise!</h2>
        <div style={{ position: 'relative', height: 290, marginTop: 14 }}>
          <svg aria-hidden="true" className="breathe" style={{ position: 'absolute', right: -60, top: 0 }} width="270" height="270" viewBox="0 0 270 270">
            <defs>
              <pattern id="ht2" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="3" fill="#C8743A" /></pattern>
              <radialGradient id="f2" cx="40%" cy="40%" r="65%"><stop offset="0" stopColor="#000" /><stop offset="1" stopColor="#fff" /></radialGradient>
              <mask id="m2"><rect width="270" height="270" fill="url(#f2)" /></mask>
            </defs>
            <circle cx="135" cy="135" r="135" fill="#E7B48A" />
            <circle cx="135" cy="135" r="135" fill="url(#ht2)" mask="url(#m2)" />
          </svg>
          <svg aria-hidden="true" style={{ position: 'absolute', left: 168, top: 40 }} width="176" height="206" viewBox="0 0 120 140" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 128 C40 132 82 132 104 127" />
            <path d="M24 126 C23 112 24 100 26 88 C48 84 76 84 98 87 C100 100 100 113 99 126" />
            <path d="M30 86 C30 77 31 70 33 64 C50 60 72 60 90 63 C92 71 92 79 92 86" />
            <path d="M26 92 C34 98 40 92 46 98 C52 104 58 96 64 101 C70 106 78 97 84 102 C90 106 96 99 99 95" strokeWidth="2" />
            <path d="M33 70 C40 75 46 69 52 74 C58 79 64 71 70 76 C76 80 84 72 91 76" strokeWidth="2" />
            <path d="M34 108 L40 122 M46 108 L52 122 M58 108 L64 122 M70 108 L76 122 M82 108 L88 122" strokeWidth="1.8" />
            <path d="M46 60 L45 42 M61 59 L61 38 M76 60 L77 42" />
            <path d="M45 36 C41 31 44 26 45 22 C48 27 50 31 45 36 Z M61 32 C57 27 60 21 61 17 C64 22 66 27 61 32 Z M77 36 C73 31 76 26 77 22 C80 27 82 31 77 36 Z" strokeWidth="2" />
            <path d="M14 40 L20 46 M20 40 L14 46 M102 24 L106 34 M98 30 L110 28 M96 52 L100 56" strokeWidth="1.8" />
          </svg>
          <div style={{ position: 'absolute', left: 0, top: 30, display: 'flex', flexDirection: 'column', gap: 8, color: '#C8743A' }}>
            <span className="wide lp-fromto">From</span>
            <span style={{ fontWeight: 800, fontSize: 22, lineHeight: 1.1 }}>Sam, Priya,<br />Lina &amp; 5 more</span>
            <span className="wide lp-fromto" style={{ marginTop: 8 }}>To</span>
            <span style={{ fontWeight: 800, fontSize: 22 }}>Leila</span>
          </div>
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 16, lineHeight: 1.45 }}>Fund a list together in secret, then send one text: "Your friends have a surprise for you." They open it to gifts, notes, voice memos and a video.</p>
      </section>

      <section className="lp-close">
        <div aria-hidden="true" style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px' }}>
          <svg width="150" height="20" viewBox="0 0 150 20"><circle cx="10" cy="10" r="9" fill="#E8642C" /><path d="M10 10 L140 10" stroke="#3E7BE6" strokeWidth="1.5" /><circle cx="140" cy="10" r="9" fill="#E8642C" /></svg>
          <svg width="90" height="20" viewBox="0 0 90 20"><circle cx="5" cy="10" r="4" fill="#3E7BE6" /><path d="M5 10 L85 10" stroke="#3E7BE6" strokeWidth="1.5" /><circle cx="85" cy="10" r="4" fill="#3E7BE6" /></svg>
        </div>
        <div style={{ position: 'relative', height: 360 }}>
          <svg aria-hidden="true" className="spin" style={{ position: 'absolute', left: 15, top: 0 }} width="360" height="360" viewBox="0 0 360 360">
            <defs><path id="ring" d="M180 180 m-150 0 a150 150 0 1 1 300 0 a150 150 0 1 1 -300 0" /></defs>
            <text className="lp-ringtext"><textPath href="#ring">LET'S CELEBRATE YOU, AND LIFE · LET'S CELEBRATE YOU, AND LIFE ·</textPath></text>
          </svg>
          <Blob seed={19} color="#D8F75A" width={230} height={180} style={{ left: 80, top: 92 }} />
          <div style={{ position: 'absolute', left: 0, right: 0, top: 136, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 26, textAlign: 'center', lineHeight: 1.05, letterSpacing: '-0.02em' }}>Let's<br /><span className="it" style={{ fontSize: 30 }}>celebrate.</span></span>
            <Link href="/lists/new" className="lp-cta-blue">Make a list</Link>
          </div>
        </div>
        <div aria-hidden="true" style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 20px' }}>
          <svg width="90" height="40" viewBox="0 0 90 40"><path d="M25 2 L45 20 L25 38 L5 20 Z" fill="none" stroke="#3E7BE6" strokeWidth="2" /><path d="M45 2 L65 20 L45 38 L25 20 Z" fill="#3E7BE6" /><path d="M65 2 L85 20 L65 38 L45 20 Z" fill="none" stroke="#3E7BE6" strokeWidth="2" /></svg>
        </div>
      </section>

      <footer className="lp-foot">
        <span style={{ fontSize: 26 }}><span className="wide" style={{ fontSize: 22, textTransform: 'none' }}>inside</span><span className="dot" style={{ fontSize: 28, color: '#D4FA4F' }}>joke</span></span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, fontSize: 14 }}><Link href="/about">Company</Link><Link href="/privacy">Privacy policy</Link><Link href="/menu">Contact</Link></div>
      </footer>
    </main>
  );
}
