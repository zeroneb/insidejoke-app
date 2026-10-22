import { debugLink } from '@/lib/fetchlink';
import { currentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // reading a store link can take a while

// Signed-in only: shows what the link reader gets from a store page.
export async function GET(req) {
  const me = await currentUser();
  if (!me) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const url = new URL(req.url).searchParams.get('url');
  if (!url) return Response.json({ error: 'Add ?url=' }, { status: 400 });
  return Response.json(await debugLink(url));
}
