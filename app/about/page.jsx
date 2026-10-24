import Link from 'next/link';
import { Header } from '@/components/ui';

export const metadata = { title: 'About · insidejoke' };

export default function Page() {
  return (
    <main>
      <Header back="/menu" title="About" />
      <div className="page">
        <h1>About</h1>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5 }}>insidejoke is a social movement. We believe in spreading joy, love and kindness.</p>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5 }}>insidejoke is a list of exactly what someone would love, for everyone who wants to celebrate them. Make a list for yourself or someone you love, share it with a link, and friends and family get it, chip in, or treat. All of it goes to the person celebrated.</p>
        <Link href="/" style={{ fontSize: 14 }}>Back to insidejoke</Link>
      </div>
    </main>
  );
}
