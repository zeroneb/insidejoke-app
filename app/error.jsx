'use client';
// Any page that crashes lands here instead of the bare "Application error" screen.
// Right after a new version goes live, an open page can ask for files that no longer exist:
// reload once automatically, which fixes it.
import { useEffect } from 'react';

const STALE = /ChunkLoadError|Loading chunk|dynamically imported module|Failed to find Server Action|unexpected response was received/i;

export default function ErrorPage({ error, reset }) {
  useEffect(() => {
    const msg = `${error?.name || ''} ${error?.message || ''}`;
    let tried = false;
    try { tried = sessionStorage.getItem('ij-reloaded') === '1'; } catch {}
    if (STALE.test(msg) && !tried) {
      try { sessionStorage.setItem('ij-reloaded', '1'); } catch {}
      window.location.reload();
    } else {
      try { sessionStorage.removeItem('ij-reloaded'); } catch {}
    }
  }, [error]);
  return (
    <main style={{ padding: '60px 24px', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start', maxWidth: 480, margin: '0 auto' }}>
      <h1 style={{ margin: 0, fontWeight: 400, fontSize: 40, lineHeight: 1, letterSpacing: '-0.03em' }}>Something <span className="serif" style={{ fontStyle: 'italic' }}>hiccuped.</span></h1>
      <p style={{ margin: 0, fontSize: 16, lineHeight: 1.45 }}>Nothing you did. Try again, and if it keeps happening, reload the page.</p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={() => reset()} style={{ border: 0, background: '#000', color: '#fff', fontFamily: 'inherit', fontWeight: 700, fontSize: 16, padding: '14px 22px', borderRadius: 999, cursor: 'pointer' }}>Try again</button>
        <button onClick={() => window.location.reload()} style={{ border: '1.5px solid #000', background: 'transparent', fontFamily: 'inherit', fontWeight: 700, fontSize: 16, padding: '14px 22px', borderRadius: 999, cursor: 'pointer', color: '#000' }}>Reload</button>
      </div>
      {error?.digest ? <span style={{ fontSize: 12, color: '#4A4A4A' }}>Code {error.digest}</span> : null}
    </main>
  );
}
