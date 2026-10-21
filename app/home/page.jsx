import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { all, get } from '@/lib/db';
import { lately, friendsLately, withProgress } from '@/lib/lists';
import { ago } from '@/lib/time';
import { Avatar, FaceSm, PhotoBlob, Strip } from '@/components/ui';
import { ListTile, tileData } from '@/components/list-tile';
import LatelyActions from '@/components/lately-actions';
import Nav from '@/components/nav';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Home · insidejoke' };

const first = (n) => (n || '').trim().split(/\s+/)[0] || 'A friend';
const NameLine = ({ name }) => {
  const [a, ...rest] = (name || 'Hi there').trim().split(/\s+/);
  return <>{a}{rest.length ? <> <span className="it">{rest.join(' ')}</span></> : null}</>;
};

async function heartsFor(keys, meId) {
  if (!keys.length) return {};
  const rows = await all(`SELECT contribution_id, COUNT(*) AS n, MAX(CASE WHEN user_id = ? THEN 1 ELSE 0 END) AS mine FROM reactions WHERE emoji = '❤️' AND contribution_id IN (${keys.map(() => '?').join(',')}) GROUP BY contribution_id`, meId, ...keys);
  return Object.fromEntries(rows.map((r) => [r.contribution_id, r]));
}

// Gifts on your lists + things friends added. Treats on the same item are grouped into one row.
async function buildFeed(me) {
  const gifts = await lately(me.id);
  const groups = new Map();
  const out = [];
  for (const g of gifts) {
    if (g.quantity === 0) {
      const k = g.item_id;
      if (!groups.has(k)) {
        const e = { kind: 'treat', key: g.id, item_id: g.item_id, item_name: g.item_name, store: g.store, slug: g.slug, created_at: g.created_at, givers: [], units: 0, note: null, noteBy: null, noteAt: null, private: false };
        groups.set(k, e);
        out.push(e);
      }
      const e = groups.get(k);
      if (!e.givers.find((x) => x.id === g.giver_id)) e.givers.push({ id: g.giver_id, name: g.name, color: g.color, seed: g.seed, photo: g.photo });
      e.units += g.units;
      if (g.visibility === 'private') e.private = true;
      if (g.note && !e.note) { e.note = g.note; e.noteBy = g.name; e.noteAt = g.created_at; }
    } else {
      const it = await withProgress(await get('SELECT * FROM items WHERE id = ?', g.item_id));
      const last = (await get('SELECT id FROM contributions WHERE item_id = ? ORDER BY created_at DESC LIMIT 1', g.item_id)).id === g.id;
      out.push({ kind: 'wish', key: g.id, item_id: g.item_id, item_name: g.item_name, slug: g.slug, created_at: g.created_at, givers: [{ id: g.giver_id, name: g.name, color: g.color, seed: g.seed, photo: g.photo }], note: g.note, pct: it.pct, finished: it.covered && last, private: g.visibility === 'private' });
    }
  }
  for (const a of await friendsLately(me.id)) {
    out.push({ kind: 'added', key: 'i:' + a.item_id, item_id: a.item_id, item_name: a.item_name, slug: a.slug, title: a.title, created_at: a.created_at, givers: [{ id: a.giver_id, name: a.name, color: a.color, seed: a.seed, photo: a.photo }] });
  }
  return out.sort((x, y) => y.created_at - x.created_at).slice(0, 8);
}

function Who({ g }) {
  return <Link href={`/u/${g.id}`} style={{ fontWeight: 700, textDecoration: 'none' }}>{first(g.name)}</Link>;
}

