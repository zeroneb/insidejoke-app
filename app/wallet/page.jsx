// r3: Option 10 CashOut. One list at a time. Only the owner ever sees these amounts.
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { walletByList, payoutMethod } from '@/lib/wallet';
import { tri } from '@/lib/blob';
import { usd } from '@/components/wallet-ui';
import { R3Boil } from '@/components/r3';
import CashOutForm from './cash-out-form';
import { closeListForCashOut } from '@/lib/actions-r3';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Wallet · insidejoke' };

const V = '#3B12D9', Y = '#E6F98A';
const whole = (c) => usd(c, { whole: true });

export default async function WalletPage({ searchParams }) {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/wallet');
  const sp = await searchParams;
  const lists = await walletByList(me.id);
  const pm = await payoutMethod(me.id);
  const cur = lists.find((l) => l.list.id === sp?.l) || lists[0] || null;
  const ownN = lists.filter((l) => !l.shared).length, sharedN = lists.length - ownN;
  const chipLabel = (l) => (l.shared ? (sharedN === 1 ? 'Collab list' : l.list.title) : ownN === 1 ? 'Your list' : l.list.title);
  const dest = pm ? pm.label.replace(/\s+(checking|savings)\b/i, '') : null;

  const header = (
    <>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '12px 20px 0 8px', fontSize: 13, fontWeight: 600 }}>
        <Link href="/home" aria-label="Back" style={{ width: 44, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={V} strokeWidth="2.2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></Link>
        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{!cur ? 'Your wallet' : cur.shared ? `${cur.list.title} · collab list` : `Your wallet · ${cur.list.title}`}</span>
      </header>
      {lists.length > 1 ? (
        <nav aria-label="Which list" style={{ display: 'flex', gap: 6, padding: '6px 20px 8px', overflowX: 'auto' }}>
          {lists.map((l) => {
            const on = l === cur;
            return <Link key={l.list.id} href={`/wallet?l=${l.list.id}`} aria-current={on ? 'page' : undefined} scroll={false} style={{ flexShrink: 0, border: `1.5px solid ${V}`, background: on ? V : 'transparent', color: on ? Y : V, textDecoration: 'none', fontWeight: 700, fontSize: 13, padding: '7px 14px', borderRadius: 999, whiteSpace: 'nowrap' }}>{chipLabel(l)}</Link>;
          })}
        </nav>
      ) : <div style={{ height: 8 }} />}
      <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', padding: '4px 20px 0' }}><span style={{ width: 2, height: 10, background: V }} /><span style={{ flexGrow: 1, height: 1.5, background: V }} /><span style={{ width: 2, height: 10, background: V }} /></div>
    </>
  );

  const bars = (a, b) => (
    <section style={{ padding: '28px 0 0', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <h1 style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <span className="r3-grow" style={{ marginLeft: 80, background: V, color: Y, fontWeight: 600, fontSize: 50, lineHeight: 1, padding: '6px 12px 4px', letterSpacing: '-0.02em' }}>{a}</span>
        <span className="r3-grow" style={{ background: V, color: Y, fontWeight: 600, fontSize: 50, lineHeight: 1, padding: '4px 20px 8px', letterSpacing: '-0.02em', animationDelay: '.15s' }}>{b}</span>
      </h1>
    </section>
  );
  const blobAmt = (cents, line) => (
    <section style={{ padding: '34px 20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', width: '100%' }}>
        <R3Boil paths={tri(5)} color="#FFFFFF" style={{ left: '50%', marginLeft: -165, top: -34 }} width={330} height={150} />
        <span className="dot r3-flick" style={{ position: 'relative', fontSize: whole(cents).length > 6 ? 60 : 72, lineHeight: 1 }}>{whole(cents)}</span>
      </div>
      <span style={{ position: 'relative', fontWeight: 600, fontSize: 15, marginTop: 30 }}>{line}</span>
    </section>
  );

  if (!cur) {
    return (
      <main className="r3-full" style={{ background: Y, color: V, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        {header}
        {bars('NOTHING', 'TO CASH OUT')}
        {blobAmt(0, 'Nothing waiting right now')}
        <section style={{ margin: '26px 20px 0', padding: '14px 0', borderTop: `1.5px solid ${V}`, borderBottom: `1.5px solid ${V}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.4 }}>When friends contribute or treat you, it lands here. Everything you have cashed out is in your history.</p>
        </section>
        <div style={{ padding: '26px 16px 34px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Link href="/wallet/history" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', border: `1.5px solid ${V}`, color: V, fontWeight: 800, fontSize: 17, padding: '16px 0', borderRadius: 999 }}>See your history</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="r3-full dk-wide wal-page" style={{ background: Y, color: V, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      {header}
      <div className="wal-cols">
      <div className="wal-hero">
      {cur.cents ? bars('READY', 'TO CASH OUT') : bars('NOTHING', 'READY YET')}
      {blobAmt(cur.cents, cur.cents ? (cur.shared ? `from ${cur.givers} ${cur.givers === 1 ? 'person' : 'people'} who gave` : `from ${cur.givers} ${cur.givers === 1 ? 'friend' : 'friends'}, with love`) : 'Gifts on wishes still filling are waiting')}

      </div>
      <div className="wal-side">
      {cur.cents ? (
      <>
      <section aria-label="What is in it" style={{ padding: '30px 20px 0', display: 'flex', flexDirection: 'column' }}>
        {cur.rows.map((r) => (
          <div key={r.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '13px 0', borderTop: `1.5px solid ${V}` }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}><span style={{ fontWeight: 800, fontSize: 16 }}>{r.name}</span><span style={{ fontSize: 12 }}>{r.sub}</span></span>
            <span className="dot" style={{ flexShrink: 0, fontSize: 20 }}>{whole(r.cents)}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderTop: `1.5px solid ${V}`, borderBottom: `1.5px solid ${V}` }}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontWeight: 800, fontSize: 16 }}>Processing fee</span><span style={{ fontSize: 12 }}>7%, taken once, at cash-out</span></span>
          <span className="dot" style={{ fontSize: 20 }}>{usd(-cur.fee)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0 0' }}>
          <span className="wide" style={{ fontSize: 15, letterSpacing: '0.1em' }}>You get</span>
          <span className="dot" style={{ fontSize: 30 }}>{usd(cur.net)}</span>
        </div>
      </section>

      <section style={{ padding: '26px 20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <p style={{ margin: 0, textAlign: 'center', fontSize: 15, lineHeight: 1.4 }}><span style={{ background: V, color: Y, padding: '2px 6px', WebkitBoxDecorationBreak: 'clone', boxDecorationBreak: 'clone' }}>Your friends paid nothing extra. Every dollar they gave reached you.</span></p>
      </section>

      </>
      ) : null}
      {cur.waiting ? (
        <section aria-label="Waiting" style={{ margin: '22px 20px 0', padding: '14px 16px', border: `1.5px dashed ${V}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}><span style={{ fontWeight: 800, fontSize: 16 }}>Waiting on {cur.waitingWishes} {cur.waitingWishes === 1 ? 'wish' : 'wishes'} still filling</span><span className="dot" style={{ fontSize: 20, flexShrink: 0 }}>{whole(cur.waiting)}</span></span>
          <span style={{ fontSize: 13, lineHeight: 1.45 }}>Friends gave toward these things, so the money unlocks when each one is covered, or when the list closes{cur.list.date ? ` (${cur.list.date})` : ''}. Close it now to cash out everything.</span>
          <form action={closeListForCashOut}><input type="hidden" name="listId" value={cur.list.id} /><button style={{ border: `1.5px solid ${V}`, background: 'transparent', color: V, fontFamily: 'inherit', fontWeight: 800, fontSize: 14, padding: '10px 16px', borderRadius: 999, cursor: 'pointer' }}>Close the list and unlock it</button></form>
        </section>
      ) : null}
      {cur.cents ? (
      <CashOutForm key={cur.list.id} listId={cur.list.id} shared={cur.shared || cur.closed} net={usd(cur.net)} dest={dest} card={pm?.kind === 'card'} />
      ) : null}
      </div>
      </div>
    </main>
  );
}
