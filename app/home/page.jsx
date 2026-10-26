import { appUrl } from '@/lib/texts';
import ShareProfile from '@/components/share-profile';
import { handleFor } from '@/lib/handles';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { all, get } from '@/lib/db';
import { friendCounts } from '@/lib/lists';
import { myFeed } from '@/lib/feed';
import { unreadCount } from '@/lib/notifications';
import { unreadDmCount } from '@/lib/dm';
import { PhotoBlob } from '@/components/ui';
import { ListTile, tileData } from '@/components/list-tile';
import LatelyRows from '@/components/lately-feed';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Home · insidejoke' };

const Camera = () => <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--inv-fg, #FFFFFF)" strokeWidth="1.96" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3" /></svg>;
const ROW = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', padding: '14px 4px', fontWeight: 700, fontSize: 15 };

export default async function HomePage() {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/home');
  const fc = await friendCounts(me.id);

  const mine = await all(`SELECT * FROM lists WHERE status = 'open' AND (owner_id = ? OR id IN (SELECT list_id FROM list_members WHERE user_id = ? AND role <> 'viewer')) ORDER BY created_at DESC`, me.id, me.id);
  const tiles = await Promise.all(mine.map((l) => tileData(l, me.id)));
  // Board order: own wish lists, collabs, surprises, then treat lists.
  const ORDER = { own: 0, collab: 1, surprise: 2, treat: 3 };
  tiles.sort((x, y) => ORDER[x.kind] - ORDER[y.kind]);
  const seen = {};
  const idx = (k) => (seen[k] = (seen[k] ?? -1) + 1);
  const archived = (await get("SELECT COUNT(*) AS n FROM lists WHERE owner_id = ? AND status = 'archived'", me.id)).n;
  const friends = (await get("SELECT COUNT(*) AS n FROM friends WHERE user_id = ? AND status = 'friends'", me.id)).n;
  const fresh = await unreadCount(me);
  const dms = await unreadDmCount(me.id);
  const feed = await myFeed(me);

  return (
    <main className="withnav dk-wide home-page" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="home-col">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 12px 0 20px' }}>
        <Link href="/" className="dk-hide" style={{ textDecoration: 'none', color: 'var(--navy-ink, #13286B)' }}><span className="wide" style={{ fontSize: 18, textTransform: 'none' }}>inside</span><span className="dot" style={{ fontSize: 22 }}>joke</span></Link>
        <span style={{ display: 'flex', alignItems: 'center' }}>
        <ShareProfile iconOnly url={`${appUrl()}/${(await handleFor(me)) || 'u/' + me.id}`} name={me.name} size={30} style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 0, background: 'transparent', padding: 0, cursor: 'pointer', color: 'var(--ink, #000)' }} />
        <Link href="/messages" aria-label={dms ? `Messages, ${dms} new` : 'Messages'} style={{ position: 'relative', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="1.56" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16v11H9l-5 4z" /></svg>
          {dms ? <span aria-hidden="true" className="r1-pop" style={{ position: 'absolute', top: 8, right: 8, width: 10, height: 10, borderRadius: '50%', background: 'var(--lt, #E8642C)' }} /> : null}
        </Link>
        <Link href="/notifications" aria-label={fresh ? `Notifications, ${fresh} new` : 'Notifications'} style={{ position: 'relative', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="1.56" strokeLinecap="round" strokeLinejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
          {fresh ? <span aria-hidden="true" className="r1-pop" style={{ position: 'absolute', top: 8, right: 8, width: 10, height: 10, borderRadius: '50%', background: 'var(--lt, #E8642C)' }} /> : null}
        </Link>
        <Link href="/you/settings" aria-label="Settings" style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="1.56" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.7a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.7a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.5c.07-.4.1-.8.1-1.2z" /></svg>
        </Link>
        </span>
      </header>

      <section style={{ padding: '18px 20px 0', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href="/you/settings" aria-label={me.photo ? 'Change your profile photo' : 'Add a profile photo'} style={{ position: 'relative', width: 96, height: 96, flexShrink: 0, textDecoration: 'none' }}>
          <PhotoBlob user={me} owner size={96} pad={10} uid="homeme" fontSize={46} />
          <span style={{ position: 'absolute', right: -2, bottom: 2, width: 28, height: 28, borderRadius: '50%', background: 'var(--dk, #13286B)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Camera /></span>
        </Link>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontWeight: 400, fontSize: 28, letterSpacing: '-0.02em', lineHeight: 1 }}>{me.name || 'Hi there'}</h1>
          {me.bio ? <span style={{ fontSize: 15 }}>{me.bio}</span> : <Link href="/you/settings" style={{ fontSize: 15, color: 'var(--muted, #4A4A4A)' }}>Add a line about you</Link>}
          <span style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 2 }}>
            <Link href="/friends?view=list" style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink, #000000)' }}>{fc.n} {fc.n === 1 ? 'friend' : 'friends'}</Link>
          </span>
        </div>
      </section>

      <section style={{ padding: '26px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
          <h2 className="serif" style={{ margin: 0, fontWeight: 400, fontSize: 34, lineHeight: 1 }}>My <span style={{ fontWeight: 600 }}>lists</span></h2>
          <Link href="/lists/new" style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 17, textDecoration: 'none', minHeight: 48, padding: '0 4px' }}><svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="2.1" strokeLinecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>New list</Link>
        </div>
        <div className="home-grid tile-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          {tiles.map((t) => <ListTile key={t.id} t={t} i={idx(t.kind)} variant="home" />)}
          {tiles.length === 0 ? (
            <Link href="/lists/new" style={{ height: 230, textDecoration: 'none', border: '1.5px dashed var(--line, #000000)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 800, fontSize: 15, textAlign: 'center', padding: 12 }}>
              <svg aria-hidden="true" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="2.08" strokeLinecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
              Make your first list
            </Link>
          ) : null}
        </div>
        <Link href="/home/archived" style={{ ...ROW, borderTop: '1.5px solid var(--line, #000000)', borderBottom: '1.5px solid var(--line, #000000)' }}><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="1.82" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h18v13H3z" /><path d="M2 4h20v3H2z" /><path d="M10 12h4" /></svg>Archived</span><span className="dot" style={{ fontSize: 16 }}>{archived}</span></Link>
        <Link href="/wallet/history" style={{ ...ROW, borderBottom: '1.5px solid var(--line, #000000)', marginTop: -12 }}><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="1.82" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>History<span style={{ fontWeight: 400, fontSize: 13, color: 'var(--muted, #4A4A4A)' }}>given, received, cash-outs</span></span><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="1.73" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg></Link>
      </section>

      </div>
      <section className="home-side" style={{ padding: '30px 20px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, margin: '0 0 4px' }}>
          <h2 className="wide" style={{ margin: 0, fontSize: 18, letterSpacing: '0.1em' }}>Lately</h2>
          <Link href="/friends?view=list" className="dot" style={{ fontSize: 15, color: '#E8642C', textDecoration: 'none' }}>{friends} {friends === 1 ? 'friend' : 'friends'}</Link>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--muted, #4A4A4A)' }}>Gifts, treats and notes on your lists.</p>
        <LatelyRows rows={feed} meId={me.id} />
        {feed.length === 0 ? (
          <p style={{ margin: 0, padding: '14px 0', borderTop: '1px solid var(--line, #000000)', fontSize: 15, lineHeight: 1.45 }}>Nothing yet. Share a list and gifts and notes on it show up here.</p>
        ) : null}
        <p style={{ margin: 0, padding: '14px 0 0', borderTop: '1px solid var(--line, #000000)', fontSize: 13, color: 'var(--muted, #4A4A4A)', display: 'flex', gap: 8, alignItems: 'center' }}><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--muted, #4A4A4A)" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h16v10H4z" /><path d="M3 7h18v3H3z" /><path d="M12 7v13" /></svg>Surprise gifts stay out of here until the reveal.</p>
      </section>
      <div style={{ height: 24 }} />
    </main>
  );
}
