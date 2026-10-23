'use client';
// "Choose from contacts" — only on phones whose browser lets a site ask for contacts (Android Chrome today).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { addFriendsFromContacts, addFriendByPhone } from '@/lib/actions-a1';

export default function ContactsPicker() {
  const [can, setCan] = useState(false);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const [invited, setInvited] = useState({});
  useEffect(() => { try { setCan(!!(navigator.contacts && window.ContactsManager)); } catch {} }, []);
  if (!can) return null;
  const pick = async () => {
    try {
      const picked = await navigator.contacts.select(['name', 'tel'], { multiple: true });
      if (!picked?.length) return;
      setBusy(true);
      setRes(await addFriendsFromContacts(picked.map((c) => ({ name: c.name || [], tel: c.tel || [] }))));
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
      <button type="button" onClick={pick} disabled={busy} style={{ height: 52, border: '1.5px solid #000', background: '#D4FA4F', fontFamily: 'inherit', fontWeight: 800, fontSize: 16, borderRadius: 999, cursor: 'pointer', color: '#000' }}>{busy ? 'Checking…' : 'Choose from contacts'}</button>
      {res?.ok ? (
        <div role="status" style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14 }}>
          <span>{res.added.length ? <>Friends now: {res.added.map((a, i) => <span key={a.id}>{i ? ', ' : ''}<Link href={`/u/${a.id}`} style={{ fontWeight: 700 }}>{a.name}</Link></span>)}</> : 'None of them are on insidejoke yet.'}</span>
          {res.notOn.length ? <span style={{ fontWeight: 700, marginTop: 4 }}>Not on insidejoke yet</span> : null}
          {res.notOn.map((p) => (
            <span key={p.phone} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <span>{p.name}</span>
              <button type="button" disabled={!!invited[p.phone]} onClick={() => invite(p)} style={{ border: '1.5px solid #000', background: 'transparent', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, padding: '6px 14px', borderRadius: 999, cursor: 'pointer', color: '#000' }}>{invited[p.phone] === 'sent' ? 'Invited' : invited[p.phone] ? '…' : 'Invite'}</button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
