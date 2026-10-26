import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar, ItemSketch } from '@/components/ui';
import { tileInk, hostOf, firstName } from '@/components/friend-list';
import { listBySlug, itemById, owner as ownerOf, notesFor, money, ensureItemPhoto, commentsFor } from '@/lib/lists';
import { currentUser } from '@/lib/auth';
import { get, all } from '@/lib/db';
import { toggleLike } from '@/lib/actions-a2';
import { ago } from '@/lib/time';


const DARK = ['#13286B', '#B36EE0', '#C8743A', '#807F48', '#E2452B'];
// Eyebrow ink: a deep shade of the hero color, like the boards' #5A2A10 on orange.
// r2: the dial's boiling blob, ported from the Option 10 Item board (120 points, wob/rough 0.06).
function dialBlob(shape, jitter, wob = 0.06, rough = 0.06) {
  let s = shape; const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const a1 = r() * 6.28, a2 = r() * 6.28, a3 = r() * 6.28;
  let j = jitter; const q = () => { j = (j * 7919 + 104729) % 233280; return j / 233280; };
  const pts = [];
  for (let i = 0; i < 120; i++) {
    const t = i / 120 * 6.2832;
    const k = 1 + wob * Math.sin(2 * t + a1) + wob * 0.6 * Math.sin(3 * t + a2) + wob * 0.3 * Math.sin(5 * t + a3) + (q() - 0.5) * rough;
    pts.push((100 + k * 88 * Math.cos(t)).toFixed(1) + ' ' + (100 + k * 88 * Math.sin(t)).toFixed(1));
  }
  return 'M' + pts.join(' L') + ' Z';
}

// r2: "For Maya" ink per hero color (Option 10 Item / ItemQty boards).
const FOR_INK = { '#F0895A': '#2DBE4A', '#E8642C': '#D8F75A', '#A9CDF5': '#13286B', '#F4D3EE': '#E2452B', '#96E084': '#13286B', '#93EC75': '#13286B', '#E3C552': '#13286B', '#5FC3D9': '#13286B' };
const EYEBROW = { '#E8642C': '#5A2A10', '#F0895A': '#5A2A10', '#F4D3EE': '#8A2A1A', '#A9CDF5': '#13286B', '#96E084': '#1E4A12', '#E3C552': '#5A4410', '#5FC3D9': '#0E3A48', '#D8F75A': '#13286B' };

