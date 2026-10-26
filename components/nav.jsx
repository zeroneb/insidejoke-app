'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Avatar } from '@/components/ui';

// Bottom bar from the Option 10 Home board, plus a fifth tab: you.
// Sits on every signed-in page except full-screen moments (Sent, Contribute, Treat).
const W = '#FFFFFF', NAVY = '#13286B', LIME = '#D4FA4F';

function Tab({ href, label, short, active, children }) {
  return (
    <Link href={href} aria-label={label} aria-current={active ? 'page' : undefined} className="navtab" style={{ background: active ? LIME : 'transparent' }}>
      {children}
      <span className="navlabel" aria-hidden="true" style={{ color: active ? NAVY : W }}>{short}</span>
    </Link>
  );
}

// Pages used to render <Nav /> themselves. The bar now lives once in the root layout (GlobalNav),
// floating over every signed-in screen, so the per-page one renders nothing.
export default function Nav() { return null; }

function activeFor(path) {
  if (path.startsWith('/wallet')) return 'wallet';
  // Switched: the avatar (bottom right) opens Home, which is your profile with your lists; the first tab opens /you.
  if (path.startsWith('/you')) return 'home';
  if (path.startsWith('/home')) return 'you';
  if (path.startsWith('/friends') || path.startsWith('/u/')) return 'friends';
  if (path.startsWith('/lists/new') || /\/add$/.test(path)) return 'add';
  return '';
}

const PUBLIC_ONLY = ['/', '/menu', '/about', '/privacy', '/terms', '/signup', '/login'];

export function GlobalNav({ me }) {
  const path = usePathname() || '/';
  if (!me) {
    // Signed out: no bar on the marketing and sign-up pages; elsewhere the bar shows, and You means log in.
    if (PUBLIC_ONLY.includes(path) || path.startsWith('/reveal') || path.startsWith('/join') || path.startsWith('/dev')) return null;
  }
  const m = path.match(/^\/l\/([^/]+)/);
  const addHref = m ? `/l/${m[1]}/add` : '/lists/new';
  return <NavBar me={me} path={path} active={me ? activeFor(path) : ''} addHref={addHref} />;
}

function NavBar({ me, path = '/home', active = '', addHref = '/lists/new' }) {
  const ink = (k) => (active === k ? NAVY : W);
  return (
    <nav aria-label="Main" className="nav">
      <Link href="/" className="navlogo" aria-label="insidejoke landing page"><span className="wide" style={{ fontSize: 11, color: W, textTransform: 'none' }}>inside</span><span className="dot" style={{ fontSize: 21, color: LIME }}>joke</span></Link>
      <span className="ph-only">
      <Tab href="/you" label="Profile and settings" short="Settings" active={active === 'home'}>
        <svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={ink('home')} strokeWidth="1.73" strokeLinecap="round"><path d="M5 7h14" /><path d="M5 12h14" /><path d="M5 17h9" /></svg>
      </Tab>
      </span>
      <span className="dk-only">
      <Tab href="/you/settings" label="Settings" short="Settings" active={active === 'home'}>
        <svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={ink('home')} strokeWidth="1.73" strokeLinecap="round"><path d="M5 7h14" /><path d="M5 12h14" /><path d="M5 17h9" /></svg>
      </Tab>
      </span>
      <Tab href="/friends" label="Friends" short="Friends" active={active === 'friends'}>
        <svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={ink('friends')} strokeWidth="1.65" strokeLinecap="round"><circle cx="9" cy="9" r="3" /><circle cx="17" cy="10" r="2.4" /><path d="M3 19c1-3 3.4-4.5 6-4.5s5 1.5 6 4.5" /><path d="M15 15c2.6 0 4.6 1.4 5.4 4" /></svg>
      </Tab>
      <Tab href={addHref} label="Add an item" short="Add" active={active === 'add'}>
        <svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={ink('add')} strokeWidth="1.73" strokeLinecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
      </Tab>
      <Tab href="/wallet" label="Wallet" short="Wallet" active={active === 'wallet'}>
        <svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={ink('wallet')} strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H3z" /><path d="M3 7l12-4v4" /><circle cx="16" cy="13.5" r="1.4" /></svg>
      </Tab>
      <Link href={me ? '/home' : `/login?next=${encodeURIComponent(path)}`} aria-label={me ? 'You' : 'Log in'} aria-current={active === 'you' ? 'page' : undefined} className="navtab navme">
        <span style={{ width: 50, height: 50, borderRadius: '50%', border: active === 'you' ? '2px solid #D4FA4F' : '2px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {!me ? (
            <svg aria-hidden="true" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.66" strokeLinecap="round"><circle cx="12" cy="8.5" r="3.6" /><path d="M4.5 20c1.3-3.6 4.2-5.4 7.5-5.4s6.2 1.8 7.5 5.4" /></svg>
          ) : me.photo ? <img src={me.photo} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }} /> : <Avatar user={me} size={38} owner />}
        </span>
        <span className="navlabel" aria-hidden="true" style={{ color: W }}>{me ? 'You' : 'Log in'}</span>
      </Link>
    </nav>
  );
}
