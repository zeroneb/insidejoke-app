// a3: Option 13 History. Received / Given / Cashed out, month by month. Only the owner sees amounts.
import Link from 'next/link';
import { redirect } from 'next/navigation';
import Nav from '@/components/nav';
import { Avatar } from '@/components/ui';
import { currentUser } from '@/lib/auth';
import { historyFor, walletSummary } from '@/lib/wallet';
import { WalletHeader, BankIcon, usd } from '@/components/wallet-ui';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'History · insidejoke' };

const first = (n) => ((n || 'A friend').trim().split(/\s+/)[0]);
const day = (t) => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const monthOf = (t) => {
  const d = new Date(t);
  const m = d.toLocaleDateString('en-US', { month: 'long' });
  return d.getFullYear() === new Date().getFullYear() ? m : `${m} ${d.getFullYear()}`;
};
const FILTERS = [['all', 'All'], ['in', 'Received'], ['out', 'Given'], ['cash', 'Cash-outs']];

const LockLine = () => (
  <><span aria-hidden="true">·</span><svg role="img" aria-label="Private" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4A4A4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="1" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg><span>Private</span></>
);

export default async function HistoryPage({ searchParams }) {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/wallet/history');
  const sp = await searchParams;
  const filter = FILTERS.some(([k]) => k === sp?.f) ? sp.f : 'all';
  const { received, given, payouts } = await historyFor(me.id);
  const w = await walletSummary(me.id);

  const recTotal = received.reduce((s, r) => s + r.amount_cents, 0);
  const givTotal = given.reduce((s, r) => s + r.amount_cents, 0);
  const cashTotal = payouts.reduce((s, p) => s + p.net_cents, 0);
  const max = Math.max(1, recTotal, givTotal, cashTotal);
  const pct = (v) => (v > 0 ? Math.max(2, Math.round((v / max) * 100)) : 0) + '%';
  const recFriends = new Set(received.map((r) => r.giver_id)).size;
  const recLists = new Set(received.map((r) => r.list_id)).size;
  const givFriends = new Set(given.map((r) => r.owner_id)).size;
  const totals = [
    { label: 'Received', amt: usd(recTotal), sub: recTotal ? `From ${recFriends} ${recFriends === 1 ? 'friend' : 'friends'}, across ${recLists} ${recLists === 1 ? 'list' : 'lists'}` : 'Nothing yet', w: pct(recTotal), bar: '#D4FA4F', ink: '#000000', delay: '0s' },
    { label: 'Given', amt: usd(givTotal), sub: givTotal ? `To ${givFriends} ${givFriends === 1 ? 'friend' : 'friends'}` : 'Nothing yet', w: pct(givTotal), bar: '#000000', ink: '#000000', delay: '.1s' },
    { label: 'Cashed out', amt: usd(cashTotal), sub: (payouts.length ? (payouts.length === 1 ? `Once, on ${day(payouts[0].created_at)}. ` : `${payouts.length} times, last on ${day(payouts[0].created_at)}. `) : 'Not yet. ') + `${usd(w.gross)} still in your wallet`, w: pct(cashTotal), bar: '#13286B', ink: '#13286B', delay: '.2s' }
  ];

  const events = [];
  for (const r of received) {
    const treat = r.quantity === 0;
    events.push({ kind: 'in', at: r.created_at, key: 'r' + r.id, person: { id: r.giver_id, name: r.name, color: r.color, seed: r.seed, photo: r.photo },
      title: `${first(r.name)} ${treat ? 'treated you' : 'chipped in'}`,
      what: treat ? `${r.item_name}${r.units > 1 ? ` ×${r.units}` : ''}${r.store ? ` from ${r.store}` : ''}` : `Toward your ${r.item_name}`,
      amt: '+' + usd(r.amount_cents), priv: r.visibility === 'private', ink: '#000000' });
  }
  for (const g of given) {
    const treat = g.quantity === 0;
    const forName = g.for_who === 'other' && g.recipient_name ? g.recipient_name : first(g.name);
    const outright = !treat && g.before_cents === 0 && g.amount_cents >= g.price_cents * Math.max(1, g.quantity);
    events.push({ kind: 'out', at: g.created_at, key: 'g' + g.id, person: { id: g.owner_id, name: g.name, color: g.color, seed: g.seed, photo: g.photo },
      title: treat ? `You treated ${forName}` : outright ? `You got it for ${forName}` : `You chipped in for ${forName}`,
      what: treat || outright ? `${g.item_name}${g.units > 1 ? ` ×${g.units}` : ''}${g.store ? ` from ${g.store}` : ''}${outright ? ', outright' : ''}` : `Toward the ${g.item_name}`,
      amt: usd(-g.amount_cents), priv: g.visibility === 'private', ink: '#000000' });
  }
  for (const p of payouts) {
    events.push({ kind: 'cash', at: p.created_at, key: 'p' + p.id, bank: true,
      title: `You cashed out to ${p.method_label}`,
      what: `${usd(p.gross_cents)} minus the 5% fee (${usd(p.fee_cents)})`,
      amt: usd(p.net_cents), priv: true, ink: '#13286B' });
  }
  events.sort((a, b) => b.at - a.at);
  const shown = events.filter((e) => filter === 'all' || e.kind === filter);
  let lastMonth = '';

  return (
    <main className="withnav" style={{ background: '#ECECEF', color: '#000000', display: 'flex', flexDirection: 'column', flexGrow: 1, paddingBottom: 0 }}>
      <WalletHeader active="history" />
      <section style={{ padding: '22px 20px 0' }}>
        <h1 style={{ margin: 0, fontWeight: 400, fontSize: 46, lineHeight: 0.96, letterSpacing: '-0.03em' }}>Your <span className="serif" style={{ fontStyle: 'italic', letterSpacing: 0 }}>history</span></h1>
        <p style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.5 }}><span style={{ background: '#13286B', color: '#FFFFFF', padding: '2px 7px 3px', WebkitBoxDecorationBreak: 'clone', boxDecorationBreak: 'clone' }}>Only you see these amounts.</span> Friends see “covered” and “×N”, never a number.</p>
      </section>

      <section aria-label="Totals" style={{ margin: '28px 20px 0', display: 'flex', flexDirection: 'column' }}>
        {totals.map((t) => (
          <div key={t.label} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 0', borderTop: '1px solid #000000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em' }}>{t.label}</span><span className="dot" style={{ fontSize: 22, color: t.ink }}>{t.amt}</span></div>
            <div aria-hidden="true" style={{ height: 10, background: '#FFFFFF' }}><div className="a3-grow" style={{ height: '100%', width: t.w, background: t.bar, animationDelay: t.delay }} /></div>
            <span style={{ fontSize: 12, color: '#4A4A4A' }}>{t.sub}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid #000000' }} />
      </section>

      <section style={{ padding: '28px 20px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div role="group" aria-label="Show" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {FILTERS.map(([k, label]) => {
            const on = filter === k;
            return <Link key={k} href={k === 'all' ? '/wallet/history' : `/wallet/history?f=${k}`} aria-current={on ? 'true' : undefined} scroll={false} style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #000000', background: on ? '#000000' : 'transparent', color: on ? '#FFFFFF' : '#000000', textDecoration: 'none', fontWeight: 700, fontSize: 13, height: 40, padding: '0 14px', borderRadius: 999, boxSizing: 'border-box' }}>{label}</Link>;
          })}
        </div>
        <div aria-label="Timeline" style={{ display: 'flex', flexDirection: 'column' }}>
          {shown.map((r, idx) => {
            const m = monthOf(r.at);
            const newMonth = m !== lastMonth; lastMonth = m;
            const more = idx < shown.length - 1 && monthOf(shown[idx + 1].at) === m;
            return (
              <div key={r.key}>
                {newMonth ? <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em', color: '#4A4A4A', padding: '18px 0 8px', display: 'flex', alignItems: 'center', gap: 10 }}><span>{m}</span><span aria-hidden="true" style={{ flexGrow: 1, height: 1, background: '#000000' }} /></span> : null}
                <div style={{ position: 'relative', display: 'flex', gap: 14, alignItems: 'flex-start', padding: '8px 0 20px' }}>
                  {more ? <span aria-hidden="true" style={{ position: 'absolute', left: 21, top: 58, bottom: 0, width: 0, borderLeft: '2px dotted #000000' }} /> : null}
                  {r.bank ? <BankIcon size={44} /> : (
                    <Link href={`/u/${r.person.id}`} aria-label={r.person.name || 'A friend'} style={{ flexShrink: 0, textDecoration: 'none', color: '#000000', display: 'block' }}><Avatar user={r.person} size={44} /></Link>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexGrow: 1, minWidth: 0, paddingTop: 2 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.3 }}>{r.title}</span>
                    <span style={{ fontSize: 14, lineHeight: 1.35 }}>{r.what}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4A4A4A', marginTop: 2 }}><span className="dot" style={{ fontSize: 13 }}>{day(r.at)}</span>{r.priv ? <LockLine /> : null}</span>
                  </div>
                  <span className="dot" style={{ flexShrink: 0, fontSize: 18, paddingTop: 4, color: r.ink }}>{r.amt}</span>
                </div>
              </div>
            );
          })}
        </div>
        {shown.length === 0 ? (
          <div style={{ padding: '24px 0 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span className="wide" style={{ fontSize: 44, lineHeight: 0.9, letterSpacing: '0.02em', color: '#13286B' }}>Nothing<br />here<br />yet</span>
            <span style={{ fontSize: 14, lineHeight: 1.45, color: '#4A4A4A' }}>Nothing of this kind so far. It shows up here the moment it happens.</span>
          </div>
        ) : null}
        <p style={{ margin: 0, paddingTop: 14, borderTop: '1px solid #000000', fontSize: 13, lineHeight: 1.45, color: '#4A4A4A' }}>Cash-outs are the only time a fee appears: <span className="dot" style={{ color: '#000000', fontSize: 14 }}>5%</span>, taken once. Friends are never charged.</p>
      </section>
      <div style={{ height: 40 }} />
      <Nav me={me} active="wallet" />
    </main>
  );
}
