import Link from 'next/link';
import { coverGround } from '@/lib/cover-designs';
import { coverFor, listKind } from '@/lib/cover';
import { CoverArt } from '@/components/cover-art';
import { parse as parseDesign } from '@/lib/cover-designs';
import { ListCover } from '@/components/cover-picker';
import { ChangeCover } from '@/components/cover-photo';
import { Blob, Avatar, shortNoun, Halftone } from '@/components/ui';
import ListProgress from '@/components/list-progress';
import { tileInk, hostOf } from '@/components/friend-list';
import { unpinBlastAction } from '@/lib/actions-a4';
import { dismissNudge } from '@/lib/actions';
import { setListArchived } from '@/lib/actions-a2';

// Title as on the boards: everything but the last word, then the last word in semibold on its own line.
// List cover title: everything but the last word in tight sans, the last word in wide caps.
// The caps shrink for long words so they stay on the cover.
const CAPS_W = 0.86; // Archivo wide 800, width per letter in em
export function TitleWords({ title, size = 50, width = 300 }) {
  const words = String(title || '').trim().split(/\s+/).filter(Boolean);
  const last = words.pop() || '';
  const capSize = Math.max(22, Math.min(Math.round(size * 0.8), Math.floor(width / (Math.max(1, last.length) * CAPS_W))));
  return (
    <>
      {words.length ? <span style={{ display: 'block', fontFamily: "'Inter Tight', sans-serif", fontWeight: 400, fontSize: size * 1.08, letterSpacing: '-0.045em', lineHeight: 0.95 }}>{words.join(' ')}</span> : null}
      <span className="wide" style={{ display: 'block', fontSize: capSize, letterSpacing: '0.01em', lineHeight: 1, marginTop: words.length ? 4 : 0 }}>{last}</span>
    </>
  );
}
export function SplitTitle({ title }) { return <TitleWords title={title} />; }

// r2: Doto tag on the 54px tile ("VASE", "BOOTS", "SANTAL").
export function tileTag(name) {
  return shortNoun(name).replace(/[^a-z-]/gi, '').slice(0, 7).toUpperCase() || 'GIFT';
}

