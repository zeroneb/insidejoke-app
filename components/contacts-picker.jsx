'use client';
// "Choose from contacts" — only on phones whose browser lets a site ask for contacts (Android Chrome today).
// Used for adding friends, and (PickContactsButton) for adding collaborators.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { addFriendsFromContacts, addFriendByPhone } from '@/lib/actions-a1';

// Shared helper: can this browser open the phone's contact list (Contact Picker API)? iPhone Safari and laptops
// can't, and every caller keeps its type-a-number field for them.
export function useCanPickContacts() {
  const [can, setCan] = useState(false);
  useEffect(() => { try { setCan(!!(navigator.contacts && navigator.contacts.select && window.ContactsManager)); } catch {} }, []);
  return can;
}

// Opens the contact list; resolves to [{ name, tel: [...] }] (empty if cancelled or not allowed).
export async function pickContacts({ multiple = true } = {}) {
  try {
    const picked = await navigator.contacts.select(['name', 'tel'], { multiple });
    return (picked || []).map((c) => ({ name: (c.name || [])[0] || '', tel: (c.tel || []).filter(Boolean) })).filter((c) => c.tel.length);
  } catch { return []; }
}

// "Choose from contacts" button, shown only where the browser supports it. onPick gets [{ name, phone }] (first number of each).
export function PickContactsButton({ onPick, multiple = true, label = 'Choose from contacts', style }) {
  const can = useCanPickContacts();
  if (!can) return null;
  return (
    <button type="button" onClick={async () => { const got = await pickContacts({ multiple }); if (got.length) onPick(got.map((c) => ({ name: c.name, phone: c.tel[0] }))); }}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, border: '1.5px solid var(--edge, #000)', background: 'var(--lt, #D4FA4F)', fontFamily: 'inherit', fontWeight: 800, fontSize: 15, borderRadius: 999, cursor: 'pointer', color: '#000000', padding: '0 18px', ...style }}>
      <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1-3.6 3.8-5.5 7-5.5s6 1.9 7 5.5" /></svg>
      {label}
    </button>
  );
}

export default function ContactsPicker() {
  const can = useCanPickContacts();
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const [invited, setInvited] = useState({});
  if (!can) return null;
  const pick = async () => {
    try {
      const picked = await pickContacts({ multiple: true });
      if (!picked?.length) return;
      setBusy(true);
      setRes(await addFriendsFromContacts(picked.map((c) => ({ name: [c.name], tel: c.tel }))));
    } catch {} finally { setBusy(false); }
  };
  const invite = async (p) => {
    const fd = new FormData(); fd.set('phone', p.phone);
    setInvited((x) => ({ ...x, [p.phone]: 'sending' }));
    await addFriendByPhone(null, fd);
    setInvited((x) => ({ ...x, [p.phone]: 'sent' }));
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button type="button" onClick={pick} disabled={busy} style={{ height: 52, border: '1.5px solid var(--edge, #000)', background: 'var(--lt, #D4FA4F)', fontFamily: 'inherit', fontWeight: 800, fontSize: 16, borderRadius: 999, cursor: 'pointer', color: 'var(--ink, #000)' }}>{busy ? 'Checking…' : 'Choose from contacts'}</button>
      {res?.ok ? (
        <div role="status" style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
          <span>{res.added.length ? <>Friends now: {res.added.map((a, i) => <span key={a.id}>{i ? ', ' : ''}<Link href={`/u/${a.id}`} style={{ fontWeight: 700 }}>{a.name}</Link></span>)}</> : 'None of them are on insidejoke yet.'}</span>
          {res.notOn.length ? <span style={{ fontWeight: 700, marginTop: 4 }}>Not on insidejoke yet</span> : null}
          {res.notOn.map((p) => (
            <span key={p.phone} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <span>{p.name}</span>
              <button type="button" disabled={!!invited[p.phone]} onClick={() => invite(p)} style={{ border: '1.5px solid var(--edge, #000)', background: 'transparent', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, padding: '6px 14px', borderRadius: 999, cursor: 'pointer', color: 'var(--ink, #000)' }}>{invited[p.phone] === 'sent' ? 'Invited' : invited[p.phone] ? '…' : 'Invite'}</button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
