import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar, ItemSketch, Hl, Dial, Halftone } from '@/components/ui';
import { tileInk, hostOf, firstName } from '@/components/friend-list';
import { listBySlug, itemById, owner as ownerOf, notesFor, money } from '@/lib/lists';
import { currentUser } from '@/lib/auth';
import { get, all } from '@/lib/db';
import { toggleLike } from '@/lib/actions-a2';
import { ago } from '@/lib/time';

export const dynamic = 'force-dynamic';

const DARK = ['#13286B', '#B36EE0', '#C8743A', '#807F48', '#E2452B'];
// Eyebrow ink: a deep shade of the hero color, like the boards' #5A2A10 on orange.
const EYEBROW = { '#E8642C': '#5A2A10', '#F0895A': '#5A2A10', '#F4D3EE': '#8A2A1A', '#A9CDF5': '#13286B', '#96E084': '#1E4A12', '#E3C552': '#5A4410', '#5FC3D9': '#0E3A48', '#D8F75A': '#13286B' };

export default async function ItemPage({ params }) {
  const { slug, itemId } = await params;
  const list = await listBySlug(slug);
  if (!list) notFound();
  const it = await itemById(itemId);
  if (!it || it.list_id !== list.id) notFound();
  const owner = await ownerOf(list);
  const me = await currentUser();
  const isOwner = !!(me && me.id === owner.id);
  const forName = list.for_who === 'other' && list.recipient_name ? list.recipient_name : firstName(owner);
  const notes = (await notesFor(it.id, isOwner)).filter((n) => n.note || isOwner);
  const privateCount = (await get("SELECT COUNT(*) AS n FROM contributions WHERE item_id = ? AND visibility = 'private'", it.id)).n;
  const liked = me ? new Set((await all('SELECT r.contribution_id FROM reactions r JOIN contributions c ON c.id = r.contribution_id WHERE c.item_id = ? AND r.user_id = ?', it.id, me.id)).map((r) => r.contribution_id)) : new Set();

  const dark = DARK.includes(it.color);
  const hdrInk = dark ? '#FFFFFF' : '#000000';
  const sketchInk = it.color === '#F4D3EE' ? '#E2452B' : it.color === '#D8F75A' || it.color === '#D4FA4F' ? '#13286B' : '#FFFFFF';
  const forInk = dark ? '#D8F75A' : '#13286B';
  const store = it.store || (it.url ? hostOf(it.url) : '');
  const eyebrow = it.photo ? (it.url ? `Photo from ${store}` : `${forName}'s photo`) : store ? `From ${store}` : 'On the list';
  const priceBit = it.unlimited || it.quantity > 1 ? <><span className="dot" style={{ fontSize: 15, color: '#000000' }}>{money(it.price_cents)}</span> each</> : <span className="dot" style={{ fontSize: 15, color: '#000000' }}>{money(it.price_cents)}</span>;
  const headline = it.unlimited ? ['Given', 'again and again'] : it.covered ? ['All', 'covered'] : it.pct >= 75 ? ['Almost', 'there'] : it.pct >= 50 ? ['Past', 'halfway'] : it.pct > 0 ? ['On its', 'way'] : ['Up for', 'grabs'];
  const giversLine = it.unlimited
    ? <><span className="dot" style={{ fontSize: 15 }}>{it.givers}</span> {it.givers === 1 ? 'friend has' : 'friends have'} sent one. Amounts stay private.</>
    : it.givers
      ? <><span className="dot" style={{ fontSize: 15 }}>{it.givers}</span> {it.givers === 1 ? 'friend has' : 'friends have'} chipped in. Amounts stay private.</>
      : <>Nobody has chipped in yet. Get it, or start it off.</>;
  const give = `/l/${slug}/i/${it.id}/give`;
  const back = `/l/${slug}`;
  const verb = it.unlimited ? 'sent a treat' : 'chipped in';

  return (
    <main style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <section style={{ position: 'relative', background: it.color, height: 380, overflow: 'hidden', flexShrink: 0 }}>
        <header style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 0 8px' }}>
          <Link href={back} aria-label={isOwner ? 'Back to my list' : `Back to ${forName}'s list`} className="iconbtn"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={hdrInk} strokeWidth="1.8" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></Link>
          {isOwner ? (
            <Link href={`/l/${slug}/i/${it.id}/edit`} aria-label={`Edit ${it.name}`} className="iconbtn"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={hdrInk} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20l4-1 11-11-3-3L5 16z" /><path d="M13 8l3 3" /></svg></Link>
          ) : me ? (
            <Link href={`/l/${slug}/share`} aria-label="Share this list" className="iconbtn"><svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={hdrInk} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v13" /><path d="M7 8l5-5 5 5" /><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></svg></Link>
          ) : <span style={{ width: 44 }} />}
        </header>
        <span className="wide" style={{ position: 'absolute', left: 20, top: 68, fontSize: 11, letterSpacing: '0.18em', color: dark ? '#FFFFFF' : EYEBROW[it.color] || '#000000', zIndex: 1 }}>{eyebrow}</span>
        <div style={{ position: 'absolute', left: '50%', top: it.photo ? 92 : 78, marginLeft: it.photo ? -115 : -130, width: it.photo ? 230 : 260, height: it.photo ? 230 : 260, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {it.photo ? <Halftone src={it.photo} ink={dark ? '#D8F75A' : '#13286B'} size={230} dot={4} /> : <ItemSketch name={it.name} size={260} ink={sketchInk} unlimited={it.unlimited} strokeWidth={1.5} />}
        </div>
        <span style={{ position: 'absolute', right: 20, bottom: 16, fontWeight: 700, fontSize: 30, letterSpacing: '-0.04em', color: forInk }}>For {forName}</span>
      </section>

      <section style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h1 style={{ margin: 0, fontWeight: 400, fontSize: 32, lineHeight: 1.02, letterSpacing: '-0.035em' }}>{it.name}</h1>
        <span style={{ fontWeight: 500, fontSize: 14, color: '#4A4A4A' }}>
          {it.quantity > 1 ? `Set of ${it.quantity} · ` : it.unlimited ? 'Unlimited · ' : ''}{priceBit}{store ? ` at ${store}` : ''}
        </span>
        {!isOwner ? (
          <div aria-label="Give" style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!it.unlimited ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ flexGrow: 1, height: 10, borderRadius: 999, background: '#D7D7DC', overflow: 'hidden' }}><div style={{ width: `${it.pct}%`, height: '100%', borderRadius: 999, background: it.covered ? '#2E9B47' : '#13286B' }} /></div><span className="dot" style={{ fontSize: 16 }}>{it.pct}%</span></div>
                <span style={{ fontSize: 14, color: '#4A4A4A' }}><b style={{ color: '#000' }}>{it.covered ? 'All covered.' : it.pct >= 75 ? 'Almost there.' : it.pct >= 50 ? 'More than halfway.' : it.pct > 0 ? 'Off to a good start.' : 'Up for grabs.'}</b> {it.covered ? 'Thank you, everyone.' : it.givers ? `${it.givers} ${it.givers === 1 ? 'friend is' : 'friends are'} in. Join them.` : 'Be the first to give.'}</span>
              </>
            ) : (
              <span style={{ fontSize: 14, color: '#4A4A4A' }}><b style={{ color: '#000' }}>Treated ×{it.timesTreated}.</b> Send one anytime, again and again.</span>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
          {it.unlimited ? (
            <Link href={give} style={{ flex: '1 1 0', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', background: '#000000', color: '#FFFFFF', fontWeight: 800, fontSize: 16, height: 54, borderRadius: 999 }}>Send a treat</Link>
          ) : it.covered ? (
            <span aria-disabled="true" style={{ flex: '1 1 0', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2E9B47', color: '#FFFFFF', fontWeight: 800, fontSize: 16, height: 54, borderRadius: 999 }}>All covered</span>
          ) : (
            <>
              <Link href={give} style={{ flex: '1 1 0', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', background: '#000000', color: '#FFFFFF', fontWeight: 800, fontSize: 16, height: 54, borderRadius: 999 }}>Contribute</Link>
              <Link href={`${give}?mode=rest`} style={{ flex: '1 1 0', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', border: '1.5px solid #000000', fontWeight: 800, fontSize: 16, height: 54, borderRadius: 999, boxSizing: 'border-box', color: '#000' }}>{it.pct === 0 ? 'Get it' : 'Cover the rest'}</Link>
            </>
          )}
            </div>
          </div>
        ) : null}
        {it.url ? (
          <a href={/^https?:/i.test(it.url) ? it.url : 'https://' + it.url} target="_blank" rel="noopener" style={{ alignSelf: 'flex-start', marginTop: 2, display: 'flex', alignItems: 'center', gap: 8, height: 44, textDecoration: 'underline', textUnderlineOffset: 3, fontWeight: 700, fontSize: 15, padding: 0, boxSizing: 'border-box', color: '#000' }}>See it at {store} <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7" /><path d="M8 7h9v9" /></svg></a>
        ) : null}
      </section>

      {it.note ? (
        <section aria-label={`${forName}'s note`} style={{ margin: '24px 20px 0', background: '#D8F75A', padding: '16px 16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em', color: '#13286B' }}>{isOwner ? 'You said' : `${forName} says`}</span>
          <p className="serif" style={{ margin: 0, fontSize: 22, lineHeight: 1.55 }}><Hl pad="3px 8px" style={{ fontWeight: 400 }}>{it.note}</Hl></p>
        </section>
      ) : null}

      <section aria-label={it.unlimited ? `Given ${it.timesTreated} times` : `${it.pct} percent covered`} style={{ margin: '24px 20px 0', background: '#B36EE0', color: '#FFFFFF', padding: '22px 18px', display: 'flex', alignItems: 'center', gap: 18 }}>
        <Dial pct={it.unlimited ? 100 : it.pct} label={it.unlimited ? `×${it.timesTreated}` : undefined} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
          <span className="serif" style={{ fontSize: 28, lineHeight: 1 }}>{headline[0]} <span style={{ fontStyle: 'italic' }}>{headline[1]}</span></span>
          <span style={{ fontSize: 14, lineHeight: 1.4 }}>{giversLine}</span>
        </div>
      </section>

      <section style={{ padding: '28px 20px 0', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ margin: '0 0 8px', fontWeight: 400, fontSize: 26, letterSpacing: '-0.03em', lineHeight: 1 }}>Notes for <span className="serif" style={{ fontStyle: 'italic', fontSize: 30 }}>{isOwner ? 'you' : forName}</span></h2>
        {notes.length === 0 && !(privateCount && !isOwner) ? <p style={{ margin: 0, padding: '14px 0', borderTop: '1px solid #000000', fontSize: 14, color: '#4A4A4A' }}>No notes yet. Leave the first one when you give.</p> : null}
        {notes.map((n) => {
          const on = liked.has(n.id);
          return (
            <div key={n.id} style={{ display: 'flex', gap: 12, padding: '14px 0', borderTop: '1px solid #000000' }}>
              <Link href={`/u/${n.giver_id}`} aria-label={`${n.name}'s profile`} style={{ flexShrink: 0, textDecoration: 'none', height: 40 }}><Avatar user={n} size={40} /></Link>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexGrow: 1, minWidth: 0 }}>
                <span style={{ fontSize: 14 }}><span style={{ fontWeight: 700 }}>{n.name || 'A friend'}</span> <span style={{ color: '#4A4A4A' }}>{verb} · {ago(n.created_at)}{n.visibility === 'private' ? ' · private' : ''}</span></span>
                {n.note ? <span className="serif" style={{ fontStyle: 'italic', fontSize: 18, lineHeight: 1.2 }}>"{n.note}"</span> : null}
              </div>
              {me ? (
                <form action={toggleLike} style={{ alignSelf: 'center', flexShrink: 0 }}>
                  <input type="hidden" name="contributionId" value={n.id} /><input type="hidden" name="path" value={`/l/${slug}/i/${it.id}`} />
                  <button aria-label={`Like ${n.name}'s note`} aria-pressed={on} style={{ width: 44, height: 44, border: 0, background: 'transparent', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill={on ? '#E2452B' : 'none'} stroke="#E2452B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg></button>
                </form>
              ) : null}
            </div>
          );
        })}
        {!isOwner && privateCount ? (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '14px 0', borderTop: '1px solid #000000' }}>
            <div style={{ width: 40, height: 40, flexShrink: 0, borderRadius: '50%', border: '1.5px dashed #000000', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round"><path d="M5 11h14v9H5z" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg></div>
            <span style={{ fontSize: 14 }}><span className="dot" style={{ fontSize: 15 }}>{privateCount}</span> private {privateCount === 1 ? 'gift' : 'gifts'}. Only {forName} knows who.</span>
          </div>
        ) : null}
        <div style={{ borderTop: '1px solid #000000' }} />
      </section>

      <div style={{ height: 32 }} />

      {isOwner && it.covered && !it.unlimited ? (
        /* a3: owner of a covered wish says thanks (Option 13 Covered) */
        <div style={{ position: 'sticky', bottom: 96, marginTop: 'auto', padding: '14px 20px 14px', background: '#ECECEF', borderTop: '1px solid #000000', display: 'flex', gap: 10, zIndex: 5 }}>
          {(await get('SELECT 1 FROM contributions WHERE item_id = ? AND thanked_at IS NULL AND giver_id <> ?', it.id, owner.id)) ? (
            <Link href={`/l/${slug}/i/${it.id}/thanks`} style={{ flex: '1 1 0', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', background: '#000000', color: '#FFFFFF', fontWeight: 800, fontSize: 16, height: 54, borderRadius: 999 }}>Say thanks</Link>
          ) : (
            <Link href={`/l/${slug}/i/${it.id}/thanks`} style={{ flex: '1 1 0', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', border: '1.5px solid #000000', color: '#000000', fontWeight: 800, fontSize: 16, height: 54, borderRadius: 999, boxSizing: 'border-box' }}>Thank-you sent</Link>
          )}
        </div>
      ) : null}
    </main>
  );
}
