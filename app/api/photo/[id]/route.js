import { get } from '@/lib/db';

// An item's photo as a normal image URL (stored as a data URI, or a store's image link).
export async function GET(req, { params }) {
  const { id } = await params;
  const it = await get('SELECT photo FROM items WHERE id = ?', id);
  const p = it?.photo;
  if (!p) return new Response('Not found', { status: 404 });
  if (/^https?:/.test(p)) return Response.redirect(p, 302);
  const m = /^data:([^;]+);base64,(.*)$/.exec(p);
  if (!m) return new Response('Not found', { status: 404 });
  return new Response(Buffer.from(m[2], 'base64'), { headers: { 'Content-Type': m[1], 'Cache-Control': 'public, max-age=300' } });
}