function FeedRow({ f, h }) {
  const g = f.givers;
  const one = g[0];
  const from = f.store ? ` from ${f.store}` : '';
  let text, badge, see = 'See item', href = `/l/${f.slug}/i/${f.item_id}`, when = ago(f.created_at);
  let lead;
  if (f.kind === 'treat' && g.length > 1) {
    const shown = g.slice(0, 2), rest = g.slice(2);
    lead = (
      <>
        <input type="checkbox" id={`o-${f.key}`} className="sr a1-chk" />
        <span style={{ fontSize: 15, lineHeight: 1.4 }}>
          {shown.map((x, k) => <span key={x.id}>{k ? (rest.length ? ', ' : ' and ') : ''}<Who g={x} /></span>)}
          {rest.length ? <> and <label htmlFor={`o-${f.key}`} style={{ fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}>{rest.length} {rest.length === 1 ? 'other' : 'others'}</label></> : null} treated you to {f.item_name}{from}
        </span>
        {rest.length ? (
          <div className="a1-others a1up" style={{ flexWrap: 'wrap', gap: 6, padding: '2px 0' }}>
            {rest.map((o) => (
              <Link key={o.id} href={`/u/${o.id}`} style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', background: '#FFFFFF', borderRadius: 999, padding: '4px 10px 4px 4px', fontSize: 13, fontWeight: 700 }}><Avatar user={o} size={24} />{first(o.name)}</Link>
            ))}
          </div>
        ) : null}
      </>
    );
    badge = `×${f.units}`;
    when = f.note ? `This week · ${first(f.noteBy)}’s note, ${ago(f.noteAt)}` : `This week · ${ago(f.created_at)}`;
  } else if (f.kind === 'treat') {
    text = <>treated you to {f.item_name}{from}{f.private ? '. Private, so only you know who sent it' : ''}</>;
    badge = `×${f.units}`;
  } else if (f.kind === 'wish') {
    text = f.finished ? <>covered the rest of your {f.item_name}</> : <>put money toward your {f.item_name}{f.private ? '. Private, so only you know who sent it' : ''}</>;
    badge = `${f.pct}%`;
  } else {
    text = <>added {f.item_name} to {f.title}</>;
    badge = '+1';
    see = 'See list';
    href = `/l/${f.slug}`;
  }
  const multi = g.length > 1;
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '16px 0', borderTop: '1px solid #000000' }}>
      {multi ? (
        <Link href={`/u/${g[0].id}`} aria-label={`${first(g[0].name)} and ${first(g[1].name)}`} style={{ position: 'relative', width: 56, height: 44, flexShrink: 0, textDecoration: 'none' }}>
          <span style={{ position: 'absolute', left: 0, top: 0 }}><FaceSm user={g[0]} size={38} /></span>
          <span style={{ position: 'absolute', left: 18, top: 8 }}><FaceSm user={g[1]} size={38} /></span>
        </Link>
      ) : (
        <Link href={`/u/${one.id}`} aria-label={`${first(one.name)}, profile`} style={{ flexShrink: 0, textDecoration: 'none', color: '#000' }}><FaceSm user={one} size={44} /></Link>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexGrow: 1, minWidth: 0 }}>
        {lead || <span style={{ fontSize: 15, lineHeight: 1.4 }}><Who g={one} /> {text}</span>}
        {f.note ? <span style={{ fontSize: 15, lineHeight: 1.6 }}><span className="hi it">{f.note}</span></span> : null}
        <span style={{ fontSize: 12, color: '#4A4A4A' }}>{when}</span>
        <LatelyActions cid={f.key} hearts={h?.n || 0} mine={!!h?.mine} href={href} see={see} toName={first(f.noteBy || one.name)} />
      </div>
      <span className="dot" style={{ fontSize: 18, color: '#E8642C', flexShrink: 0 }}>{badge}</span>
    </div>
  );
}

