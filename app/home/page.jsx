import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { listsOwnedBy, itemsFor, lately } from '@/lib/lists';
import { logOut, react } from '@/lib/actions';
import { ago } from '@/lib/time';
import { Avatar, Blob, Logo } from '@/components/ui';

export const dynamic = 'force-dynamic';

const CARD = ['#13286B', '#E8642C', '#96E084', '#F4D3EE', '#A9CDF5', '#B36EE0'];
const INK = ['#FFFFFF', '#FFFFFF', '#000000', '#E2452B', '#13286B', '#D8F75A'];
const EMOJI = ['❤️', '🎉', '🥹', '👀'];

function reactionsFor(ids) {
  if (!ids.length) return {};
  db().exec(`CREATE TABLE IF NOT EXISTS reactions (contribution_id TEXT NOT NULL, user_id TEXT NOT NULL, emoji TEXT NOT NULL, PRIMARY KEY (contribution_id, user_id))`);
  const rows = db().prepare(`SELECT contribution_id, emoji, COUNT(*) AS n FROM reactions WHERE contribution_id IN (${ids.map(() => '?').join(',')}) GROUP BY contribution_id, emoji`).all(...ids);
  const out = {};
  for (const r of rows) (out[r.contribution_id] ||= []).push(r);
  return out;
}

export default async function HomePage() {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/home');
  const lists = listsOwnedBy(me.id).map((l) => ({ ...l, items: itemsFor(l.id) }));
  const feed = lately(me.id).map((f) => {
    if (f.quantity === 0) return f;
    const it = db().prepare('SELECT id, price_cents, quantity FROM items WHERE list_id = ? AND name = ? LIMIT 1').get(db().prepare('SELECT id FROM lists WHERE slug = ?').get(f.slug)?.id, f.item_name);
    if (!it) return f;
    const raised = db().prepare('SELECT COALESCE(SUM(amount_cents),0) AS c FROM contributions WHERE item_id = ?').get(it.id).c;
    return { ...f, pct: Math.min(100, Math.floor((raised / Math.max(1, it.price_cents * it.quantity)) * 100)) };
  });
  const rx = reactionsFor(feed.map((f) => f.id));
  const first = (me.name || '').split(' ')[0] || 'you';

  return (
    <main>
      <header className="hdr" style={{ padding: '14px 20px 0' }}>
        <Logo />
        <form action={logOut}><button className="pill" style={{ fontSize: 13 }}>Log out</button></form>
      </header>

      <section style={{ padding: '18px 20px 0', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
          <Blob seed={8} color="#B36EE0" width={116} height={116} style={{ left: -10, top: -10 }} />
          <span className="serif" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 46, color: '#D8F75A' }}>{(first[0] || '?').toUpperCase()}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h1 style={{ margin: 0, fontWeight: 400, fontSize: 28, letterSpacing: '-0.02em', lineHeight: 1 }}>{me.name || 'Hi there'}</h1>
          <span className="muted" style={{ fontSize: 14 }}>Let's celebrate you, and <span className="it">life.</span></span>
        </div>
      </section>

      <section className="sec" style={{ gap: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 className="serif" style={{ margin: 0, fontWeight: 400, fontSize: 30, lineHeight: 1 }}>My <span style={{ fontWeight: 600 }}>lists</span></h2>
          <span className="dot" style={{ fontSize: 16 }}>{lists.length}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
          {lists.map((l, i) => {
            const covered = l.items.filter((it) => it.covered).length;
            const bg = CARD[i % CARD.length], ink = INK[i % INK.length];
            return (
              <Link key={l.id} href={`/l/${l.slug}`} style={{ position: 'relative', height: 200, textDecoration: 'none', background: bg, color: ink, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 12 }}>
                <Blob seed={20 + i} color={i % 2 ? '#D8F75A' : '#F4D3EE'} width={200} height={120} style={{ left: -14, top: 40 }} />
                <span style={{ position: 'relative', fontSize: 11, fontWeight: 700 }}>{l.visibility === 'public' ? 'Public' : 'Private'}{l.surprise ? ' · surprise' : ''} · {l.items.length} {l.items.length === 1 ? 'thing' : 'things'}</span>
                <span className="serif" style={{ position: 'relative', alignSelf: 'center', textAlign: 'center', color: '#000', fontSize: 24, lineHeight: 0.95 }}>{l.title}</span>
                <span className="dot" style={{ position: 'relative', alignSelf: 'flex-end', fontSize: 15 }}>{l.items.length ? `${covered} covered` : 'add things'}</span>
              </Link>
            );
          })}
          <Link href="/lists/new" style={{ height: 200, textDecoration: 'none', border: '2px dashed #000', color: '#000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 800, fontSize: 15 }}>
            <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
            New list
          </Link>
        </div>
      </section>

      <section className="sec" style={{ gap: 0, paddingBottom: 40 }}>
        <h2 className="serif" style={{ margin: '0 0 6px', fontWeight: 400, fontSize: 30, lineHeight: 1 }}>Lately <span style={{ fontWeight: 600 }}>with friends</span></h2>
        {feed.length === 0 ? (
          <p className="muted" style={{ margin: '10px 0 0', fontSize: 15, lineHeight: 1.45 }}>Nothing yet. Share a list and your friends' gifts and notes will show up here.</p>
        ) : null}
        {feed.map((f) => {
          const treat = f.quantity === 0;
          const text = treat ? `${f.name} treated you to ${f.item_name}` : `${f.name} chipped in on your ${f.item_name}`;
          const badge = treat ? `×${f.units}` : f.pct != null ? `${f.pct}%` : '';
          const mine = rx[f.id] || [];
          return (
            <div key={f.id} style={{ display: 'flex', gap: 12, padding: '14px 0', borderTop: '1px solid #000' }}>
              <Avatar user={{ name: f.name, color: f.color, seed: f.seed }} size={44} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexGrow: 1, minWidth: 0 }}>
                <span style={{ fontSize: 15, lineHeight: 1.3 }}>{text}{f.visibility === 'private' ? <span className="muted"> · private, only you see this</span> : null}</span>
                {f.note ? <span className="it" style={{ fontSize: 18, lineHeight: 1.2 }}>"{f.note}"</span> : null}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  {EMOJI.map((e) => {
                    const n = mine.find((r) => r.emoji === e)?.n || 0;
                    return (
                      <form key={e} action={react}>
                        <input type="hidden" name="contributionId" value={f.id} />
                        <input type="hidden" name="emoji" value={e} />
                        <button aria-label={`React ${e}`} className="react" style={{ background: n ? '#D8F75A' : 'transparent' }}>{e}{n ? <span className="dot" style={{ fontSize: 12 }}>{n}</span> : null}</button>
                      </form>
                    );
                  })}
                  <Link href={`/l/${f.slug}`} style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700 }}>See list</Link>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                <span className="dot" style={{ fontSize: 16, color: '#13286B' }}>{badge}</span>
                <span className="muted" style={{ fontSize: 12 }}>{ago(f.created_at)}</span>
              </div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