// r2: one row as on the Option 10 MyList / Manage boards.
export function ItemRow({ it, sub, href, right, children, border = true }) {
  const tag = tileTag(it.name);
  const inner = (
    <>
      <span style={{ position: 'relative', width: 54, height: 54, flexShrink: 0, background: it.color, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>{it.photo ? <Halftone src={it.photo} /> : null}<span className="dot" style={{ fontSize: tag.length > 6 ? 11 : 13, color: tileInk(it.color), textAlign: 'center', lineHeight: 1 }}>{tag}</span></span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flexGrow: 1, minWidth: 0 }}><span style={{ fontWeight: 800, fontSize: 15 }}>{it.name}</span><span style={{ fontSize: 12 }}>{sub}</span></span>
      <span className="dot" style={{ fontSize: 16, flexShrink: 0 }}>{it.unlimited ? `×${it.timesTreated}` : it.covered ? 'DONE' : `${it.pct}%`}</span>
    </>
  );
  const row = { display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', textDecoration: 'none', color: 'var(--ink, #000000)' };
  return (
    <div style={{ position: 'relative', borderTop: border ? '1.5px solid var(--line, #000000)' : 0 }}>
      {href ? <Link href={href} style={row}>{inner}{right}</Link> : <div style={row}>{inner}{right}</div>}
      {children}
    </div>
  );
}

function rowSub(it) {
  if (it.unlimited) return ['Unlimited', it.store].filter(Boolean).join(' · ');
  const from = it.store || (it.url ? hostOf(it.url) : null) || (it.photo ? 'your photo, no link' : null);
  return [`×${it.quantity}`, from].filter(Boolean).join(' · ');
}

// The list cover for lists without a picked design (colors from lib/cover), shared by the list page and Manage.
// .bleed-top: on phones it runs up behind the status bar (a safe-area-tall top border painted in the cover color).
export function LegacyCover({ list, items, archived, status, left, right, children }) {
  const cv = coverFor(list, listKind(list, items));
  const bg = archived ? '#8C8A86' : cv.bg;
  const long = (list.title || '').length > 22;
  const who = list.for_who === 'other' && list.recipient_name ? list.recipient_name.toLowerCase() : null;
  const ringText = list.ring_text ? `${list.ring_text.trim()} · ` : who ? `${who}'s list · things ${who} would actually loveeee · ` : `your list · things you would actually loveeee · `;
  return (
    <section className="bleed-top" style={{ position: 'relative', background: bg, color: cv.chrome, height: 'calc(300px + var(--sat, 0px))', overflow: 'hidden', flexShrink: 0 }}>
      <CoverArt cv={cv} />
      <header style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 0 8px' }}>
        {left}
        {right}
      </header>
      <svg aria-hidden="true" className="slow" style={{ position: 'absolute', right: -90, bottom: -100, zIndex: 0 }} width="300" height="300" viewBox="0 0 300 300">
        <defs><path id="ol-arc" d="M150 150 m-142 0 a142 142 0 1 1 284 0 a142 142 0 1 1 -284 0" /></defs>
        <text style={{ fontFamily: "'EB Garamond', serif", fontSize: 16, fill: cv.text }}><textPath href="#ol-arc">{ringText.repeat(ringText.length < 34 ? 4 : 2)}</textPath></text>
      </svg>
      <Blob seed={5 + (cv.k % 4) * 22} color={cv.blob} width={320} height={190} style={{ left: -24, top: 64 }} />
      <h1 style={{ position: 'relative', margin: '40px 0 0', padding: '0 60px 0 20px', color: cv.title, fontWeight: 400, lineHeight: 0.92 }}><TitleWords title={list.title} size={long ? 40 : 50} /></h1>
      <p style={{ position: 'relative', margin: '16px 0 0', padding: '0 20px', color: archived ? 'var(--inv-fg, #FFFFFF)' : cv.title, fontWeight: 800, fontSize: 14 }}>{status}</p>
      {children}
    </section>
  );
}

export default function OwnerList({ list, items, me, blast = null, team = [] }) {
  // Names on covers that show the team (Bouquet): you first, then everyone making it with you.
  const people = ['You', ...team.filter((u) => u.id !== me?.id && u.role !== 'viewer').map((u) => String(u.name || '').trim().split(/\s+/)[0] || 'A friend')];
  const slug = list.slug;
  const archived = list.status === 'archived';
  const vis = list.surprise ? 'Surprise' : list.visibility === 'private' ? 'Private' : 'Public';
  const hasTreat = items.some((i) => i.unlimited);
  const showNudge = !archived && !hasTreat && !list.nudge_dismissed && items.length > 0;
  const cv = coverFor(list, listKind(list, items));
  const design = parseDesign(list.design);
  const status = archived ? 'Archived · friends can no longer see it' : `${vis} · ${items.length} ${items.length === 1 ? 'thing' : 'things'} so far`;

  return (
    <main style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      {design ? (
        <>
          <header className="bleed-top" style={{ ...coverGround(design), display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 8px 8px' }}>
            <Link href="/home" aria-label="Back" className="iconbtn"><svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="1.73" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></Link>
            <Link href={`/l/${slug}/share`} style={{ border: '2px solid var(--edge, #000000)', color: 'var(--ink, #000000)', textDecoration: 'none', fontWeight: 800, fontSize: 13, padding: '9px 14px', borderRadius: 999 }}>Share</Link>
          </header>
          <div style={archived ? { filter: 'grayscale(1)', opacity: 0.7 } : undefined}>
            <ListCover slug={slug} design={design} title={list.title} treat={design.key === 'treat'} ctx={{ visibility: list.visibility, recipient: list.recipient_name || null, people, photo: list.photo || null, handle: me?.handle || null }} />
          </div>
          <p style={{ margin: '14px 0 0', padding: '0 20px', fontWeight: 800, fontSize: 14 }}>{status}</p>
          {archived ? <form action={setListArchived} style={{ margin: '10px 0 0', padding: '0 20px' }}><input type="hidden" name="slug" value={slug} /><input type="hidden" name="archive" value="0" /><button style={{ height: 40, padding: '0 16px', border: '2px solid var(--edge, #000000)', borderRadius: 999, background: 'var(--surface, #FFFFFF)', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, cursor: 'pointer', color: 'var(--ink, #000)' }}>Unarchive</button></form> : null}
        </>
      ) : (
        <LegacyCover list={list} items={items} archived={archived} status={status}
          left={<Link href="/home" aria-label="Back" className="iconbtn"><svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={cv.icon || cv.chrome} strokeWidth="1.73" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></Link>}
          right={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ChangeCover slug={slug} hasPhoto={!!list.photo} color={cv.icon || cv.chrome} />
            <Link href={`/l/${slug}/share`} style={{ border: `2px solid ${cv.chrome}`, color: cv.chrome, textDecoration: 'none', fontWeight: 800, fontSize: 13, padding: '9px 14px', borderRadius: 999 }}>Share</Link>
          </span>}>
          {archived ? <form action={setListArchived} style={{ position: 'relative', margin: '10px 0 0', padding: '0 20px' }}><input type="hidden" name="slug" value={slug} /><input type="hidden" name="archive" value="0" /><button style={{ height: 40, padding: '0 16px', border: '2px solid var(--edge, #000000)', borderRadius: 999, background: 'var(--surface, #FFFFFF)', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, cursor: 'pointer', color: 'var(--ink, #000)' }}>Unarchive</button></form> : null}
        </LegacyCover>
      )}

      {blast ? (
        <section aria-label="Pinned text blast" style={{ margin: '16px 20px 0', background: 'var(--dk, #13286B)', color: 'var(--inv-fg, #FFFFFF)', padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Avatar user={blast} size={36} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexGrow: 1, minWidth: 0 }}>
            <span className="wide" style={{ fontSize: 10, letterSpacing: '0.18em', color: '#D8F75A' }}>Pinned · from {blast.name || 'the team'}</span>
            <span style={{ fontSize: 17, lineHeight: 1.3 }}>{blast.body}</span>
          </div>
          <form action={unpinBlastAction}><input type="hidden" name="slug" value={slug} /><input type="hidden" name="blastId" value={blast.id} /><button aria-label="Unpin" className="iconbtn"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--inv-fg, #FFFFFF)" strokeWidth="1.82" strokeLinecap="round"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg></button></form>
        </section>
      ) : null}

      <ListProgress items={items} />
      <section style={{ padding: '14px 20px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 6 }}>
          <h2 className="wide" style={{ margin: 0, fontSize: 16, letterSpacing: '0.12em' }}>On the list</h2>
          <Link href={`/l/${slug}/add`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 14, textDecoration: 'none', padding: '10px 0', color: 'var(--ink, #000000)' }}><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="2.07" strokeLinecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>Add</Link>
        </div>
        <div style={{ borderBottom: '1.5px solid var(--line, #000000)' }}>
          {items.map((it) => <ItemRow key={it.id} it={it} sub={rowSub(it)} href={`/l/${slug}/i/${it.id}`} />)}
          {!items.length ? <Link href={`/l/${slug}/add`} style={{ display: 'block', padding: '18px 0', borderTop: '1.5px solid var(--line, #000000)', fontSize: 14, color: 'var(--ink, #000000)' }}>Nothing on it yet. Add the first thing.</Link> : null}
        </div>
      </section>

      {showNudge ? (
        <section className="pop" style={{ margin: '26px 16px 0', background: 'var(--lt, #96E084)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: 210, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg className="draw-g" role="img" aria-label="Hand-drawn bagel" width="220" height="190" viewBox="0 0 220 190" fill="none" stroke="var(--inv-fg, #FFFFFF)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <defs><filter id="r2wob" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="5" /><feDisplacementMap in="SourceGraphic" scale="4" /></filter></defs>
              <g filter="url(#r2wob)">
                <path d="M30 112 C26 72 70 48 112 50 C158 52 196 78 190 114 C184 148 140 162 104 160 C62 158 34 144 30 112 Z" />
                <path d="M24 108 C28 70 74 44 118 46" />
                <path d="M84 104 C86 92 102 86 114 88 C128 90 136 98 132 108 C128 118 112 122 100 120 C90 118 82 112 84 104 Z" />
                <path d="M38 132 C70 150 142 152 182 128" />
                <path d="M52 84 L60 78 M70 70 L78 66 M150 68 L158 72 M170 84 L176 90 M60 136 L66 142 M150 140 L156 134" />
                <path d="M48 104 L64 90 M46 118 L72 94 M150 96 L170 112 M146 112 L166 128" />
              </g>
            </svg>
          </div>
          <div style={{ background: 'var(--surface, #FFFFFF)', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 24, lineHeight: 1.05, letterSpacing: '-0.02em' }}>Some things you never get <span className="serif" style={{ fontStyle: 'italic' }}>tired of.</span></span>
            <span style={{ fontSize: 15, lineHeight: 1.4 }}>Make one unlimited and friends can give it again and again.</span>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <Link href={`/l/${slug}/add?treat=1`} style={{ flex: '1 1 0', textAlign: 'center', textDecoration: 'none', background: 'var(--inv-bg, #000000)', color: 'var(--inv-fg, #FFFFFF)', fontWeight: 700, fontSize: 15, padding: '14px 0', borderRadius: 999 }}>Add an unlimited item</Link>
              <form action={dismissNudge} style={{ display: 'flex' }}>
                <input type="hidden" name="slug" value={slug} />
                <button style={{ flexShrink: 0, border: '1.5px solid var(--edge, #000000)', background: 'transparent', fontFamily: 'inherit', fontSize: 15, padding: '0 18px', borderRadius: 999, cursor: 'pointer', color: 'var(--ink, #000000)' }}>Not now</button>
              </form>
            </div>
          </div>
        </section>
      ) : !hasTreat && list.nudge_dismissed ? (
        <p style={{ margin: '22px 20px 0', fontSize: 13, color: 'var(--muted, #4A4A4A)' }}>You can make any item unlimited from Add, anytime.</p>
      ) : null}

      <Link href={`/l/${slug}/manage`} style={{ alignSelf: 'flex-start', margin: '18px 20px 0', fontSize: 13, fontWeight: 700, color: 'var(--ink, #000000)', padding: '10px 0' }}>Manage this list</Link>
      <div style={{ height: 40 }} />
    </main>
  );
}
