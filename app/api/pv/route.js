// Page views for /admin → Page visits. One row per page shown (path only, plus user id when signed in).
// Sent by components/page-beacon.jsx after the page is on screen, so it never slows a page. Fails silently.
import { cookies } from 'next/headers';
import { get } from '@/lib/db';
import { logEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|whatsapp|telegram|discord|slack|headless|lighthouse|pingdom|uptime|curl|wget|python|node-fetch|axios/i;
const SKIP = /^\/(admin|api|_next|dev)(\/|$)/;

export async function POST(req) {
  try {
    const ua = req.headers.get('user-agent') || '';
    if (!ua || BOT.test(ua) || req.headers.get('purpose') === 'prefetch') return new Response(null, { status: 204 });
    const b = await req.json().catch(() => ({}));
    const path = String(b.p || '').split(/[?#]/)[0].slice(0, 200);
    if (!path.startsWith('/') || SKIP.test(path) || /\.[a-z0-9]+$/i.test(path)) return new Response(null, { status: 204 });
    const token = (await cookies()).get('ij_session')?.value;
    const s = token ? await get('SELECT user_id FROM sessions WHERE token = ?', token) : null;
    await logEvent('page_view', { userId: s?.user_id || null, ref: path });
  } catch {}
  return new Response(null, { status: 204 });
}
