// Private numbers page for the founder. Only phones listed in ADMIN_PHONES (Vercel setting) can open it.
import { notFound } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { all, get } from '@/lib/db';
import { usd } from '@/components/wallet-ui';
import { decideReviewAction } from '@/lib/actions-review';
import { financials, byGiftType } from '@/lib/finance';
import { syncDisputes, disputesForAdmin, isOpen } from '@/lib/disputes';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin · insidejoke', robots: { index: false } };

const digits = (p) => String(p || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
const DAY = 86400000;
// Seeded demo people (555 numbers) are left out of every count.
const REAL = "u.phone NOT LIKE '+1555%'";

const n = async (sql, ...p) => Number((await get(sql, ...p))?.n || 0);

export default async function AdminPage({ searchParams }) {
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

  const range = (await searchParams)?.range === '30' ? '30' : 'all';
  const sinceMs = range === '30' ? Date.now() - 30 * DAY : 0;
  try { await syncDisputes(); } catch {}
  const disputes = await disputesForAdmin();
  const fin = await financials({ sinceMs });
  const types = await byGiftType({ sinceMs });
  const reviews = await all(`SELECT r.*, l.title, l.slug, u.name, u.phone FROM cashout_reviews r JOIN lists l ON l.id = r.list_id JOIN users u ON u.id = r.user_id WHERE r.status = 'pending' ORDER BY r.created_at ASC`);
  const reviewBtn = { height: 40, padding: '0 16px', border: '1.5px solid #000', borderRadius: 999, fontFamily: 'inherit', fontWeight: 800, fontSize: 14, cursor: 'pointer' };

  return (
    <main className="r3-full dk-wide" style={{ background: '#ECECEF', color: '#000', padding: '20px 16px 120px', display: 'flex', flexDirection: 'column', gap: 26 }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em' }}>Only you see this</span>
        <h1 style={{ margin: 0, fontSize: 40, fontWeight: 400, letterSpacing: '-0.03em' }}>The <span className="serif" style={{ fontStyle: 'italic' }}>numbers</span></h1>
        <span style={small}>Real people only; demo accounts are left out. Visits and pages are in Vercel → Analytics.</span>
      </header>

      {reviews.length ? (
        <section aria-label="Cash-outs to review" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 className="wide" style={{ margin: 0, fontSize: 14, letterSpacing: '0.14em' }}>Cash-outs to review · {reviews.length}</h2>
          <span style={small}>Paused because they look like stolen-card patterns. Nothing has been sent. Clear it if it looks like real friends giving.</span>
          {reviews.map((r) => {
            let why = []; try { why = JSON.parse(r.reasons); } catch {}
            return (
              <div key={r.id} style={{ ...card, background: '#FFF7D6', gap: 8 }}>
                <span style={{ fontWeight: 800, fontSize: 16 }}>{r.name || 'Someone'} · <a href={`/l/${r.slug}`} style={{ color: '#000' }}>{r.title}</a> · {usd(Number(r.amount_cents))}</span>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.45 }}>{why.map((w) => <li key={w}>{w}</li>)}</ul>
                <span style={small}>Paused {new Date(Number(r.created_at)).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · {r.phone}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <form action={decideReviewAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="approve" value="1" /><button style={{ ...reviewBtn, background: '#000', color: '#fff' }}>Clear it</button></form>
                  <form action={decideReviewAction}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="approve" value="0" /><button style={{ ...reviewBtn, background: 'transparent' }}>Keep holding</button></form>
                </div>
              </div>
            );
          })}
        </section>
      ) : null}

      {disputes.length ? (
        <section aria-label="Disputes" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 className="wide" style={{ margin: 0, fontSize: 14, letterSpacing: '0.14em' }}>Disputes · {disputes.filter((d) => isOpen(d.status)).length} open</h2>
          <span style={small}>Respond in Stripe before the deadline with evidence. Strong evidence: the giver verified their phone, how long they've had an account, the note they wrote, and that they know the receiver.</span>
          {disputes.map((d) => (
            <div key={d.id} style={{ ...card, background: isOpen(d.status) ? '#FFE3DE' : '#fff', gap: 6 }}>
              <span style={{ fontWeight: 800, fontSize: 16 }}>{usd(Number(d.amount_cents))} · {d.giver || 'a giver'} → {d.receiver || 'receiver'} · <a href={`/l/${d.slug}`} style={{ color: '#000' }}>{d.title}</a></span>
              <span style={{ fontSize: 14 }}>{String(d.status).replace(/_/g, ' ')}{d.reason ? ` · ${String(d.reason).replace(/_/g, ' ')}` : ''}{d.paid_out ? ' · already cashed out (comes off their next cash-out)' : ' · taken out of their wallet'}</span>
              <span style={small}>Giver {d.giver_phone || ''}{d.giver_since ? ` · on insidejoke since ${new Date(Number(d.giver_since)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}{d.note ? ` · note: “${d.note}”` : ''}</span>
              {isOpen(d.status) ? <a href={`https://dashboard.stripe.com/disputes/${d.id}`} target="_blank" rel="noreferrer" style={{ alignSelf: 'flex-start', border: '1.5px solid #000', borderRadius: 999, padding: '8px 14px', fontWeight: 800, fontSize: 14, color: '#000', textDecoration: 'none' }}>Respond in Stripe</a> : null}
            </div>
          ))}
        </section>
      ) : null}

      <section aria-label="Financial overview" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <h2 className="wide" style={{ margin: 0, fontSize: 14, letterSpacing: '0.14em' }}>Money</h2>
          <nav style={{ display: 'flex', gap: 6 }}>
            {[['all', 'All time'], ['30', 'Last 30 days']].map(([k, l]) => <a key={k} href={k === 'all' ? '/admin' : '/admin?range=30'} aria-current={range === k ? 'page' : undefined} style={{ border: '1.5px solid #000', borderRadius: 999, padding: '5px 12px', fontSize: 13, fontWeight: 700, textDecoration: 'none', background: range === k ? '#000' : 'transparent', color: range === k ? '#fff' : '#000' }}>{l}</a>)}
          </nav>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          <div style={card}><span style={small}>Gift volume</span><span style={big}>{usd(fin.gifts.cents)}</span><span style={small}>{fin.gifts.n} gifts · {fin.gifts.small} at $5 or less</span></div>
          <div style={card}><span style={small}>insidejoke revenue</span><span style={big}>{usd(fin.revenue)}</span><span style={small}>{usd(fin.platform)} from 5% · {usd(fin.cashoutFees)} cash-out fees</span></div>
          <div style={card}><span style={small}>Receiver balances</span><span style={big}>{usd(fin.owed)}</span><span style={small}>Owed to people, on {fin.owedLists} {fin.owedLists === 1 ? 'list' : 'lists'}, before fees</span></div>
          <div style={card}><span style={small}>Processing costs</span><span style={big}>{usd(fin.processing)}</span><span style={small}>{fin.processingEst ? 'Partly estimated · ' : ''}{usd(fin.recovered)} passed on at cash-out</span></div>
          <div style={card}><span style={small}>Cash-outs</span><span style={big}>{usd(fin.cashouts.cents)}</span><span style={small}>{fin.cashouts.n} sent · {usd(fin.payoutCosts)} payout costs (est.)</span></div>
          <div style={card}><span style={small}>Failed payments & refunds</span><span style={big}>{usd(fin.failed.removedCents)}</span><span style={small}>{fin.failed.removedN} removed · {fin.failed.disputes} disputes ({usd(fin.failed.disputeCost)} cost) · {fin.failed.payFails} failed payments · {fin.failed.payoutFails} failed cash-outs</span></div>
          <div style={{ ...card, background: fin.net < 0 ? '#FFE3DE' : '#E6F98A' }}><span style={small}>Net contribution</span><span style={big}>{usd(fin.net)}</span><span style={small}>Revenue minus processing, payout and account fees, on cashed-out money</span></div>
        </div>
        {fin.processingPending ? <span style={small}>{usd(fin.processingPending)} of processing is on gifts not cashed out yet. It's passed on to the receiver when they cash out.</span> : null}
        <div style={{ ...card, padding: 0, overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 560, fontSize: 14 }}>
            <thead><tr style={{ textAlign: 'right', borderBottom: '1.5px solid #000' }}>{['By gift type', 'Gifts', 'Volume', 'Avg gift', '$5 or less', 'Processing', 'Cost %', 'Expected net'].map((h, i) => <th key={h} style={{ padding: '10px 12px', fontSize: 12, fontWeight: 800, textAlign: i ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
            <tbody>
              {types.map((t) => (
                <tr key={t.key} style={{ borderTop: '1px solid #D7D7DC', textAlign: 'right' }}>
                  <td style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>{t.label}</td>
                  <td style={{ padding: '10px 12px' }}>{t.n}</td>
                  <td style={{ padding: '10px 12px' }}>{usd(t.cents)}</td>
                  <td style={{ padding: '10px 12px' }}>{usd(t.avg)}</td>
                  <td style={{ padding: '10px 12px' }}>{t.small}</td>
                  <td style={{ padding: '10px 12px' }}>{usd(t.processing)}</td>
                  <td style={{ padding: '10px 12px' }}>{t.cents ? `${(t.costPct * 100).toFixed(1)}%` : '–'}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 700, color: t.net < 0 ? '#C0261A' : '#000' }}>{usd(t.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <span style={small}>Expected net = our 5% + processing passed on − what the provider charged, earned when these gifts are cashed out. The $2.50 cash-out fee and payout costs are per cash-out, so they aren't split by type. Only settled money can be cashed out.</span>
      </section>

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
