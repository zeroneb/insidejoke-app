import Link from 'next/link';
import { Avatar } from '@/components/ui';

// Bottom bar from the Option 10 Home board, plus a fifth tab: you.
// Sits on every signed-in page except full-screen moments (Sent, Contribute, Treat).
const W = '#FFFFFF', NAVY = '#13286B', LIME = '#D4FA4F';

function Tab({ href, label, active, children }) {
  return (
    <Link href={href} aria-label={label} aria-current={active ? 'page' : undefined} className="navtab" style={{ background: active ? LIME : 'transparent' }}>
      {children}
    </Link>
  );
}

export default function Nav({ me, active = '', addHref = '/lists/new' }) {
  const ink = (k) => (active === k ? NAVY : W);
  return (
    <nav aria-label="Main" className="nav">
      <Tab href="/home" label="Home" active={active === 'home'}>
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={ink('home')} strokeWidth="2" strokeLinecap="round"><path d="M5 7h14" /><path d="M5 12h14" /><path d="M5 17h9" /></svg>
      </Tab>
      <Tab href="/friends" label="Friends" active={active === 'friends'}>
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={ink('friends')} strokeWidth="1.9" strokeLinecap="round"><circle cx="9" cy="9" r="3" /><circle cx="17" cy="10" r="2.4" /><path d="M3 19c1-3 3.4-4.5 6-4.5s5 1.5 6 4.5" /><path d="M15 15c2.6 0 4.6 1.4 5.4 4" /></svg>
      </Tab>
      <Tab href={addHref} label="Add an item" active={active === 'add'}>
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={ink('add')} strokeWidth="2" strokeLinecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
      </Tab>
      <Tab href="/wallet" label="Wallet" active={active === 'wallet'}>
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={ink('wallet')} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H3z" /><path d="M3 7l12-4v4" /><circle cx="16" cy="13.5" r="1.4" /></svg>
      </Tab>
      <Link href="/you" aria-label="You" aria-current={active === 'you' ? 'page' : undefined} className="navtab">
        <span style={{ width: 42, height: 42, borderRadius: '50%', border: active === 'you' ? '2px solid #D4FA4F' : '2px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {me?.photo ? <img src={me.photo} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} /> : <Avatar user={me} size={30} owner />}
        </span>
      </Link>
    </nav>
  );
}
