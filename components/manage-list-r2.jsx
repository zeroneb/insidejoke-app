'use client';
// r2: Manage board rows (Option 10): "..." opens Edit / Archive / Remove, toast with Undo, Archived section with Restore.

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setItemStateR2, retireItemWithGifts } from '@/lib/actions-r2';
import { ItemRow } from '@/components/owner-list';

const cell = { height: 44, border: '2px solid var(--line, #000000)', background: 'transparent', fontFamily: 'inherit', fontWeight: 800, fontSize: 13, cursor: 'pointer', color: 'var(--ink, #000000)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', boxSizing: 'border-box' };
const short = (n) => String(n || '').split(',')[0];
const money0 = (c) => '$' + (c / 100).toFixed(c % 100 ? 2 : 0);

function sub(it) {
  if (it.unlimited) return `Treat · ${money0(it.price_cents)} each`;
  const bits = ['Wish'];
  if (it.covered) bits.push('all covered');
  else if (it.givers) bits.push(`${it.givers} ${it.givers === 1 ? 'friend' : 'friends'}`);
  else if (it.photo && !it.url) bits.push('your photo, no link');
  else if (it.store) bits.push(it.store);
  return bits.join(' · ');
}

export default function ManageRows({ slug, active, archived }) {
  const router = useRouter();
  const [open, setOpen] = useState(null);
  const [toast, setToast] = useState(null);
  const [pending, start] = useTransition();
  // An item friends gave toward: ask where their gifts go before archiving or removing it.
  const [ask, setAsk] = useState(null); // { it, state }
  const [target, setTarget] = useState('');
  const others = (it) => active.filter((x) => x.id !== it.id && !x.unlimited);
  const retire = (it, state) => {
    if (it.givers && !it.covered && !it.unlimited) { setOpen(null); setTarget(others(it).find((x) => !x.covered)?.id || others(it)[0]?.id || ''); setAsk({ it, state }); return; }
    act(it, state, 'on', `${state === 'removed' ? 'Removed' : 'Archived'} "${short(it.name)}"`);
  };
  const confirm = (choice) => start(async () => {
    const { it, state } = ask;
    const r = await retireItemWithGifts(slug, it.id, state, choice, target);
    if (r?.error) { setToast({ msg: r.error }); return; }
    setAsk(null);
    setToast({ msg: choice === 'move' ? `Moved the gifts and ${state === 'removed' ? 'removed' : 'archived'} "${short(it.name)}"` : `Gifts on "${short(it.name)}" are ready to cash out` });
    router.refresh();
  });
  const act = (it, state, prev, msg) => start(async () => {
    setOpen(null);
    const r = await setItemStateR2(slug, it.id, state);
    if (r?.error) { setToast({ msg: r.error }); return; }
    setToast(msg ? { msg, undo: () => act(it, prev, state, null) } : null);
    router.refresh();
  });

  return (
    <>
      <section style={{ padding: '14px 20px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 6 }}>
          <h2 className="wide" style={{ margin: 0, fontSize: 16, letterSpacing: '0.12em' }}>On the list</h2>
          <Link href={`/l/${slug}/add`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 14, textDecoration: 'none', padding: '10px 0', color: 'var(--ink, #000000)' }}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>Add</Link>
        </div>
        {active.map((it) => {
          const isOpen = open === it.id;
          return (
            <ItemRow key={it.id} it={it} sub={sub(it)} right={
              <button type="button" onClick={() => setOpen(isOpen ? null : it.id)} aria-label={`More options for ${it.name}`} aria-expanded={isOpen} style={{ width: 40, height: 40, flexShrink: 0, border: 0, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="var(--ink, #000000)"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg></button>
            }>
              {isOpen ? (
                <div className="pop" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6, padding: '0 0 12px' }}>
                  <Link href={`/l/${slug}/i/${it.id}/edit`} style={cell}>Edit</Link>
                  <button type="button" disabled={pending} onClick={() => retire(it, 'archived')} style={{ ...cell, background: 'var(--lt, #A9CDF5)' }}>Archive</button>
                  <button type="button" disabled={pending} onClick={() => retire(it, 'removed')} style={{ ...cell, border: '2px solid #E2452B', background: 'var(--dk, #E2452B)', color: 'var(--inv-fg, #FFFFFF)' }}>Remove</button>
                </div>
              ) : null}
            </ItemRow>
          );
        })}
        {!active.length ? <p style={{ margin: 0, padding: '14px 0', borderTop: '1.5px solid var(--line, #000000)', fontSize: 14, color: 'var(--muted, #4A4A4A)' }}>Nothing on it yet.</p> : null}
      </section>

      {ask ? (
        <section role="dialog" aria-labelledby="mv-title" className="pop" style={{ margin: '18px 20px 0', border: '2.5px solid var(--line, #000000)', background: 'var(--surface, #FFFFFF)', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span id="mv-title" style={{ fontSize: 20, lineHeight: 1.15, letterSpacing: '-0.02em' }}>{ask.it.givers} {ask.it.givers === 1 ? 'friend' : 'friends'} gave toward <b>{short(ask.it.name)}</b>. Where should their gifts go?</span>
          {others(ask.it).length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label htmlFor="mv-target" style={{ fontWeight: 800, fontSize: 14 }}>Move them to another wish</label>
              <select id="mv-target" value={target} onChange={(e) => setTarget(e.target.value)} style={{ height: 48, border: '1.5px solid var(--line, #000000)', background: 'var(--surface, #FFFFFF)', fontFamily: 'inherit', fontSize: 15, padding: '0 10px', borderRadius: 0 }}>
                {others(ask.it).map((x) => <option key={x.id} value={x.id}>{x.name}{x.covered ? ' (already covered)' : ` (${x.pct}% covered)`}</option>)}
              </select>
              <button type="button" disabled={pending || !target} onClick={() => confirm('move')} style={{ height: 48, border: 0, borderRadius: 999, background: 'var(--inv-bg, #000000)', color: 'var(--inv-fg, #FFFFFF)', fontFamily: 'inherit', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>Move the gifts</button>
              <span style={{ fontSize: 12, color: 'var(--muted, #4A4A4A)' }}>Their names and notes move too. Each friend gets a quiet note that you moved their gift.</span>
            </div>
          ) : null}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--line, #000000)', paddingTop: 12 }}>
            <button type="button" disabled={pending} onClick={() => confirm('use')} style={{ height: 48, border: '2px solid var(--edge, #000000)', borderRadius: 999, background: 'transparent', fontFamily: 'inherit', fontWeight: 800, fontSize: 15, cursor: 'pointer', color: 'var(--ink, #000)' }}>Cash them out instead</button>
            <span style={{ fontSize: 12, color: 'var(--muted, #4A4A4A)' }}>The money goes to your wallet now. Each friend gets a note that you used their gift toward something else.</span>
          </div>
          <button type="button" onClick={() => setAsk(null)} style={{ border: 0, background: 'transparent', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, textDecoration: 'underline', cursor: 'pointer', alignSelf: 'center', color: 'var(--ink, #000)' }}>Keep it on the list</button>
        </section>
      ) : null}

      <section style={{ margin: '22px 20px 0', borderTop: '2.5px solid var(--line, #000000)', borderBottom: '2.5px solid var(--line, #000000)', padding: '12px 0 6px', display: 'flex', flexDirection: 'column' }}>
        <h2 className="wide" style={{ margin: '0 0 4px', fontSize: 14, letterSpacing: '0.16em' }}>Archived · {archived.length}</h2>
        <span style={{ fontSize: 12, paddingBottom: 6 }}>Hidden from friends. Contributions stay safe.</span>
        {archived.map((it) => (
          <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px dashed var(--line, #000000)', opacity: 0.75 }}>
            <span style={{ flexGrow: 1, fontWeight: 700, fontSize: 14 }}>{it.name}</span>
            <button type="button" disabled={pending} onClick={() => act(it, 'on', 'archived', `Restored "${short(it.name)}"`)} style={{ border: '2px solid var(--edge, #000000)', background: 'transparent', fontFamily: 'inherit', fontWeight: 800, fontSize: 12, padding: '8px 12px', borderRadius: 999, cursor: 'pointer', color: 'var(--ink, #000000)' }}>Restore</button>
          </div>
        ))}
      </section>

      {toast ? (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 100, zIndex: 40, display: 'flex', justifyContent: 'center', padding: '0 16px', pointerEvents: 'none' }}>
        <div className="pop" role="status" style={{ width: '100%', maxWidth: 398, pointerEvents: 'auto', background: 'var(--inv-bg, #000000)', color: 'var(--inv-fg, #FFFFFF)', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, boxSizing: 'border-box' }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{toast.msg}</span>
          {toast.undo ? <button type="button" onClick={toast.undo} style={{ border: 0, background: 'transparent', color: '#D4FA4F', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, textDecoration: 'underline', cursor: 'pointer', padding: 6 }}>Undo</button> : <button type="button" onClick={() => setToast(null)} style={{ border: 0, background: 'transparent', color: '#D4FA4F', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, cursor: 'pointer', padding: 6 }}>OK</button>}
        </div>
        </div>
      ) : null}
    </>
  );
}
