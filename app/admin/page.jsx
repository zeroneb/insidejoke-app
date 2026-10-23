// Private numbers page for the founder. Only phones listed in ADMIN_PHONES (Vercel setting) can open it.
import { notFound } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { all, get } from '@/lib/db';
import { usd } from '@/components/wallet-ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin · insidejoke', robots: { index: false } };

const digits = (p) => String(p || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
const DAY = 86400000;
// Seeded demo people (555 numbers) are left out of every count.
const REAL = "u.phone NOT LIKE '+1555%'";

const n = async (sql, ...p) => Number((await get(sql, ...p))?.n || 0);

export default async function AdminPage() {
  const me = await currentUser();
  const admins = String(process.env.ADMIN_PHONES || '').split(',').map(digits).filter(Boolean);
  if (!me || !admins.includes(digits(me.phone))) notFound();

  const since = (d) => Date.now() - d * DAY;
  const users = await n(`SELECT COUNT(*) AS n FROM users u WHERE ${REAL}`);
  const users7 = await n(`SELECT COUNT(*) AS n FROM users u WHERE ${REAL} AND u.created_at > ?`, since(7));
  const lists = await n(`SELECT COUNT(*) AS n FROM lists l JOIN users u ON u.id = l.owner_id WHERE ${REAL} AND l.status <> 'deleted'`);
  const items = await n(`SELECT COUNT(*) AS n FROM items i JOIN lists l ON l.id = i.list_id JOIN users u ON u.id = l.owner_id WHERE ${REAL} AND i.removed = 0`);
  const gifts = await get(`SELECT COUNT(*) AS n, COALESCE(SUM(c.amount_cents),0) AS cents FROM contributions c JOIN users u ON u.id = c.giver_id WHERE ${REAL}`);
  const payouts = await get(`SELECT COUNT(*) AS n, COALESCE(SUM(p.gross_cents),0) AS gross, COALESCE(SUM(p.fee_cents),0) AS fee FROM payouts p JOIN users u ON u.id = p.user_id WHERE ${REAL}`);

  // Where people drop off: of everyone who signed up, how many got to each step.
  const funnel = [
    ['Signed up', users],
    ['Made a list', await n(`SELECT COUNT(DISTINCT l.owner_id) AS n FROM lists l JOIN users u ON u.id = l.owner_id WHERE ${REAL}`)],
    ['Added a wish', await n(`SELECT COUNT(DISTINCT l.owner_id) AS n FROM items i JOIN lists l ON l.id = i.list_id JOIN users u ON u.id = l.owner_id WHERE ${REAL}`)],
    ['Shared a list by text', await n(`SELECT COUNT(DISTINCT l.owner_id) AS n FROM list_shares s JOIN lists l ON l.id = s.list_id JOIN users u ON u.id = l.owner_id WHERE ${REAL}`)],
    ['Got a gift', await n(`SELECT COUNT(DISTINCT l.owner_id) AS n FROM contributions c JOIN lists l ON l.id = c.list_id JOIN users u ON u.id = l.owner_id WHERE ${REAL}`)],
    ['Gave a gift', await n(`SELECT COUNT(DISTINCT c.giver_id) AS n FROM contributions c JOIN users u ON u.id = c.giver_id WHERE ${REAL}`)],
    ['Cashed out', await n(`SELECT COUNT(DISTINCT p.user_id) AS n FROM payouts p JOIN users u ON u.id = p.user_id WHERE ${REAL}`)]
  ];

  // Sign-ups per day, last 14 days.
  const recentUsers = await all(`SELECT u.created_at FROM users u WHERE ${REAL} AND u.created_at > ?`, since(14));
  const days = Array.from({ length: 14 }, (_, i) => {
    const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (13 - i));
    const t = start.getTime();
    return { label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), n: recentUsers.filter((r) => Number(r.created_at) >= t && Number(r.created_at) < t + DAY).length };
  });
  const maxDay = Math.max(1, ...days.map((d) => d.n));

  const people = await all(`SELECT u.id, u.name, u.phone, u.created_at,
      (SELECT COUNT(*) FROM lists l WHERE l.owner_id = u.id AND l.status <> 'deleted') AS lists,
      (SELECT COUNT(*) FROM items i JOIN lists l ON l.id = i.list_id WHERE l.owner_id = u.id AND i.removed = 0) AS items,
      (SELECT COALESCE(SUM(c.amount_cents),0) FROM contributions c JOIN lists l ON l.id = c.list_id WHERE l.owner_id = u.id) AS received,
      (SELECT COALESCE(SUM(c.amount_cents),0) FROM contributions c WHERE c.giver_id = u.id) AS given
    FROM users u WHERE ${REAL} ORDER BY u.created_at DESC LIMIT 200`);

  let errors = [];
  // ---- activity log (app_events) and texts ----
  const ev = async (sql, ...p) => { try { return await all(sql, ...p); } catch { return []; } };
  const wk = since(7);
  const parse = (d) => { try { return JSON.parse(d || '{}'); } catch { return {}; } };
  const linkRows = (await ev("SELECT ref, detail, at FROM app_events WHERE kind = 'link' AND at > ? ORDER BY at DESC LIMIT 400", wk)).map((r) => ({ ...r, d: parse(r.detail) }));
  const linkFails = linkRows.filter((r) => !r.d.price || !r.d.photo || !r.d.name);
  const texts = await ev('SELECT status, COUNT(*) AS n FROM texts WHERE created_at > ? GROUP BY status', wk);
  const textFails = await ev("SELECT to_phone, kind, created_at FROM texts WHERE status = 'failed' ORDER BY created_at DESC LIMIT 10");
  const payFails = await ev("SELECT e.at, e.detail, u.name FROM app_events e LEFT JOIN users u ON u.id = e.user_id WHERE e.kind = 'pay_fail' ORDER BY e.at DESC LIMIT 10");
  const payoutFails = await ev("SELECT e.at, e.detail, u.name FROM app_events e LEFT JOIN users u ON u.id = e.user_id WHERE e.kind = 'payout_fail' ORDER BY e.at DESC LIMIT 10");
  const giftsDays = await ev(`SELECT c.created_at, c.amount_cents FROM contributions c JOIN users u ON u.id = c.giver_id WHERE ${REAL} AND c.created_at > ?`, since(14));
  const gdays = days.map((d, i) => { const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - (13 - i)); const t = start.getTime(); const g = giftsDays.filter((r) => Number(r.created_at) >= t && Number(r.created_at) < t + DAY); return { label: d.label, n: g.length, cents: g.reduce((a, r) => a + Number(r.amount_cents), 0) }; });
  const maxG = Math.max(1, ...gdays.map((d) => d.n));
  const views = await ev("SELECT e.detail, COUNT(*) AS n FROM app_events e WHERE e.kind = 'list_view' AND e.at > ? GROUP BY e.detail", wk);
  const topViewed = await ev("SELECT l.title, l.slug, COUNT(*) AS n FROM app_events e JOIN lists l ON l.id = e.ref WHERE e.kind = 'list_view' AND e.at > ? GROUP BY l.title, l.slug ORDER BY n DESC LIMIT 5", wk);
  const outbound = await ev("SELECT detail, COUNT(*) AS n FROM app_events WHERE kind = 'outbound' AND at > ? GROUP BY detail ORDER BY n DESC LIMIT 8", wk);
  const signups = await ev("SELECT detail, COUNT(*) AS n FROM app_events WHERE kind = 'signup' AND at > ? GROUP BY detail", wk);
  const feed = (await ev(`SELECT * FROM (
      SELECT u.created_at AS at, 'joined' AS what, u.name AS who, '' AS thing FROM users u WHERE ${REAL}
      UNION ALL SELECT l.created_at, 'made a list', u.name, l.title FROM lists l JOIN users u ON u.id = l.owner_id WHERE ${REAL}
      UNION ALL SELECT i.created_at, 'added', u.name, i.name FROM items i JOIN lists l ON l.id = i.list_id JOIN users u ON u.id = l.owner_id WHERE ${REAL}
      UNION ALL SELECT c.created_at, 'gave toward', u.name, i.name FROM contributions c JOIN items i ON i.id = c.item_id JOIN users u ON u.id = c.giver_id WHERE ${REAL}
      UNION ALL SELECT p.created_at, 'cashed out', u.name, '' FROM payouts p JOIN users u ON u.id = p.user_id WHERE ${REAL}
    ) x ORDER BY at DESC LIMIT 30`));
  const cnt = (rows, key) => Number(rows.find((r) => r.detail === key || r.status === key)?.n || 0);
  const when = (t) => new Date(Number(t)).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  try { errors = await all('SELECT * FROM app_errors ORDER BY at DESC LIMIT 25'); } catch {}

  const card = { border: '1.5px solid #000', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4, background: '#fff' };
  const big = { fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' };
  const small = { fontSize: 12, color: '#4A4A4A' };
  const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '–');

  return (
    <main className="r3-full dk-wide" style={{ background: '#ECECEF', color: '#000', padding: '20px 16px 120px', display: 'flex', flexDirection: 'column', gap: 26 }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em' }}>Only you see this</span>
        <h1 style={{ margin: 0, fontSize: 40, fontWeight: 400, letterSpacing: '-0.03em' }}>The <span className="serif" style={{ fontStyle: 'italic' }}>numbers</span></h1>
        <span style={small}>Real people only; demo accounts are left out. Visits and pages are in Vercel → Analytics.</span>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
        <div style={card}><span style={small}>People</span><span style={big}>{users}</span><span style={small}>+{users7} this week</span></div>
        <div style={card}><span style={small}>Lists</span><span style={big}>{lists}</span><span style={small}>{items} wishes</span></div>
        <div style={card}><span style={small}>Gifts</span><span style={big}>{Number(gifts.n)}</span><span style={small}>{usd(Number(gifts.cents))} given</span></div>
        <div style={card}><span style={small}>Cashed out</span><span style={big}>{usd(Number(payouts.gross))}</span><span style={small}>{usd(Number(payouts.fee))} in fees</span></div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Where people drop off</h2>
        {funnel.map(([label, v]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 150, flexShrink: 0, fontSize: 14 }}>{label}</span>
            <span style={{ flexGrow: 1, height: 18, background: '#fff', border: '1px solid #000', position: 'relative' }}><span style={{ position: 'absolute', inset: 0, width: pct(v, users) === '–' ? 0 : pct(v, users), background: '#13286B' }} /></span>
            <span style={{ width: 70, textAlign: 'right', fontSize: 14, fontWeight: 700 }}>{v} <span style={{ fontWeight: 400, ...small }}>{pct(v, users)}</span></span>
          </div>
        ))}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Sign-ups, last 14 days</h2>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 110 }}>
          {days.map((d) => (
            <div key={d.label} title={`${d.label}: ${d.n}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 11 }}>{d.n || ''}</span>
              <span style={{ width: '100%', height: `${(d.n / maxDay) * 80}%`, minHeight: d.n ? 3 : 1, background: d.n ? '#13286B' : '#bbb' }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', ...small }}><span>{days[0].label}</span><span>Today</span></div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Recent activity</h2>
        <div style={{ background: '#fff', border: '1px solid #000', fontSize: 13 }}>
          {feed.length ? feed.map((f, i) => <div key={i} style={{ padding: '7px 10px', borderTop: i ? '1px solid #ddd' : 0 }}><span style={{ color: '#4A4A4A' }}>{when(f.at)}</span> · <b>{f.who || 'Someone'}</b> {f.what} {f.thing ? <i>{String(f.thing).slice(0, 60)}</i> : null}</div>) : <div style={{ padding: 10, ...small }}>Nothing yet.</div>}
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Sharing, last 7 days</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          <div style={card}><span style={small}>List views by visitors</span><span style={big}>{cnt(views, 'visitor')}</span><span style={small}>not signed in</span></div>
          <div style={card}><span style={small}>List views by members</span><span style={big}>{cnt(views, 'signed_in')}</span><span style={small}>signed in, not the owner</span></div>
          <div style={card}><span style={small}>Sign-ups from a shared link</span><span style={big}>{cnt(signups, 'from_share')}</span><span style={small}>{cnt(signups, 'direct')} signed up directly</span></div>
        </div>
        <div style={{ fontSize: 13 }}>Store link clicks: <b>{outbound.reduce((a, r) => a + Number(r.n), 0)}</b>{outbound.length ? ' · ' + outbound.map((r) => `${String(r.detail).replace(/^www\./, '')} ${Number(r.n)}`).join(' · ') : ''}</div>
        {topViewed.length ? <div style={{ fontSize: 13 }}>Most viewed: {topViewed.map((t, i) => <span key={t.slug}>{i ? ' · ' : ''}<a href={`/l/${t.slug}`} style={{ color: '#000' }}>{t.title}</a> ({Number(t.n)})</span>)}</div> : null}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Gifts, last 14 days</h2>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 110 }}>
          {gdays.map((d) => (
            <div key={d.label} title={`${d.label}: ${d.n} gifts, ${usd(d.cents)}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 11 }}>{d.n || ''}</span>
              <span style={{ width: '100%', height: `${(d.n / maxG) * 80}%`, minHeight: d.n ? 3 : 1, background: d.n ? '#E8642C' : '#bbb' }} />
            </div>
          ))}
        </div>
        <h3 style={{ margin: '8px 0 0', fontSize: 15 }}>Payments that failed ({payFails.length})</h3>
        {payFails.length ? payFails.map((f, i) => <div key={i} style={{ fontSize: 13 }}>{when(f.at)} · {f.name || 'Someone'} · <span style={{ color: '#B3261E' }}>{String(f.detail).slice(0, 140)}</span></div>) : <span style={small}>None.</span>}
        <h3 style={{ margin: '8px 0 0', fontSize: 15 }}>Cash-outs that failed ({payoutFails.length})</h3>
        {payoutFails.length ? payoutFails.map((f, i) => <div key={i} style={{ fontSize: 13 }}>{when(f.at)} · {f.name || 'Someone'} · <span style={{ color: '#B3261E' }}>{String(f.detail).slice(0, 140)}</span></div>) : <span style={small}>None.</span>}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Store links, last 7 days</h2>
        <span style={{ fontSize: 14 }}>{linkRows.length} read · <b>{linkFails.length}</b> missing something {linkRows.length ? `(${Math.round(((linkRows.length - linkFails.length) / linkRows.length) * 100)}% complete)` : ''}</span>
        {linkFails.slice(0, 25).map((r, i) => (
          <div key={i} style={{ fontSize: 13, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ color: '#4A4A4A' }}>{when(r.at)}</span>
            <b>{r.d.host || ''}</b>
            <span style={{ color: '#B3261E' }}>missing {[!r.d.name && 'name', !r.d.price && 'price', !r.d.photo && 'photo'].filter(Boolean).join(', ')}</span>
            <a href={r.ref} target="_blank" rel="noreferrer" style={{ color: '#000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 360 }}>{r.ref}</a>
          </div>
        ))}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Texts, last 7 days</h2>
        <span style={{ fontSize: 14 }}>{['sent', 'failed', 'test', 'held'].map((k) => `${cnt(texts, k)} ${k}`).join(' · ')}</span>
        <span style={small}>"test" means test mode (shown in the Outbox, not texted). "held" means texting isn't switched on.</span>
        {textFails.map((t, i) => <div key={i} style={{ fontSize: 13 }}>{when(t.created_at)} · {t.kind} to ••{String(t.to_phone).slice(-4)} <span style={{ color: '#B3261E' }}>failed</span></div>)}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Recent errors ({errors.length})</h2>
        {errors.length ? errors.map((e) => (
          <details key={e.id} style={{ background: '#fff', border: '1px solid #000', padding: '8px 10px', fontSize: 13 }}>
            <summary style={{ cursor: 'pointer' }}>{new Date(Number(e.at)).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · {e.method} {e.path} · <b>{String(e.message).slice(0, 120)}</b>{e.digest ? ` · digest ${e.digest}` : ''}</summary>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, margin: '8px 0 0' }}>{e.stack}</pre>
          </details>
        )) : <span style={small}>None so far.</span>}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>People ({people.length})</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13, background: '#fff' }}>
            <thead><tr>{['Name', 'Phone', 'Joined', 'Lists', 'Wishes', 'Received', 'Given'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1.5px solid #000', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id}>
                  <td style={{ padding: '7px 10px', borderBottom: '1px solid #ddd', whiteSpace: 'nowrap' }}><a href={`/u/${p.id}`} style={{ color: '#000' }}>{p.name || '(no name)'}</a></td>
                  <td style={{ padding: '7px 10px', borderBottom: '1px solid #ddd', whiteSpace: 'nowrap' }}>{p.phone}</td>
                  <td style={{ padding: '7px 10px', borderBottom: '1px solid #ddd', whiteSpace: 'nowrap' }}>{new Date(Number(p.created_at)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                  <td style={{ padding: '7px 10px', borderBottom: '1px solid #ddd' }}>{Number(p.lists)}</td>
                  <td style={{ padding: '7px 10px', borderBottom: '1px solid #ddd' }}>{Number(p.items)}</td>
                  <td style={{ padding: '7px 10px', borderBottom: '1px solid #ddd' }}>{usd(Number(p.received))}</td>
                  <td style={{ padding: '7px 10px', borderBottom: '1px solid #ddd' }}>{usd(Number(p.given))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
