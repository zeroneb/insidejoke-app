// Laptop only: the orange art half beside the sign-up / log-in form (Option 16).
import Link from 'next/link';
import { blob } from '@/lib/blob';

export default function SignupArt() {
  const B = blob(14, 11);
  return (
    <div className="dk-only">
      <section aria-hidden="false" className="su-art" style={{ position: 'relative', background: 'var(--lt, #E8642C)', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '32px 56px', minHeight: '100vh', boxSizing: 'border-box' }}>
        <Link href="/" aria-label="insidejoke home" style={{ position: 'relative', zIndex: 2, textDecoration: 'none', alignSelf: 'flex-start' }}><span className="wide" style={{ fontSize: 20, color: 'var(--navy-ink, #13286B)', textTransform: 'none' }}>inside</span><span className="dot" style={{ fontSize: 26, color: 'var(--inv-fg, #FFFFFF)' }}>joke</span></Link>
        <div aria-hidden="true" style={{ position: 'absolute', right: -140, bottom: -120, width: 480, height: 480, borderRadius: '50%', background: 'var(--lt, #F4D3EE)' }} />
        <svg aria-hidden="true" style={{ position: 'absolute', left: 30, top: '24%' }} width="520" height="400" viewBox="0 0 200 200" preserveAspectRatio="none"><path d={B} fill="#D8F75A" /></svg>
        <p style={{ position: 'absolute', zIndex: 2, left: 72, top: 'calc(24% + 100px)', width: 440, margin: 0, fontWeight: 400, fontSize: 64, lineHeight: 0.95, letterSpacing: '-0.04em', color: 'var(--ink, #000)' }}>Let’s celebrate you, and <span className="serif" style={{ fontStyle: 'italic' }}>life.</span></p>
        <div aria-hidden="true" style={{ position: 'absolute', zIndex: 2, right: 70, top: 120, transform: 'rotate(6deg)', background: '#000000', color: '#D8F75A', fontWeight: 800, fontSize: 14, padding: '9px 14px' }}>boots · 82% covered</div>
        <div aria-hidden="true" style={{ position: 'absolute', zIndex: 2, right: 90, bottom: 120, transform: 'rotate(-8deg)', background: 'var(--surface, #FFFFFF)', padding: '12px 16px', width: 190, fontSize: 14, lineHeight: 1.3, color: 'var(--ink, #000)' }}>Priya contributed<br /><span className="serif" style={{ fontStyle: 'italic', fontSize: 19 }}>“for every winter walk”</span></div>
      </section>
    </div>
  );
}
