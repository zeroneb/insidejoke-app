// Keeps a copy of every server error so it shows on /admin (Vercel only shows a digest number on screen).
export async function register() {}

export async function onRequestError(err, request) {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  try {
    const { run, id, now } = await import('./lib/db.js');
    await run('INSERT INTO app_errors (id, at, path, method, digest, message, stack) VALUES (?, ?, ?, ?, ?, ?, ?)',
      id(), now(), String(request?.path || '').slice(0, 300), request?.method || '', err?.digest || '',
      String(err?.message || err).slice(0, 1000), String(err?.stack || '').slice(0, 3000));
  } catch {}
}
