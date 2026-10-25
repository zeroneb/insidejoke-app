'use client';
// Counts a page view for /admin (path only). Sent after the page shows, with sendBeacon, so it never holds a page up.
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function PageBeacon() {
  const path = usePathname();
  useEffect(() => {
    if (!path || /^\/(admin|api|dev)(\/|$)/.test(path) || navigator.webdriver) return;
    try {
      const body = new Blob([JSON.stringify({ p: path })], { type: 'application/json' });
      if (!navigator.sendBeacon?.('/api/pv', body)) fetch('/api/pv', { method: 'POST', body, keepalive: true }).catch(() => {});
    } catch {}
  }, [path]);
  return null;
}
