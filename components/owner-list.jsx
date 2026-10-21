import Link from 'next/link';
import Nav from '@/components/nav';
import { Blob, ItemSketch, Strip, Hl, Diamond, Halftone, treatInk, shortName } from '@/components/ui';
import { tileInk, storeLine } from '@/components/friend-list';
import { Avatar } from '@/components/ui';
import { unpinBlastAction } from '@/lib/actions-a4';

const ShareIcon = ({ c }) => <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v13" /><path d="M7 8l5-5 5 5" /><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></svg>;
const Pencil = ({ c = '#000000', s = 16 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20l4-1 11-11-3-3L5 16z" /><path d="M13 8l3 3" /></svg>;
const Plus = ({ s = 18 }) => <svg aria-hidden="true" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>;

// Title as on the boards: everything but the last word, then the last word in semibold on its own line.
export function SplitTitle({ title }) {
  const words = String(title || '').trim().split(/\s+/);
  if (words.length < 2) return <span style={{ fontWeight: 600 }}>{title}</span>;
  return <>{words.slice(0, -1).join(' ')}<br /><span style={{ fontWeight: 600 }}>{words[words.length - 1]}</span></>;
}

export default function OwnerList({ list, items, me, blast = null }) {
  const slug = list.slug;
  const wishes = items.filter((i) => !i.unlimited);
  const treats = items.filter((i) => i.unlimited);
  const covered = wishes.filter((i) => i.covered).length;
  const archived = list.status === 'archived';
  const vis = list.surprise ? 'Surprise' : list.visibility === 'private' ? 'Private' : 'Public';
  const long = (list.title || '').length > 22;
  const edit = (it) => `/l/${slug}/i/${it.id}/edit`;

  return (
    <main className="withnav" style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, paddingBottom: 0 }}>
      <section style={{ position: 'relative', background: archived ? '#8C8A86' : '#E8642C', color: '#FFFFFF', height: 320, overflow: 'hidden', flexShrink: 0 }}>
        <div aria-hidden="true" className="breathe" style={{ position: 'absolute', right: -70, bottom: -80, width: 260, height: 260, borderRadius: '50%', background: '#13286B' }} />
        <header style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 0 8px' }}>
          <Link href="/home" aria-label="Back to home" className="iconbtn"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></Link>
          <Link href={`/l/${slug}/share`} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44, padding: '0 18px', background: '#D4FA4F', color: '#13286B', textDecoration: 'none', fontWeight: 800, fontSize: 15, borderRadius: 999 }}><ShareIcon c="#13286B" />Share</Link>
        </header>
        <Blob seed={5} width={320} height={190} style={{ left: -24, top: 60 }} />
        <h1 className="serif" style={{ position: 'relative', margin: '38px 0 0', padding: '0 20px', paddingRight: 60, color: '#000000', fontWeight: 400, fontSize: long ? 40 : 50, lineHeight: 0.92 }}><SplitTitle title={list.title} /></h1>
        <p style={{ position: 'relative', margin: '18px 0 0', padding: '0 20px', fontWeight: 800, fontSize: 14, color: '#13286B' }}>
          {archived ? 'Archived · friends can no longer see it' : <>{vis} · <span className="dot" style={{ fontSize: 15 }}>{items.length}</span> {items.length === 1 ? 'thing' : 'things'} · <span className="dot" style={{ fontSize: 15 }}>{covered}</span> covered</>}
        </p>
        <p style={{ position: 'relative', margin: '10px 0 0', padding: '0 20px', fontSize: 14, lineHeight: 1.9 }}><Hl>Friends see progress, never amounts.</Hl></p>
      </section>

      {blast ? (
        <section aria-label="Pinned text blast" style={{ margin: '16px 20px 0', background: '#13286B', color: '#FFFFFF', padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Avatar user={blast} size={36} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexGrow: 1, minWidth: 0 }}>
            <span className="wide" style={{ fontSize: 10, letterSpacing: '0.18em', color: '#D8F75A' }}>Pinned · from {blast.name || 'the team'}</span>
            <span className="it" style={{ fontSize: 19, lineHeight: 1.25 }}>{blast.body}</span>
          </div>
          <form action={unpinBlastAction}><input type="hidden" name="slug" value={slug} /><input type="hidden" name="blastId" value={blast.id} /><button aria-label="Unpin" className="iconbtn" style={{ color: '#FFFFFF' }}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg></button></form>
        </section>
      ) : null}
      <Strip text="ON THE LIST" />

      <section style={{ padding: '22px 20px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8 }}>
          <h2 className="wide" style={{ margin: 0, fontSize: 12, letterSpacing: '0.18em' }}>Wishes</h2>
          <span style={{ fontSize: 13, color: '#4A4A4A' }}>{wishes.length ? 'Tap one to edit' : 'The exact thing, down to the shade'}</span>
        </div>
        {wishes.map((it) => {
          const ink = tileInk(it.color);
          return (
            <Link key={it.id} href={edit(it)} aria-label={`Edit ${it.name}`} style={{ textDecoration: 'none', display: 'flex', gap: 14, alignItems: 'stretch', padding: '14px 0', borderTop: '1.5px solid #000000', color: '#000' }}>
              <div style={{ position: 'relative', width: 84, height: 84, flexShrink: 0, background: it.color, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {it.photo ? <Halftone src={it.photo} ink={ink === '#FFFFFF' ? '#13286B' : ink} size={84} /> : <ItemSketch name={it.name} size={66} ink={ink} />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexGrow: 1, minWidth: 0 }}>
                <span style={{ fontSize: 17, lineHeight: 1.15, letterSpacing: '-0.015em' }}>{it.name}</span>
                <span style={{ fontSize: 13, color: '#4A4A4A' }}>{storeLine(it, 'your photo')}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto' }}>
                  <div style={{ flexGrow: 1, height: 8, borderRadius: 999, background: '#D7D7DC', overflow: 'hidden' }}><div className="grow" style={{ width: `${it.pct}%`, height: '100%', borderRadius: 999, background: it.covered ? '#2E9B47' : '#13286B' }} /></div>
                  <span className="dot" style={{ flexShrink: 0, fontSize: 15 }}>{it.covered ? 'COVERED' : `${it.pct}%`}</span>
                </div>
              </div>
              <span aria-hidden="true" style={{ alignSelf: 'center', flexShrink: 0, width: 36, height: 36, border: '1.5px solid #000000', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pencil /></span>
            </Link>
          );
        })}
        <Link href={`/l/${slug}/add`} style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', padding: '14px 0', borderTop: '1.5px solid #000000', borderBottom: '1.5px solid #000000', color: '#000' }}>
          <span style={{ width: 84, height: 48, flexShrink: 0, border: '1.5px dashed #000000', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus /></span>
          <span style={{ fontWeight: 800, fontSize: 15 }}>Add a wish</span>
        </Link>
      </section>

      <section style={{ padding: '32px 0 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px' }}>
          <h2 className="wide" style={{ margin: 0, fontSize: 12, letterSpacing: '0.18em' }}>Treats</h2>
          <span style={{ fontSize: 13, color: '#4A4A4A' }}>{treats.length ? 'Unlimited · tap to edit' : 'Unlimited · given again and again'}</span>
        </div>
        <div className="a2-nostrip" style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 20px 4px', scrollbarWidth: 'none' }}>
          {treats.map((t) => {
            const [fg, accent] = treatInk(t.color);
            return (
              <Link key={t.id} href={edit(t)} aria-label={`Edit ${t.name}`} style={{ position: 'relative', flex: '0 0 150px', height: 190, textDecoration: 'none', background: t.color, color: fg, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 12, boxSizing: 'border-box' }}>
                <Diamond accent={accent} top={50} />
                <span style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}><span style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.store || 'Anywhere'}</span><span aria-hidden="true" style={{ width: 28, height: 28, flexShrink: 0, border: `1.5px solid ${fg}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pencil c={fg} s={13} /></span></span>
                <span className="dot" style={{ position: 'relative', alignSelf: 'center', textAlign: 'center', fontSize: 26, lineHeight: 0.95, whiteSpace: 'pre-line' }}>{shortName(t.name)}</span>
                <span style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span style={{ fontSize: 12, fontWeight: 700 }}>given</span><span className="dot" style={{ fontSize: 22 }}>×{t.timesTreated}</span></span>
              </Link>
            );
          })}
          <Link href={`/l/${slug}/add?treat=1`} style={{ flex: '0 0 110px', height: 190, textDecoration: 'none', border: '1.5px dashed #000000', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 800, fontSize: 13, textAlign: 'center', padding: 10, color: '#000' }}><Plus s={20} />Add a treat</Link>
        </div>
      </section>

      <section style={{ margin: '32px 20px 0', borderTop: '1.5px solid #000000', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p className="serif" style={{ margin: 0, fontSize: 20, lineHeight: 1.3 }}>One link opens it anywhere: texts, group chats, <span style={{ fontStyle: 'italic' }}>anyone</span> you want.</p>
        <Link href={`/l/${slug}/share`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, textDecoration: 'none', background: '#000000', color: '#FFFFFF', fontWeight: 800, fontSize: 16, height: 54, borderRadius: 999 }}><ShareIcon c="#FFFFFF" />Share my list</Link>
        <Link href={`/l/${slug}/manage`} style={{ alignSelf: 'center', fontSize: 14, fontWeight: 700, color: '#000000', padding: '8px 0' }}>List settings</Link>
      </section>

      <div style={{ height: 24 }} />
      <Nav me={me} active="home" addHref={`/l/${slug}/add`} />
    </main>
  );
}
