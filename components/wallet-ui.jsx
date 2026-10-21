// a3: shared bits for /wallet and /wallet/history (Option 13 CashOut / History).
import Link from 'next/link';

export const usd = (cents, { whole = false } = {}) => {
  const v = Math.abs(cents) / 100;
  const s = v.toLocaleString('en-US', { minimumFractionDigits: whole && cents % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 });
  return (cents < 0 ? '−$' : '$') + s;
};

// "Chase checking ••42" -> ["Chase checking", "••42"]
export function splitLabel(label = '') {
  const m = /^(.*?)\s*([·•]{2}\s*\S+)$/.exec(label);
  return m ? [m[1], m[2]] : [label, ''];
}

export function WalletHeader({ active }) {
  const seg = (on) => ({ display: 'flex', alignItems: 'center', height: 36, padding: '0 16px', textDecoration: 'none', fontWeight: 800, fontSize: 13, background: on ? '#000000' : 'transparent', color: on ? '#FFFFFF' : '#000000' });
  return (
    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px 0 8px' }}>
      <Link href="/home" aria-label="Back" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></Link>
      <nav aria-label="Wallet" style={{ display: 'flex', border: '1.5px solid #000000', borderRadius: 999, overflow: 'hidden' }}>
        {active === 'cash' ? <span aria-current="page" style={seg(true)}>Cash out</span> : <Link href="/wallet" style={seg(false)}>Cash out</Link>}
        {active === 'history' ? <span aria-current="page" style={seg(true)}>History</span> : <Link href="/wallet/history" style={seg(false)}>History</Link>}
      </nav>
    </header>
  );
}

export const BankIcon = ({ size = 40 }) => (
  <span style={{ width: size, height: size, flexShrink: 0, borderRadius: '50%', background: '#13286B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D4FA4F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10l9-6l9 6" /><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8" /><path d="M3 21h18" /></svg>
  </span>
);