// Shared by the item page and the laptop side panel (/l/<slug>?item=<id>).
export default async function ItemView({ slug, itemId }) {
  const list = await listBySlug(slug);
  if (!list) notFound();
  const it = await ensureItemPhoto(await itemById(itemId, { includeRemoved: true }));
  if (!it || it.list_id !== list.id) notFound();
  const owner = await ownerOf(list);
  const me = await currentUser();
  if (!(await (await import('@/lib/access')).canSeeList(list, me))) notFound();
  // Archived or removed wishes: still viewable by the list's own people (their gifts and notes live here), nobody else.
  if (it.removed && !(me && (me.id === list.owner_id || (await (await import('@/lib/collab')).isMember(list.id, me.id))))) notFound();
  const isOwner = !!(me && me.id === owner.id);
  const forName = list.for_who === 'other' && list.recipient_name ? list.recipient_name : firstName(owner);
  const notes = (await notesFor(it.id, isOwner));
  const replies = await commentsFor(notes.map((n) => n.id));
  const privateCount = (await get("SELECT COUNT(*) AS n FROM contributions WHERE item_id = ? AND visibility = 'private'", it.id)).n;
  const liked = me ? new Set((await all('SELECT r.contribution_id FROM reactions r JOIN contributions c ON c.id = r.contribution_id WHERE c.item_id = ? AND r.user_id = ?', it.id, me.id)).map((r) => r.contribution_id)) : new Set();

  const dark = DARK.includes(it.color);
  const hdrInk = dark ? '#FFFFFF' : '#000000';
  const sketchInk = it.color === '#F4D3EE' ? '#E2452B' : it.color === '#D8F75A' || it.color === '#D4FA4F' ? '#13286B' : '#FFFFFF';
  const forInk = FOR_INK[it.color] || (dark ? '#D8F75A' : '#13286B');
  const store = it.store || (it.url ? hostOf(it.url) : '');
  const eyebrow = it.photo ? (it.url ? `Photo from ${store}` : `${forName}'s photo`) : store ? `From ${store}` : 'On the list';
  const spec = [it.quantity > 1 ? `A set of ${it.quantity}` : null, it.unlimited ? 'Unlimited' : null, store || null, it.quantity > 1 || it.unlimited ? `${money(it.price_cents)} each` : money(it.price_cents)].filter(Boolean).join(' · ') + (it.orig_currency && it.orig_price_cents ? ` (${new Intl.NumberFormat('en-US', { style: 'currency', currency: it.orig_currency }).format(it.orig_price_cents / 100)} at the store)` : '');
  const headline = it.unlimited ? ['Given', 'again and again'] : it.covered ? ['All', 'covered'] : it.pct >= 75 ? ['Almost', 'there'] : it.pct >= 50 ? ['More than', 'halfway'] : it.pct > 0 ? ['On its', 'way'] : ['Up for', 'grabs'];
  const lead = it.covered ? 'All covered.' : it.pct >= 75 ? 'Almost there.' : it.pct >= 50 ? 'More than halfway.' : it.pct > 0 ? 'Off to a good start.' : 'Up for grabs.';
  const fr = (n) => `${n} ${n === 1 ? 'friend' : 'friends'}`;
  const giversLine = it.unlimited
    ? `${fr(it.givers)} ${it.givers === 1 ? 'has' : 'have'} sent one. Amounts stay private.`
    : it.givers ? `${fr(it.givers)} ${it.givers === 1 ? 'has' : 'have'} contributed. Amounts stay private.` : 'Nobody has contributed yet. Get it, or start it off.';
  const give = `/l/${slug}/i/${it.id}/give`;
  const back = `/l/${slug}`;
  const verb = it.unlimited ? 'sent one' : 'contributed';
  const dialPct = it.unlimited ? 100 : it.pct;
  const C = 2 * Math.PI * 58;
  const [ba, bb, bc] = [dialBlob(6, 3), dialBlob(6, 19), dialBlob(6, 43)];
  const btn = { flex: '1 1 0', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', fontSize: 16, fontWeight: 700, height: 54, borderRadius: 999, boxSizing: 'border-box' };

  return (
    <main style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <section className="bleed-top" style={{ position: 'relative', background: it.color, height: 'calc(380px + var(--sat, 0px))', overflow: 'hidden', flexShrink: 0 }}>
        <header style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 0 8px' }}>
          <Link href={back} aria-label={isOwner ? 'Back to my list' : `Back to ${forName}'s list`} className="iconbtn"><svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={hdrInk} strokeWidth="1.56" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></Link>
          {isOwner ? (
            <Link href={`/l/${slug}/i/${it.id}/edit`} aria-label={`Edit ${it.name}`} className="iconbtn"><svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={hdrInk} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20l4-1 11-11-3-3L5 16z" /><path d="M13 8l3 3" /></svg></Link>
          ) : me && list.visibility !== 'private' ? (
            <Link href={`/l/${slug}/share`} aria-label="Share item" className="iconbtn"><svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={hdrInk} strokeWidth="1.53" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v13" /><path d="M7 8l5-5 5 5" /><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></svg></Link>
          ) : <span style={{ width: 44 }} />}
        </header>
        <span style={{ position: 'absolute', left: 14, top: 64, fontWeight: 500, fontSize: 12, color: dark ? 'var(--inv-fg, #FFFFFF)' : EYEBROW[it.color] || 'var(--ink, #000000)', zIndex: 1 }}>{eyebrow}</span>
        {it.photo ? (
          <div className="bob" style={{ position: 'absolute', left: '50%', top: 84, marginLeft: -120, width: 240, height: 240, background: 'var(--surface, #FFFFFF)', boxShadow: '0 10px 30px rgba(0,0,0,.18)' }}><img src={it.photo} alt={it.name} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 10, boxSizing: 'border-box', display: 'block' }} /></div>
        ) : (
          <div className="bob" style={{ position: 'absolute', left: '50%', top: 70, marginLeft: -130, width: 260, height: 260, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ItemSketch name={it.name} size={260} ink={sketchInk} unlimited={it.unlimited} strokeWidth={1.5} />
          </div>
        )}
        <span style={{ position: 'absolute', zIndex: 1, right: 14, bottom: 14, fontWeight: 700, fontSize: 30, letterSpacing: '-0.05em', color: forInk }}>For {isOwner ? 'you' : forName}</span>
      </section>

      <section style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h1 style={{ margin: 0, fontWeight: 400, fontSize: 32, lineHeight: 1.02, letterSpacing: '-0.035em' }}>{it.name}{it.quantity > 1 ? <> <span className="dot" style={{ fontSize: 30 }}>×{it.quantity}</span></> : null}</h1>
        <span style={{ fontWeight: 500, fontSize: 13 }}>{spec}</span>
        <div aria-label="Give" style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!it.unlimited ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ flexGrow: 1, height: 10, borderRadius: 999, background: 'var(--surface2, #D7D7DC)', overflow: 'hidden' }}><div className="grow" style={{ width: `${it.pct}%`, height: '100%', borderRadius: 999, background: it.covered ? 'var(--lt, #2E9B47)' : 'var(--dk, #5546A0)' }} /></div><span className="dot" style={{ fontSize: 16 }}>{it.pct}%</span></div>
              <span style={{ fontSize: 14, color: 'var(--sub, #3A3A3A)' }}><b style={{ color: 'var(--ink, #000000)' }}>{lead}</b> {it.covered ? 'Thank you, everyone.' : it.givers ? `${fr(it.givers)} ${it.givers === 1 ? 'is' : 'are'} in.${isOwner ? '' : ' Join them.'}` : 'Be the first to give.'}</span>
            </>
          ) : (
            <span style={{ fontSize: 14, color: 'var(--sub, #3A3A3A)' }}><b style={{ color: 'var(--ink, #000000)' }}>Given ×{it.timesTreated}.</b> {isOwner ? 'Friends can send it again and again.' : 'Send one anytime, again and again.'}</span>
          )}
          {it.removed ? (
            <span style={{ fontSize: 14, color: 'var(--sub, #3A3A3A)' }}><b style={{ color: 'var(--ink, #000000)' }}>Archived.</b> This wish is off the list. Its gifts and notes are kept here.</span>
          ) : (
            <div style={{ display: 'flex', gap: 10 }}>
              {it.unlimited ? (
                <Link href={give} style={{ ...btn, background: 'var(--inv-bg, #000000)', color: 'var(--inv-fg, #FFFFFF)' }}>Send a treat</Link>
              ) : it.covered ? (
                isOwner && it.url
                  ? <a href={`/go/${it.id}`} target="_blank" rel="noopener sponsored" style={{ ...btn, background: 'var(--lt, #2E9B47)', color: 'var(--inv-fg, #FFFFFF)', textDecoration: 'none' }}>All covered · Go get it ↗</a>
                  : <span aria-disabled="true" style={{ ...btn, background: 'var(--lt, #2E9B47)', color: 'var(--inv-fg, #FFFFFF)' }}>All covered</span>
              ) : (
                <>
                  <Link href={give} style={{ ...btn, background: 'var(--inv-bg, #000000)', color: 'var(--inv-fg, #FFFFFF)' }}>Contribute</Link>
                  <Link href={`${give}?mode=rest`} style={{ ...btn, border: '1.5px solid var(--line, #000000)', color: 'var(--ink, #000000)' }}>{it.pct === 0 ? 'Get it' : 'Cover the rest'}</Link>
                </>
              )}
            </div>
          )}
        </div>
        {it.url ? (
          <a href={`/go/${it.id}`} target="_blank" rel="noopener sponsored" style={{ alignSelf: 'flex-start', marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'underline', textUnderlineOffset: 3, fontSize: 15, fontWeight: 700, padding: '10px 0', color: 'var(--ink, #000000)' }}>See it on {store} <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="1.78" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7" /><path d="M8 7h9v9" /></svg></a>
        ) : null}
      </section>

      {it.note ? (
        <section aria-label={`${forName}'s note`} style={{ padding: '22px 20px 0' }}>
          <p style={{ margin: 0, fontWeight: 500, fontSize: 14, lineHeight: 1.7, color: 'var(--warm-ink, #3C5A1E)' }}><span style={{ background: 'var(--lt, #F2FA6A)', padding: '2px 4px', borderRadius: 6, WebkitBoxDecorationBreak: 'clone', boxDecorationBreak: 'clone' }}>{isOwner ? 'You' : forName}: "{it.note}"</span></p>
        </section>
      ) : null}

      <section aria-label={it.unlimited ? `Given ${it.timesTreated} times` : `${it.pct} percent covered`} style={{ margin: '24px 16px 0', background: 'var(--dk, #5546A0)', color: 'var(--inv-fg, #FFFFFF)', padding: '22px 18px', display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ position: 'relative', width: 132, height: 132, flexShrink: 0 }}>
          <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }} width="132" height="132" viewBox="0 0 132 132"><circle cx="66" cy="66" r="58" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="12" /><circle className="ip-dialarc" cx="66" cy="66" r="58" fill="none" stroke="#D8F75A" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(C * dialPct / 100).toFixed(1)} 1000`} /></svg>
          <svg aria-hidden="true" style={{ position: 'absolute', left: 22, top: 22 }} width="88" height="88" viewBox="0 0 200 200"><path className="b1" d={ba} fill="#D8F75A" /><path className="b2" d={bb} fill="#D8F75A" /><path className="b3" d={bc} fill="#D8F75A" /></svg>
          <span className="dot" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, color: '#000000' }}>{it.unlimited ? `×${it.timesTreated}` : `${it.pct}%`}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <span className="serif" style={{ fontSize: 28, lineHeight: 1 }}>{headline[0]} <span style={{ fontWeight: 600 }}>{headline[1]}</span></span>
          <span style={{ fontSize: 14, lineHeight: 1.4, color: '#E4DEFA' }}>{giversLine}</span>
        </div>
      </section>

      <section style={{ padding: '26px 20px 0', display: 'flex', flexDirection: 'column' }}>
        <h2 className="serif" style={{ margin: '0 0 6px', fontWeight: 400, fontSize: 30 }}>Notes for <span style={{ fontWeight: 600 }}>{isOwner ? 'you' : forName}</span></h2>
        {notes.length === 0 && !(privateCount && !isOwner) ? <p style={{ margin: 0, padding: '14px 0', borderTop: '1px solid var(--line, #000000)', fontSize: 14, color: 'var(--sub, #3A3A3A)' }}>No notes yet. Leave the first one when you give.</p> : null}
        {notes.map((n) => {
          const on = liked.has(n.id);
          return (
            <div key={n.id} style={{ display: 'flex', gap: 12, padding: '14px 0', borderTop: '1px solid var(--line, #000000)' }}>
              <Link href={`/u/${n.giver_id}`} aria-label={`${n.name}'s profile`} style={{ flexShrink: 0, textDecoration: 'none', height: 40 }}><Avatar user={n} size={40} /></Link>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexGrow: 1, minWidth: 0 }}>
                <span style={{ fontSize: 14 }}>{n.name || 'A friend'} <span style={{ color: 'var(--sub, #3A3A3A)' }}>{verb} · {ago(n.created_at)}{n.visibility === 'private' ? ' · private' : ''}{n.moved_from_name ? ` · moved from the ${n.moved_from_name}` : ''}</span></span>
                {n.note ? <span className="serif" style={{ fontStyle: 'italic', fontSize: 18, lineHeight: 1.2 }}>"{n.note}"</span> : null}
                {(replies[n.id] || []).map((m, i) => <span key={i} style={{ fontSize: 14, lineHeight: 1.35, paddingLeft: 10, borderLeft: '2px solid #D4FA4F' }}><b>{me && m.uid === me.id ? 'You' : (m.name || 'Someone').split(' ')[0]}</b> {m.body}</span>)}
              </div>
              {me ? (
                <form action={toggleLike} style={{ alignSelf: 'center', flexShrink: 0 }}>
                  <input type="hidden" name="contributionId" value={n.id} /><input type="hidden" name="path" value={`/l/${slug}/i/${it.id}`} />
                  <button aria-label={`React to ${n.name}'s note`} aria-pressed={on} style={{ width: 44, height: 44, border: 0, background: 'transparent', padding: 0, fontSize: 18, cursor: 'pointer', opacity: on ? 1 : 0.5 }}><span className="wig">❤️</span></button>
                </form>
              ) : null}
            </div>
          );
        })}
        {privateCount ? (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '14px 0', borderTop: '1px solid var(--line, #000000)' }}>
            <div style={{ width: 40, height: 40, flexShrink: 0, borderRadius: '50%', border: '1.5px dashed var(--edge, #000000)', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="1.73" strokeLinecap="round"><path d="M5 11h14v9H5z" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg></div>
            <span style={{ fontSize: 14 }}>{privateCount} private {privateCount === 1 ? 'contribution' : 'contributions'}</span>
          </div>
        ) : null}
      </section>

      <div style={{ height: 32 }} />

      {isOwner && it.covered && !it.unlimited ? (
        /* a3: owner of a covered wish says thanks (Option 13 Covered) */
        <div style={{ position: 'sticky', bottom: 96, marginTop: 'auto', padding: '14px 20px 14px', background: 'var(--ground, #ECECEF)', borderTop: '1px solid var(--line, #000000)', display: 'flex', gap: 10, zIndex: 5 }}>
          {(await get('SELECT 1 FROM contributions WHERE item_id = ? AND thanked_at IS NULL AND giver_id <> ?', it.id, owner.id)) ? (
            <Link href={`/l/${slug}/i/${it.id}/thanks`} style={{ flex: '1 1 0', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', background: 'var(--inv-bg, #000000)', color: 'var(--inv-fg, #FFFFFF)', fontWeight: 800, fontSize: 16, height: 54, borderRadius: 999 }}>Say thanks</Link>
          ) : (
            <Link href={`/l/${slug}/i/${it.id}/thanks`} style={{ flex: '1 1 0', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', border: '1.5px solid var(--edge, #000000)', color: 'var(--ink, #000000)', fontWeight: 800, fontSize: 16, height: 54, borderRadius: 999, boxSizing: 'border-box' }}>Thank-you sent</Link>
          )}
        </div>
      ) : null}
    </main>
  );
}
