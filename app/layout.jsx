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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;700;800&family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=Archivo:wdth,wght@62..125,400..900&family=Doto:wght@600..900&display=swap" rel="stylesheet" />
      </head>
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
