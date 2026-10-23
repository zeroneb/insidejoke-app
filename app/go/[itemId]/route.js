// Outbound store link for an item: counts the click, then sends you to the store (through the
// affiliate network when one is set up). /go/<itemId>
import { get } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { affiliateUrl } from '@/lib/affiliate';
import { logEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  const { itemId } = await params;
  const it = await get('SELECT id, url, list_id FROM items WHERE id = ?', String(itemId || ''));
  const to = it?.url ? affiliateUrl(it.url) : null;
  if (!to) return new Response('Not found', { status: 404 });
  let me = null; try { me = await currentUser(); } catch {}
  logEvent('outbound', { userId: me?.id || null, ref: it.id, detail: (() => { try { return new URL(to).hostname; } catch { return ''; } })() });
  return new Response(null, { status: 302, headers: { Location: to, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer-when-downgrade' } });
}
