import { LEGAL } from '@/components/legal';
import Link from 'next/link';
import { Blob } from '@/components/ui';

const SOCIALS = [
  ['Instagram', '@clubinsidejoke', 'https://instagram.com/clubinsidejoke'],
  ['X / Twitter', '@clubinsidejoke', 'https://x.com/clubinsidejoke']
];

export const metadata = { title: 'Menu · insidejoke' };

export default function Menu() {
  return (
    <main className="menu">
      <header className="hdr" style={{ padding: '14px 12px 14px 20px' }}>
        <Link href="/" style={{ textDecoration: 'none', color: '#fff', fontSize: 22 }}><span className="wide" style={{ fontSize: 20, textTransform: 'none' }}>inside</span><span className="dot" style={{ fontSize: 24, color: '#D4FA4F' }}>joke</span></Link>
        <Link href="/" aria-label="Close menu" className="iconbtn">
          <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg>
        </Link>
      </header>

      <section className="pop" style={{ position: 'relative', padding: '22px 20px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Blob seed={14} color="#D8F75A" width={210} height={96} style={{ left: -6, top: 32 }} />
        <Link href="/login" style={{ position: 'relative', margin: '34px 0 0 14px', textDecoration: 'none', color: '#000', fontSize: 44, letterSpacing: '-0.03em', lineHeight: 1 }}>Log <span className="it" style={{ fontSize: 48 }}>in</span></Link>
        <span style={{ position: 'relative', marginTop: 34, fontSize: 14, color: '#DCE3FF' }}>Your phone number is your account. We'll text you a code.</span>
        <Link href="/signup" style={{ alignSelf: 'flex-start', textDecoration: 'none', background: '#fff', color: '#13286B', fontWeight: 800, fontSize: 16, padding: '14px 24px', borderRadius: 999 }}>New here? Sign up</Link>
      </section>

      <section className="menu-sec" style={{ marginTop: 34 }}>
        <span className="wide menu-lbl">Company</span>
        <Link href="/about" className="menu-link">About insidejoke</Link>
        <Link href="/privacy" className="menu-link">Privacy policy</Link>
        <Link href="/terms" className="menu-link">Terms</Link>
      </section>

      <section className="menu-sec" style={{ gap: 12 }}>
        <span className="wide menu-lbl">Find us on</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          {SOCIALS.map(([name, handle, href]) => (
            <a key={name} href={href} target="_blank" rel="noopener noreferrer" className="menu-social"><span style={{ fontWeight: 700, fontSize: 15 }}>{name}</span><span style={{ fontSize: 12, color: '#DCE3FF' }}>{handle}</span></a>
          ))}
        </div>
      </section>

      <section className="menu-sec" style={{ gap: 8 }}>
        <span className="wide menu-lbl">Contact</span>
        {LEGAL.email ? <a href={`mailto:${LEGAL.email}`} className="serif" style={{ textDecoration: 'none', fontSize: 26, color: '#fff' }}>{LEGAL.email}</a> : <span className="serif" style={{ fontSize: 26, color: '#fff' }}>[contact email]</span>}
        <span style={{ fontSize: 14, color: '#DCE3FF' }}>Say hi, pitch a collab, or tell us what you'd love.</span>
      </section>
      <div style={{ height: 40 }} />
    </main>
  );
}
