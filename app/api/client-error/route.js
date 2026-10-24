// Errors that happen in the browser (they never reach the server logs) land in /admin → Recent errors.
import { run, id, now } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { allow, clientIp } = await import('@/lib/ratelimit');
    if (!(await allow('rl_client_error', await clientIp(), 30, 60 * 60 * 1000))) return new Response(null, { status: 204 });
    const b = await req.json().catch(() => ({}));
    await run('INSERT INTO app_errors (id, at, path, method, digest, message, stack) VALUES (?, ?, ?, ?, ?, ?, ?)',
      id(), now(), String(b.path || '').slice(0, 300), 'BROWSER', String(b.digest || '').slice(0, 40),
      String(b.message || 'Unknown browser error').slice(0, 1000), String(b.stack || '').slice(0, 3000) + (b.ua ? `\n[${String(b.ua).slice(0, 200)}]` : ''));
  } catch {}
  return new Response(null, { status: 204 });
}
