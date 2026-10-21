// a3: Option 13 CashOut. Only the owner ever sees these amounts.
import Link from 'next/link';
import { redirect } from 'next/navigation';
import Nav from '@/components/nav';
import { currentUser } from '@/lib/auth';
import { walletSummary, payoutMethod } from '@/lib/wallet';
import { WalletHeader, BankIcon, usd, splitLabel } from '@/components/wallet-ui';
import CashOutForm from './cash-out-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Wallet · insidejoke' };

export default async function WalletPage() {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/wallet');
  const w = await walletSummary(me.id);
  const pm = await payoutMethod(me.id);
  const empty = w.gross <= 0;
  const [bank, digits] = splitLabel(pm?.label || '');
  const shared = w.lists.filter((l) => l.shared);
  const own = w.lists.filter((l) => !l.shared);

  return (
    <main className="withnav" style={{ background: '#ECECEF', color: '#000000', display: 'flex', flexDirection: 'column', flexGrow: 1, paddingBottom: 0 }}>
      <WalletHeader active="cash" />

      <section aria-label="Balance" style={{ position: 'relative', height: 300, margin: '18px 0 0', background: '#D4FA4F', overflow: 'hidden', flexShrink: 0 }}>
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: '#13286B', clipPath: 'polygon(0 0, 100% 0, 100% 34%, 0 78%)' }} />
        <div style={{ position: 'absolute', left: 20, top: 22, display: 'flex', flexDirection: 'column', gap: 10, color: '#FFFFFF' }}>
          <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em' }}>In your wallet</span>
          <span className="dot" style={{ fontSize: usd(w.gross, { whole: true }).length > 7 ? 56 : 72, lineHeight: 0.9 }}>{usd(w.gross, { whole: true })}</span>
          <span style={{ fontSize: 15 }}>{empty ? 'Nothing waiting right now' : <>from <span className="dot" style={{ fontSize: 16 }}>{w.givers}</span> {w.givers === 1 ? 'friend' : 'friends'}, across <span className="dot" style={{ fontSize: 16 }}>{w.lists.length}</span> {w.lists.length === 1 ? 'list' : 'lists'}</>}</span>
        </div>
        <div style={{ position: 'absolute', right: 20, bottom: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, color: '#13286B', textAlign: 'right' }}>
          <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em' }}>You get</span>
          <span className="dot" style={{ fontSize: 40, lineHeight: 1 }}>{usd(w.net)}</span>
          <span style={{ fontSize: 13, fontWeight: 700 }}>after the one-time <span className="dot" style={{ fontSize: 14 }}>5%</span></span>
        </div>
      </section>

      <section style={{ padding: '20px 20px 0' }}>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}><span style={{ background: '#13286B', color: '#FFFFFF', padding: '2px 7px 3px', WebkitBoxDecorationBreak: 'clone', boxDecorationBreak: 'clone' }}>5% goes to insidejoke at cash-out, nothing is charged to your friends.</span></p>
      </section>

      {empty ? (
        <section style={{ margin: '24px 20px 0', paddingTop: 16, borderTop: '1px solid #000000', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="wide" style={{ fontSize: 44, lineHeight: 0.9, letterSpacing: '0.02em', color: '#13286B' }}>Nothing<br />to cash<br />out yet</span>
          <span style={{ fontSize: 14, lineHeight: 1.45, color: '#4A4A4A' }}>When friends chip in or treat you, it lands here. Everything you have cashed out is in your history.</span>
          <Link href="/wallet/history" style={{ alignSelf: 'flex-start', marginTop: 6, textDecoration: 'none', border: '1.5px solid #000000', color: '#000000', fontWeight: 800, fontSize: 15, padding: '12px 20px', borderRadius: 999 }}>See your history</Link>
        </section>
      ) : (
        <>
          <section aria-label="What is in it" style={{ margin: '24px 20px 0', display: 'flex', flexDirection: 'column' }}>
            {w.rows.map((r) => (
              <div key={r.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '14px 0', borderTop: '1px solid #000000' }}>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}><span style={{ fontWeight: 800, fontSize: 15 }}>{r.name}</span><span style={{ fontSize: 12, color: '#4A4A4A' }}>{r.sub}</span></span>
                <span className="dot" style={{ flexShrink: 0, fontSize: 20 }}>{usd(r.cents)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '14px 0', borderTop: '1px solid #000000' }}>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}><span style={{ fontWeight: 800, fontSize: 15 }}>insidejoke fee</span><span style={{ fontSize: 12, color: '#4A4A4A' }}><span className="dot" style={{ fontSize: 13, color: '#000000' }}>5%</span>, once, only now</span></span>
              <span className="dot" style={{ fontSize: 20 }}>{usd(-w.fee)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderTop: '1.5px solid #000000', borderBottom: '1.5px solid #000000' }}>
              <span className="wide" style={{ fontSize: 12, letterSpacing: '0.18em' }}>Lands in your bank</span>
              <span className="dot" style={{ fontSize: 30, color: '#13286B' }}>{usd(w.net)}</span>
            </div>
          </section>

          <section style={{ margin: '24px 20px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em' }}>Goes to</span>
            <Link href="/wallet/payout?next=/wallet" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: '#000000', border: '1.5px solid #000000', background: '#FFFFFF', padding: '12px 14px', minHeight: 64, boxSizing: 'border-box' }}>
              <BankIcon />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1 }}>
                {pm ? <span style={{ fontWeight: 800, fontSize: 15 }}>{bank} {digits ? <span className="dot" style={{ fontSize: 15 }}>{digits}</span> : null}</span> : <span style={{ fontWeight: 800, fontSize: 15 }}>Add where it lands</span>}
                <span style={{ fontSize: 12, color: '#4A4A4A' }}>{!pm ? 'A bank account or debit card, once' : pm.kind === 'card' ? 'Usually lands in minutes' : 'Usually lands in 1–2 business days'}</span>
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3 }}>{pm ? 'Change' : 'Set up'}</span>
            </Link>
          </section>

          <CashOutForm
            net={usd(w.net)}
            method={pm ? { bank: splitLabel(pm.label)[0].split(' ')[0], digits, card: pm.kind === 'card' } : null}
            shared={shared.map((l) => ({ id: l.list.id, title: l.list.title }))}
            ownNote={own.length > 0 || shared.length === 0}
          />
        </>
      )}
      <div style={{ height: 40 }} />
      <Nav me={me} active="wallet" />
    </main>
  );
}
