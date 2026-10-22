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
