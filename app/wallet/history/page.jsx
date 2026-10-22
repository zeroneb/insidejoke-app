// r3: Option 10 History. Every gift in and out plus cash-outs, newest first. Only the owner sees amounts.
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Avatar, shortNoun } from '@/components/ui';
import { currentUser } from '@/lib/auth';
import { historyFor } from '@/lib/wallet';
import { tri } from '@/lib/blob';
import { usd } from '@/components/wallet-ui';
import { R3Boil, iconFor, BANK_ICON } from '@/components/r3';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'History · insidejoke' };

const first = (n) => ((n || 'A friend').trim().split(/\s+/)[0]);
const day = (t) => {
  const d = new Date(t);
  const o = { month: 'short', day: 'numeric' };
  if (d.getFullYear() !== new Date().getFullYear()) o.year = 'numeric';
  return d.toLocaleDateString('en-US', o);
};
const short = (name = '') => {
  const head = name.split(/\s+(?:for|from|with|by|in)\b|,/i)[0] || name;
  return head.trim();
};

// "Ganni Western leather boots" from Ganni -> "Ganni boots"; "Wheel-throwing class for two" -> "wheel-throwing class".
const nice = (name = '', store = '') => {
  const h = short(name);
  if (store && h.toLowerCase().startsWith(store.toLowerCase() + ' ')) return `${store} ${shortNoun(h)}`;
  return /^[A-Z][a-z]/.test(h) ? h[0].toLowerCase() + h.slice(1) : h;
};

const Globe = () => <svg role="img" aria-label="Public" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4A4A4A" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c3 3 3 15 0 18" /><path d="M12 3c-3 3-3 15 0 18" /></svg>;
const Lock = () => <svg role="img" aria-label="Private" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4A4A4A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="1" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;

export default async function HistoryPage() {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/wallet/history');
  const { received, given, payouts } = await historyFor(me.id);

  const rows = [];
  for (const r of received) {
    const treat = r.quantity === 0;
    rows.push({ key: 'r' + r.id, at: r.created_at, person: { id: r.giver_id, name: r.name, color: r.color, seed: r.seed, photo: r.photo },
      from: first(r.name), to: 'You',
      what: treat ? `${r.item_name}${r.units > 1 ? ` ×${r.units}` : ''}${r.store ? ` · ${r.store}` : ''}` : `Toward your ${nice(r.item_name, r.store)}`,
      amt: '+' + usd(r.amount_cents), plus: true, priv: r.visibility === 'private', icon: iconFor(r.item_name, treat) });
  }
  for (const g of given) {
    const treat = g.quantity === 0;
    const forName = g.for_who === 'other' && g.recipient_name ? g.recipient_name : first(g.name);
    const outright = !treat && g.before_cents === 0 && g.amount_cents >= g.price_cents * Math.max(1, g.quantity);
    rows.push({ key: 'g' + g.id, at: g.created_at, person: { id: g.owner_id, name: forName, color: g.color, seed: g.seed, photo: g.photo },
      from: 'You', to: forName,
      what: treat ? `${g.item_name}${g.units > 1 ? ` ×${g.units}` : ''}` : outright ? `${short(g.item_name)}, got it outright` : `Toward ${forName}'s ${short(g.item_name)}`,
      amt: usd(-g.amount_cents), plus: false, priv: g.visibility === 'private', icon: iconFor(g.item_name, treat) });
  }
  for (const p of payouts) {
    rows.push({ key: 'p' + p.id, at: p.created_at, bank: true, from: 'You', to: (p.method_label || 'your bank').replace(/\s+(checking|savings)\b/i, ''),
      what: `Cashed out ${usd(p.gross_cents)}, minus the 7% fee (${usd(p.fee_cents)})`,
      amt: '+' + usd(p.net_cents), plus: true, priv: true, icon: BANK_ICON, iconBg: '#D4FA4F' });
  }
  rows.sort((a, b) => b.at - a.at);

  return (
    <main className="r3-full" style={{ background: '#ECECEF', color: '#000000', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 0 8px' }}>
        <Link href="/wallet" aria-label="Back to your wallet" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></Link>
        <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em' }}>Only you see this</span>
        <span style={{ width: 44 }} />
      </header>

      <section style={{ position: 'relative', padding: '22px 20px 0' }}>
        <R3Boil paths={tri(31)} color="#D8F75A" style={{ left: -10, top: 6 }} width={250} height={130} />
        <h1 style={{ position: 'relative', margin: '26px 0 0 8px', fontWeight: 400, fontSize: 46, letterSpacing: '-0.03em', lineHeight: 0.95 }}>Your <span className="serif" style={{ fontStyle: 'italic' }}>history</span></h1>
      </section>

      <section aria-label="Transactions" style={{ padding: '44px 20px 0', display: 'flex', flexDirection: 'column' }}>
        {rows.map((r) => (
          <div key={r.key} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '16px 0', borderTop: '1px solid #000000' }}>
            {r.bank ? (
              <span aria-hidden="true" style={{ width: 44, height: 44, flexShrink: 0, borderRadius: '50%', background: '#13286B', color: '#D4FA4F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 17 }}>$</span>
            ) : (
              <Link href={`/u/${r.person.id}`} aria-label={r.person.name || 'A friend'} style={{ flexShrink: 0, display: 'block', textDecoration: 'none' }}><Avatar user={r.person} size={44} /></Link>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexGrow: 1, minWidth: 0 }}>
              <span style={{ fontSize: 15, lineHeight: 1.3 }}><span style={{ fontWeight: 800 }}>{r.from}</span><span style={{ padding: '0 6px' }}>→</span><span style={{ fontWeight: 800 }}>{r.to}</span></span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4A4A4A' }}>{day(r.at)}<span aria-hidden="true">·</span>{r.priv ? <Lock /> : <Globe />}</span>
              <span style={{ fontSize: 14, lineHeight: 1.35, marginTop: 3 }}>{r.what}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
              <span className="dot" style={{ fontSize: 18, color: r.plus ? '#2E7D3E' : '#000000' }}>{r.amt}</span>
              <span style={{ width: 34, height: 34, background: r.iconBg || '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg role="img" aria-label={r.icon[0]} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#13286B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={r.icon[1]} /></svg></span>
            </div>
          </div>
        ))}
        {rows.length === 0 ? (
          <div style={{ padding: '18px 0', borderTop: '1px solid #000000', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>Nothing here yet</span>
            <span style={{ fontSize: 14, lineHeight: 1.45, color: '#4A4A4A' }}>Gifts you give and get, and every cash-out, show up here the moment they happen.</span>
          </div>
        ) : null}
        <div style={{ borderTop: '1px solid #000000' }} />
      </section>
      <div style={{ height: 40 }} />
    </main>
  );
}
