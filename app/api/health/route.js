import { get, dbMode } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Public, no data: is the database reachable? Shows the error text (with any addresses removed) when it isn't.
export async function GET() {
  const t = Date.now();
  try {
    const r = await get('SELECT COUNT(*) AS n FROM users');
    return Response.json({ database: 'ok', mode: dbMode(), ms: Date.now() - t, hasUsers: Number(r?.n) > 0 });
  } catch (e) {
    const msg = String(e?.message || e).replace(/postgres(ql)?:\/\/\S+/gi, '[db url]').replace(/[\w.-]+\.(neon\.tech|supabase\.co|vercel-storage\.com|aws\.com)\S*/gi, '[host]').slice(0, 400);
    return Response.json({ database: 'error', mode: dbMode(), code: e?.code || null, message: msg }, { status: 500 });
  }
}
