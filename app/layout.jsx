import './globals.css';
import Link from 'next/link';
import { isTestMode } from '@/lib/texts';

export const metadata = {
  title: 'insidejoke',
  description: "Let's celebrate you, and life."
};

export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }) {
  const test = isTestMode();
  return (
    <html lang="en">
      <body>
        <div className="app">
          {test ? (
            <div className="testbar"><span>Test mode: texts and payments are simulated</span><Link href="/dev/texts">Outbox</Link></div>
          ) : null}
          {children}
        </div>
      </body>
    </html>
  );
}
