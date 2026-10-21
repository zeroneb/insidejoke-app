'use client';

// r3: Option 10 CashOut footer: archive choice (own list) + the cash-out button.
import { useActionState, useState } from 'react';
import Link from 'next/link';
import { cashOutList } from '@/lib/actions-r3';

const V = '#3B12D9', Y = '#E6F98A';

export default function CashOutForm({ listId, shared, net, dest, card }) {
  const [state, action, pending] = useActionState(cashOutList, null);
  const [arch, setArch] = useState(false);
  const note = shared
    ? 'Cashing out a collab list archives it. Everyone who gave sees it as complete.'
    : arch ? 'The list will be archived after this cash-out. You can bring it back anytime.' : 'Your list stays open. Treats and wishes keep coming in until you archive it.';
  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column' }}>
      <input type="hidden" name="listId" value={listId} />
      <input type="hidden" name="archive" value={arch ? '1' : ''} />
      <section style={{ margin: '22px 20px 0', padding: '14px 0', borderTop: `1.5px solid ${V}`, borderBottom: `1.5px solid ${V}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.4 }}>{note}</p>
        {shared ? null : (
          <button type="button" role="checkbox" aria-checked={arch} onClick={() => setArch(!arch)} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 10, border: 0, background: 'transparent', color: V, fontFamily: 'inherit', fontSize: 15, fontWeight: 600, padding: '8px 0', cursor: 'pointer' }}>
            <span style={{ width: 22, height: 22, flexShrink: 0, boxSizing: 'border-box', border: `1.5px solid ${V}`, background: arch ? V : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={arch ? Y : 'transparent'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg></span>
            Archive the list too
          </button>
        )}
      </section>
      <div style={{ padding: '26px 16px 34px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {state?.error ? <p className="err" style={{ margin: 0 }}>{state.error}</p> : null}
        {dest ? (
          <button type="submit" disabled={pending} style={{ display: 'block', width: '100%', textAlign: 'center', border: 0, background: V, color: Y, fontFamily: 'inherit', fontWeight: 800, fontSize: 17, padding: '17px 0', borderRadius: 999, cursor: 'pointer', opacity: pending ? 0.6 : 1 }}>{pending ? 'Sending…' : `Cash out ${net} to ${dest}`}</button>
        ) : (
          <Link href={`/wallet/payout?next=${encodeURIComponent('/wallet?l=' + listId)}`} style={{ display: 'block', textAlign: 'center', textDecoration: 'none', background: V, color: Y, fontWeight: 800, fontSize: 17, padding: '17px 0', borderRadius: 999 }}>Set up where it lands</Link>
        )}
        <span style={{ textAlign: 'center', fontSize: 12 }}>{!dest ? 'Once. Then cashing out is one tap.' : card ? 'Usually arrives in minutes' : 'Usually arrives in 1–2 business days'}</span>
        <Link href="/wallet/history" style={{ alignSelf: 'center', fontSize: 13, color: V, textDecoration: 'underline', textUnderlineOffset: 3, padding: '6px 10px' }}>See your history</Link>
      </div>
    </form>
  );
}
