import { PhotoBlob } from '@/components/ui';

// a1: hero from Option 13 You / FriendProfile: ring text over the blob, then name + bio.
export const monthYear = (ts) => new Date(ts).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

export function NameLine({ name }) {
  const [a, ...rest] = (name || 'Someone').trim().split(/\s+/);
  return <>{a}{rest.length ? <> <span className="it">{rest.join(' ')}</span></> : null}</>;
}

export function ProfileHero({ user, owner = false, ring, uid = 'hero', children }) {
  return (
    <section style={{ position: 'relative', padding: '8px 20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10 }}>
      <div style={{ position: 'relative', width: 250, height: 250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg aria-hidden="true" style={{ position: 'absolute', inset: 0 }} width="250" height="250" viewBox="0 0 250 250">
          <defs><path id={`${uid}-ring`} d="M17 125 A108 108 0 0 1 233 125" /></defs>
          <text className="serif" style={{ fontSize: 15, letterSpacing: '0.06em', fill: '#13286B' }}><textPath href={`#${uid}-ring`} startOffset="50%" textAnchor="middle">{ring}</textPath></text>
        </svg>
        <PhotoBlob user={user} owner={owner} size={170} pad={16} uid={uid} fontSize={84} />
      </div>
      <h1 style={{ margin: '-30px 0 0', fontWeight: 400, fontSize: 44, letterSpacing: '-0.03em', lineHeight: 1 }}><NameLine name={user.name} /></h1>
      {user.bio ? <span style={{ fontSize: 15, lineHeight: 1.35 }}>{user.bio}</span> : null}
      {children}
    </section>
  );
}

export function Stats({ cells, label }) {
  return (
    <section aria-label={label} style={{ margin: '26px 20px 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderTop: '1.5px solid #000000', borderBottom: '1.5px solid #000000' }}>
      {cells.map(([n, l], k) => (
        <div key={l} style={{ padding: k ? '14px 0 14px 14px' : '14px 0 14px 2px', /* r1: 2px so the first Doto digit never touches the edge */ display: 'flex', flexDirection: 'column', gap: 2, borderRight: k < cells.length - 1 ? '1px solid #000000' : 0, minWidth: 0 }}>
          <span className="dot" style={{ fontSize: 30, color: '#E8642C', lineHeight: 1.2 }}>{n}</span><span style={{ fontSize: 13 }}>{l}</span>
        </div>
      ))}
    </section>
  );
}

export const Chevron = () => <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>;

// +1 917 555 0142
export function spacedPhone(p) {
  const d = (p || '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) return `+1 ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  return p || '';
}
