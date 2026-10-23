// Small activity log for the admin page: link reads, failed payments and cash-outs, list views, share sign-ups.
// Best effort: logging never breaks the thing being logged.
import { run, id, now } from './db';

export async function logEvent(kind, { userId = null, ref = null, detail = null } = {}) {
  try {
    await run('INSERT INTO app_events (id, at, kind, user_id, ref, detail) VALUES (?, ?, ?, ?, ?, ?)',
      id(), now(), String(kind).slice(0, 40), userId, ref ? String(ref).slice(0, 500) : null, detail == null ? null : String(typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 1000));
  } catch {}
}