export default async function HomePage() {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/home');

  const mine = await all(`SELECT * FROM lists WHERE status = 'open' AND (owner_id = ? OR id IN (SELECT list_id FROM list_members WHERE user_id = ? AND role <> 'viewer')) ORDER BY created_at DESC`, me.id, me.id);
  const tiles = await Promise.all(mine.map((l) => tileData(l, me.id)));
  const seen = {};
  const idx = (k) => (seen[k] = (seen[k] ?? -1) + 1);
  const archived = (await get("SELECT COUNT(*) AS n FROM lists WHERE owner_id = ? AND status = 'archived'", me.id)).n;
  const friends = (await get("SELECT COUNT(*) AS n FROM friends WHERE user_id = ? AND status = 'friends'", me.id)).n;
  const fresh = (await get('SELECT COUNT(*) AS n FROM contributions c JOIN lists l ON l.id = c.list_id WHERE l.owner_id = ? AND l.surprise = 0 AND c.created_at > ?', me.id, Date.now() - 2 * 24 * 3600 * 1000)).n;
  const feed = await buildFeed(me);
  const hearts = await heartsFor(feed.map((f) => f.key), me.id);

  return (
    <>
      <main className="withnav" style={{ display: 'flex', flexDirection: 'column' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 12px 0 20px' }}>
          <Link href="/" style={{ textDecoration: 'none', color: '#13286B', display: 'flex', alignItems: 'baseline' }}><span className="wide" style={{ fontSize: 18, textTransform: 'none' }}>inside</span><span className="dot" style={{ fontSize: 22 }}>joke</span></Link>
          <Link href="/wallet/history" aria-label={fresh ? `Activity, ${fresh} new` : 'Activity'} style={{ position: 'relative', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
            {fresh ? <span className="dot" aria-hidden="true" style={{ position: 'absolute', top: 4, right: 2, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 999, background: '#E8642C', color: '#FFFFFF', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{fresh > 9 ? '9+' : fresh}</span> : null}
          </Link>
        </header>

        <section style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: 18 }}>
          <Link href="/you" aria-label="Your profile" style={{ textDecoration: 'none' }}>
            <PhotoBlob user={me} owner size={92} pad={10} uid="homeme" fontSize={46} />
          </Link>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <h1 style={{ margin: 0, fontWeight: 400, fontSize: 30, letterSpacing: '-0.03em', lineHeight: 1 }}><NameLine name={me.name} /></h1>
            {me.bio ? <span style={{ fontSize: 15, lineHeight: 1.3 }}>{me.bio}</span> : null}
            <Link href="/you" style={{ fontSize: 12, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, color: '#13286B', padding: '4px 0' }}>See your profile</Link>
          </div>
        </section>

        <section style={{ padding: '30px 20px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 className="serif" style={{ margin: 0, fontWeight: 400, fontSize: 36, lineHeight: 1 }}>My <span style={{ fontWeight: 600 }}>lists</span></h2>
            <Link href="/lists/new" style={{ display: 'flex', alignItems: 'center', gap: 6, height: 44, fontWeight: 800, fontSize: 14, textDecoration: 'none' }}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>New list</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            {tiles.map((t) => <ListTile key={t.id} t={t} i={idx(t.kind)} />)}
            {tiles.length === 0 ? (
              <Link href="/lists/new" style={{ height: 230, textDecoration: 'none', border: '1.5px dashed #000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 800, fontSize: 15, textAlign: 'center', padding: 12 }}>
                <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
                Make your first list
              </Link>
            ) : null}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 6 }}>
            <Link href="/home/archived" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', borderTop: '1.5px solid #000000', minHeight: 52, fontWeight: 700, fontSize: 15 }}><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h18v13H3z" /><path d="M2 4h20v3H2z" /><path d="M10 12h4" /></svg>Archived</span><span className="dot" style={{ fontSize: 16 }}>{archived}</span></Link>
            <Link href="/wallet/history" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', borderTop: '1px solid #000000', borderBottom: '1.5px solid #000000', minHeight: 52, fontWeight: 700, fontSize: 15 }}><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>History<span style={{ fontWeight: 400, fontSize: 13, color: '#4A4A4A' }}>given, received, cash-outs</span></span><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg></Link>
          </div>
        </section>

        <Strip text="LATELY" style={{ marginTop: 32, height: 'auto', padding: '9px 0' }} />

        <section style={{ padding: '16px 20px 0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, margin: '0 0 14px' }}>
            <h2 style={{ margin: 0, fontWeight: 400, fontSize: 15, lineHeight: 1.35 }}>Your friends on insidejoke. Tap a name for their profile.</h2>
            <Link href="/friends" className="dot" style={{ flexShrink: 0, fontSize: 15, color: '#E8642C', textDecoration: 'none' }}>{friends} {friends === 1 ? 'friend' : 'friends'}</Link>
          </div>
          {feed.map((f) => <FeedRow key={f.key} f={f} h={hearts[f.key]} />)}
          {feed.length === 0 ? (
            <p style={{ margin: 0, padding: '16px 0', borderTop: '1px solid #000000', fontSize: 15, lineHeight: 1.45 }}>Nothing yet. Share a list and your friends’ gifts and notes show up here.</p>
          ) : null}
          <p style={{ margin: 0, padding: '16px 0 0', borderTop: '1px solid #000000', fontSize: 13, color: '#4A4A4A', display: 'flex', gap: 8, alignItems: 'center' }}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A4A4A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h16v10H4z" /><path d="M3 7h18v3H3z" /><path d="M12 7v13" /></svg>Surprise gifts stay out of here until the reveal.</p>
        </section>
        <div style={{ height: 24 }} />
      </main>
      <Nav me={me} active="home" />
    </>
  );
}
