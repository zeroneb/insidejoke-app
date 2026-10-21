import Link from 'next/link';
import { Blob, Avatar, Bar, ItemSketch } from '@/components/ui';
import { label, money } from '@/lib/lists';

function firstName(u) {
  return ((u?.name || 'a friend').trim().split(/\s+/)[0]) || 'a friend';
}

function shortName(name) {
  const words = (name || '').split(/\s+/).filter(Boolean).slice(0, 2);
  return words.join('\n').toUpperCase();
}

export default function FriendList({ list, owner, items, me }) {
  const name = firstName(owner);
  const forName = list.for_who === 'other' && list.recipient_name ? list.recipient_name : name;
  const treats = items.filter((i) => i.unlimited);
  const wishes = items.filter((i) => !i.unlimited);
  const covered = wishes.filter((i) => i.covered).length;
  const ring = `${forName.toLowerCase()}'s list · things ${forName.toLowerCase()} would actually loveeee · `;

  return (
    <div className="fl">
      <section className="fl-hero">
        <header className="hdr" style={{ zIndex: 3 }}>
          <Link href={me ? '/home' : '/'} aria-label="Back" className="iconbtn">
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg>
          </Link>
          <Link href={`/l/${list.slug}/share`} aria-label="Share list" className="iconbtn">
            <svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v13" /><path d="M7 8l5-5 5 5" /><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></svg>
          </Link>
        </header>
        <Blob seed={5} color="#D8F75A" style={{ left: 10, top: 56 }} width={370} height={290} />
        <svg aria-hidden="true" className="slow fl-ring" width="270" height="270" viewBox="0 0 270 270">
          <defs><path id="fl-arc" d="M135 135 m-112 0 a112 112 0 1 1 224 0 a112 112 0 1 1 -224 0" /></defs>
          <text className="serif" style={{ fontSize: 15, fill: '#13286B' }}><textPath href="#fl-arc">{ring}{ring}</textPath></text>
        </svg>
        <h1 className="serif fl-title">{list.title}</h1>
        <div className="fl-foot">
          <span className="fl-owner"><Avatar user={owner} size={30} owner /> {owner?.name || 'A friend'}</span>
          <span className="dot" style={{ fontSize: 14 }}>{items.length} {items.length === 1 ? 'THING' : 'THINGS'} · {covered} COVERED</span>
        </div>
      </section>

      {treats.length ? (
        <section className="fl-treats">
          <div className="fl-sechead">
            <h2 className="wide seclbl" style={{ fontSize: 17, letterSpacing: '0.12em' }}>Treats</h2>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Unlimited · treat anytime</span>
          </div>
          <div className="fl-strip">
            {treats.map((t) => (
              <Link key={t.id} href={`/l/${list.slug}/i/${t.id}`} className="fl-treat" style={{ background: t.color, color: tileInk(t.color) }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{t.store || 'Anywhere'}</span>
                <span className="dot fl-treatname">{shortName(t.name)}</span>
                <span className="fl-treatfoot">
                  <span className="fl-treatrow"><span className="wide" style={{ fontSize: 15 }}>{money(t.price_cents)}</span><span className="dot" style={{ fontSize: 18 }}>×{t.timesTreated}</span></span>
                  <span className="fl-treatbtn" style={{ background: tileInk(t.color), color: t.color }}>Send a treat</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="fl-wishes">
        <div className="fl-sechead" style={{ padding: '0 0 8px' }}>
          <h2 className="wide seclbl" style={{ fontSize: 17, letterSpacing: '0.12em' }}>Wishes</h2>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Get it or contribute</span>
        </div>
        {wishes.length === 0 ? (
          <p className="muted" style={{ margin: 0, padding: '16px 0', borderTop: '1.5px solid #000', fontSize: 14 }}>Nothing here yet.</p>
        ) : wishes.map((it) => (
          <Link key={it.id} href={`/l/${list.slug}/i/${it.id}`} className="row" style={{ alignItems: 'stretch' }}>
            <div className="fl-tile" style={{ background: it.color }}>
              {it.photo ? <img src={it.photo} alt="" className="fl-photo" /> : <ItemSketch name={it.name} size={72} ink={tileInk(it.color)} />}
            </div>
            <div className="fl-wish">
              <span style={{ fontSize: 17, lineHeight: 1.15, letterSpacing: '-0.015em' }}>{it.name}{it.quantity > 1 ? <span className="dot" style={{ fontSize: 15, marginLeft: 6 }}>×{it.quantity}</span> : null}</span>
              <span style={{ fontSize: 13 }}>{[it.store, it.url ? hostOf(it.url) : null].filter(Boolean).join(' · ') || (it.photo ? `${forName}'s photo` : ' ')}</span>
              <div className="fl-barrow">
                <Bar pct={it.pct} />
                <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 500 }}>{label(it)}</span>
              </div>
            </div>
          </Link>
        ))}
        <div style={{ borderTop: '1.5px solid #000' }} />
      </section>

      <div className="fl-footer">
        <p className="serif" style={{ margin: 0, fontSize: 19, lineHeight: 1.3 }}>Tap anything to get it for {forName} or chip in. 100% goes to {forName}, who sees your note, never the amount.</p>
      </div>
    </div>
  );
}

export function tileInk(bg) {
  const dark = ['#13286B', '#E8642C', '#B36EE0', '#C8743A', '#5FC3D9', '#807F48'];
  return dark.includes(bg) ? '#FFFFFF' : '#13286B';
}

export function hostOf(url) {
  try { return new URL(url.startsWith('http') ? url : 'https://' + url).hostname.replace(/^www\./, ''); } catch { return url; }
}
