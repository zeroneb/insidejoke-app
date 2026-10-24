import { NextResponse } from 'next/server';

// Launch tracking: remembers where a visitor first came from, so a sign-up days later still credits
// the creator, post or site that sent them. One insidejoke-only cookie (ij_src), 30 days, read once at sign-up.
//   insidejoke.club/l/<list>?ref=priya            -> source "priya"
//   insidejoke.club/?utm_source=ig&utm_campaign=launch -> source "ig", campaign "launch"
//   arriving from another site (instagram.com, t.co…) -> that site, unless a ref is already saved
export const COOKIE = 'ij_src';
const OWN = /(^|\.)(insidejoke\.club|vercel\.app|localhost)$/;
const clean = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

export function middleware(req) {
  const url = req.nextUrl;
  const ref = clean(url.searchParams.get('ref') || url.searchParams.get('utm_source'));
  const campaign = clean(url.searchParams.get('utm_campaign'));
  const saved = req.cookies.get(COOKIE)?.value;
  let value = null;
  if (ref) value = { s: ref, c: campaign, k: 'link' };
  else if (!saved) {
    let host = '';
    try { host = new URL(req.headers.get('referer') || '').hostname.replace(/^www\.|^m\.|^l\./, ''); } catch {}
    if (host && !OWN.test(host)) value = { s: clean(host === 't.co' ? 'x.com' : host), c: '', k: 'site' };
  }
  if (!value) return NextResponse.next();
  const res = NextResponse.next();
  res.cookies.set(COOKIE, JSON.stringify({ ...value, p: url.pathname.slice(0, 80), t: Date.now() }), {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30, secure: process.env.NODE_ENV === 'production'
  });
  return res;
}

// Pages only: skip Next's own files, the API, and images or other files.
export const config = { matcher: ['/((?!_next/|api/|.*\\.[a-z0-9]+$).*)'] };
