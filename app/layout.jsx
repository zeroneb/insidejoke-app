import './globals.css';
import Link from 'next/link';
import { isTestMode } from '@/lib/texts';
import { currentUser } from '@/lib/auth';
import { GlobalNav } from '@/components/nav';
import { Analytics } from '@vercel/analytics/next';
import PageBeacon from '@/components/page-beacon';
import EdgeColors from '@/components/edge-colors';

export const metadata = {
  title: 'insidejoke',
  description: "Let's celebrate you, and life.",
  appleWebApp: { capable: true, title: 'insidejoke', statusBarStyle: 'black-translucent' }
};

// Edge to edge on phones (viewport-fit=cover): pages draw behind the status bar. theme-color starts as the page
// ground (light #ECECEF, dark #161618); EdgeColors then sets it to whatever the page draws at its top edge.
// Settings › Appearance wins over the phone: Light or Dark pins it, Match phone follows the phone.
export async function generateViewport() {
  const u = await currentUser().catch(() => null);
  const t = u?.theme;
  const themeColor = t === 'dark' ? '#161618' : t === 'auto'
    ? [{ media: '(prefers-color-scheme: light)', color: '#ECECEF' }, { media: '(prefers-color-scheme: dark)', color: '#161618' }]
    : '#ECECEF';
  return { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor, colorScheme: t === 'dark' ? 'dark' : t === 'auto' ? 'light dark' : 'light' };
}

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
        <Analytics />
        <PageBeacon />
        <EdgeColors />
      </body>
    </html>
  );
}
