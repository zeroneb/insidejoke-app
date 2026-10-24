'use client';
// Last-resort error screen (when even the main layout fails). Also reports the error to /admin.
import { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    try { fetch('/api/client-error', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true, body: JSON.stringify({ message: `${error?.name || 'Error'}: ${error?.message || ''}`, stack: error?.stack || '', digest: error?.digest || '', path: location.pathname + location.search, ua: navigator.userAgent }) }); } catch {}
  }, [error]);
  return (
    <html lang="en"><body style={{ fontFamily: 'system-ui, sans-serif', padding: 32 }}>
      <h1 style={{ fontWeight: 400 }}>Something hiccuped.</h1>
      <p>Nothing you did. Try again, or reload the page.</p>
      <button onClick={() => reset()} style={{ padding: '12px 20px', borderRadius: 999, border: 0, background: '#000', color: '#fff', fontWeight: 700 }}>Try again</button>
      {error?.digest ? <p style={{ fontSize: 12, color: '#555' }}>Code {error.digest}</p> : null}
    </body></html>
  );
}
