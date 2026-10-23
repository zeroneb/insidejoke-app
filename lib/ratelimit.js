// Simple limits stored in app_events, so they hold across servers. Used to stop code-texting abuse
// (every sign-in text costs money) and code guessing.
import { get } from './db';
import { logEvent } from './events';

export async function clientIp() {
  try {
    const { headers } = await import('next/headers');
    const h = await headers();
    return (h.get('x-forwarded-for') || h.get('x-real-ip') || '').split(',')[0].trim() || 'unknown';
  } catch { return 'unknown'; }
}

// true = allowed (and counted); false = over the limit.
export async function allow(kind, key, max, windowMs) {
  try {
    const n = Number((await get('SELECT COUNT(*) AS n FROM app_events WHERE kind = ? AND ref = ? AND at > ?', kind, String(key), Date.now() - windowMs)).n);
    if (n >= max) return false;
    await logEvent(kind, { ref: String(key) });
    return true;
  } catch { return true; }
}
