import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser, normalizePhone } from '@/lib/auth';
import { all, get } from '@/lib/db';
import { friendsOf } from '@/lib/lists';
import { FaceSm, Blob } from '@/components/ui';
import { Chevron } from '@/components/profile-hero';
import AddFriendForm from '@/components/add-friend-form';
import ContactsPicker from '@/components/contacts-picker';
import LatelyRows from '@/components/lately-feed';
import { friendsFeed } from '@/lib/feed';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Friends · insidejoke' };

// a1: the Friends tab. Lately (friends' activity) on top, then your friends and the add-a-friend tools.
export default async function FriendsPage({ searchParams }) {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/friends');
  const sp = await searchParams;
  const q = typeof sp?.q === 'string' ? sp.q.trim().slice(0, 40) : '';
  // Bottom bar → friends' Lately. Your profile's "N friends" → the list of friends (?view=list), as before.
  const listView = !!q || sp?.view === 'list';
  const friends = await friendsOf(me.id);
  const counts = Object.fromEntries((await all("SELECT owner_id, COUNT(*) AS n FROM lists WHERE status = 'open' AND surprise = 0 AND for_who = 'me' AND visibility = 'public' GROUP BY owner_id")).map((r) => [r.owner_id, r.n]));

  // Search: names among your friends; a phone number also finds anyone on insidejoke.
  const digits = q.replace(/\D/g, '');
  const ql = q.toLowerCase();
  const shown = q ? friends.filter((f) => (f.name || '').toLowerCase().includes(ql) || (digits.length >= 3 && f.phone.replace(/\D/g, '').includes(digits))) : friends;
  const phone = digits.length >= 10 ? normalizePhone(q) : null;
  const feed = listView ? [] : await friendsFeed(me.id);
  let found = null;
  if (phone && phone !== me.phone && !friends.find((f) => f.phone === phone)) found = (await get('SELECT * FROM users WHERE phone = ?', phone)) || { none: true };

  return (
    <>
      <main className="withnav" style={{ display: 'flex', flexDirection: 'column' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 0 12px' }}>
          <span style={{ width: 44 }} />
          <h1 className="wide" style={{ margin: 0, fontSize: 11, letterSpacing: '0.18em' }}>Friends</h1>
          <a href="/friends?view=list#add" aria-label="Add a friend" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="1.91" strokeLinecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg></a>
        </header>

        {listView ? null : (
          <section aria-label="Lately" style={{ padding: '22px 20px 0', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, margin: '0 0 4px' }}>
              <h2 className="wide" style={{ margin: 0, fontSize: 18, letterSpacing: '0.1em' }}>Lately</h2>
              <a href="/friends?view=list" className="dot" style={{ fontSize: 15, color: '#E8642C', textDecoration: 'none' }}>{friends.length} {friends.length === 1 ? 'friend' : 'friends'}</a>
            </div>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--muted, #4A4A4A)' }}>New lists, new wishes and wishes all covered, from your friends.</p>
            <LatelyRows rows={feed} meId={me.id} limit={20} />
            {feed.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start', padding: '14px 0', borderTop: '1px solid var(--line, #000000)' }}>
                <span style={{ fontSize: 15, lineHeight: 1.45 }}>{friends.length ? 'Quiet so far. When your friends start lists or add wishes, it shows up here.' : 'Nothing here yet. Add a few friends and their new lists and wishes show up here.'}</span>
                <a href="/friends?view=list#add" style={{ display: 'flex', alignItems: 'center', height: 40, padding: '0 16px', borderRadius: 999, background: 'var(--inv-bg, #000000)', color: 'var(--inv-fg, #FFFFFF)', textDecoration: 'none', fontWeight: 700, fontSize: 13 }}>Add a friend</a>
              </div>
            ) : null}
            <p style={{ margin: 0, padding: '14px 0 0', borderTop: '1px solid var(--line, #000000)', fontSize: 13, color: 'var(--muted, #4A4A4A)', display: 'flex', gap: 8, alignItems: 'center' }}><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--muted, #4A4A4A)" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>Private lists and surprises stay out of here.</p>
          </section>
        )}

        {listView ? (<>
        <section id="people" style={{ position: 'relative', padding: q ? '22px 20px 0' : '40px 20px 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
          <h2 style={{ margin: 0, fontWeight: 400, fontSize: 44, letterSpacing: '-0.03em', lineHeight: 0.95 }}>Your <span className="it">friends</span></h2>
          <span style={{ position: 'relative', width: 72, height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Blob seed={33} color="#D8F75A" width={72} height={56} style={{ left: 0, top: 0 }} />
            <span className="dot" style={{ position: 'relative', fontSize: 24, color: 'var(--navy-ink, #13286B)' }}>{friends.length}</span>
          </span>
        </section>
        <p style={{ margin: '12px 20px 0', fontSize: 15, lineHeight: 1.45 }}>Friends see each other’s lists and show up in Lately. <span className="hi">Nobody sees amounts.</span></p>

        <form role="search" action="/friends" style={{ margin: '22px 20px 0', display: 'flex', height: 52, border: '1.5px solid var(--line, #000000)', background: 'var(--surface, #FFFFFF)' }}>
          <label htmlFor="q" className="sr">Search friends by name or number</label>
          <span aria-hidden="true" style={{ display: 'flex', alignItems: 'center', padding: '0 4px 0 14px' }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="1.82" strokeLinecap="round"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></svg></span>
          <input id="q" name="q" type="search" defaultValue={q} placeholder="Name or number" autoComplete="off" style={{ flexGrow: 1, minWidth: 0, border: 0, background: 'transparent', fontFamily: 'inherit', fontSize: 17, padding: '0 10px', color: 'var(--ink, #000)', outline: 'none' }} />
          {q ? <Link href="/friends" aria-label="Clear search" style={{ display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: 13, fontWeight: 700 }}>Clear</Link> : null}
        </form>

        <section aria-label={q ? 'Search results' : 'Your friends'} style={{ padding: '18px 20px 0', display: 'flex', flexDirection: 'column' }}>
          {found && !found.none ? (
            <div className="a1up" style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--lt, #D4FA4F)', padding: '14px 16px', margin: '0 -20px 12px' }}>
              <FaceSm user={found} size={44} />
              <span className="a1-lab" style={{ flexGrow: 1 }}><span className="a1-t">{found.name || 'On insidejoke'}</span><span className="a1-s" style={{ color: 'var(--navy-ink, #13286B)' }}>On insidejoke. Not friends yet.</span></span>
              <Link href={`/u/${found.id}`} className="a1-ghost">See</Link>
            </div>
          ) : null}
          {shown.map((f) => (
            <Link key={f.id} href={`/u/${f.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderTop: '1px solid var(--line, #000000)', textDecoration: 'none' }}>
              <FaceSm user={f} size={44} />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flexGrow: 1, minWidth: 0 }}>
                <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>{f.name || 'Someone'}</span>
                {f.bio ? <span style={{ fontSize: 13, lineHeight: 1.35, color: 'var(--muted, #4A4A4A)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.bio}</span> : null}
              </span>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexShrink: 0 }}><span className="dot" style={{ fontSize: 18, color: '#E8642C' }}>{counts[f.id] || 0}</span><span style={{ fontSize: 13 }}>{(counts[f.id] || 0) === 1 ? 'list' : 'lists'}</span></span>
              <Chevron />
            </Link>
          ))}
          {q && shown.length === 0 && !(found && !found.none) ? (
            <p style={{ margin: 0, padding: '16px 0', borderTop: '1px solid var(--line, #000000)', fontSize: 15, lineHeight: 1.45 }}>{phone ? 'Nobody on insidejoke has that number yet. Add it below and we text them an invite.' : `No friend called “${q}”. Try their number.`}</p>
          ) : null}
          {!q && friends.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '16px 0', borderTop: '1px solid var(--line, #000000)' }}>
              <span className="wide" aria-hidden="true" style={{ fontSize: 44, lineHeight: 0.9, letterSpacing: '0.02em', color: 'var(--navy-ink, #13286B)' }}>Nobody<br />here<br />yet</span>
              <span style={{ fontSize: 15, lineHeight: 1.45 }}>Add a friend by their number. Anyone who gives to your list can be added from their profile too.</span>
            </div>
          ) : null}
          <div style={{ borderTop: '1.5px solid var(--line, #000000)' }} />
        </section>

        <section id="add" style={{ padding: '32px 20px 0', display: 'flex', flexDirection: 'column' }}>
          <ContactsPicker />
          <AddFriendForm defaultPhone={found?.none ? q : ''} />
        </section>
        </>) : null}
        <div style={{ height: 24 }} />
      </main>
    </>
  );
}
