import './globals.css';
import Link from 'next/link';
import { isTestMode } from '@/lib/texts';
import { currentUser } from '@/lib/auth';
import { GlobalNav } from '@/components/nav';

export const metadata = {
  title: 'insidejoke',
  description: "Let's celebrate you, and life."
};

export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default async function RootLayout({ children }) {
  const test = isTestMode();
  const u = await currentUser().catch(() => null);
  const me = u ? { id: u.id, name: u.name, color: u.color, seed: u.seed, photo: u.photo || null } : null;
  return (
    <html lang="en" data-theme={u?.theme || 'light'}>
      <head><link rel="preload" href="/fonts/inter-tight-latin-wght-normal.woff2" as="font" type="font/woff2" crossOrigin="" /><link rel="preload" href="/fonts/eb-garamond-latin-400-normal.woff2" as="font" type="font/woff2" crossOrigin="" /><link rel="preload" href="/fonts/eb-garamond-latin-600-normal.woff2" as="font" type="font/woff2" crossOrigin="" /><link rel="preload" href="/fonts/archivo-latin-standard-normal.woff2" as="font" type="font/woff2" crossOrigin="" /><link rel="preload" href="/fonts/doto-latin-wght-normal.woff2" as="font" type="font/woff2" crossOrigin="" /></head>
      <body>
        <div className="app has-nav">
          {test ? (
            <div className="testbar"><span>Test mode: texts and payments are simulated</span><Link href="/dev/texts">Outbox</Link></div>
          ) : null}
          {children}
        </div>
        <GlobalNav me={me} />
      </body>
    </html>
  );
}
