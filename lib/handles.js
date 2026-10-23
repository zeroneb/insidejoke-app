// Short profile links: insidejoke.club/<handle>. Made from the person's name, unique, editable in Settings.
import { get, run } from './db';

// Top-level pages and anything that could be confused with the site itself.
const RESERVED = new Set(['about', 'admin', 'api', 'dev', 'friends', 'home', 'join', 'l', 'lists', 'login', 'logout', 'menu', 'notifications', 'privacy', 'reveal', 'signup', 'terms', 'u', 'wallet', 'you', 'settings', 'help', 'support', 'explore', 'insidejoke', 'static', 'public', 'icon', 'favicon', 'robots', 'sitemap', 'apple-icon', 'www', 'mail', 'contact', 'blog', 'shop', 'store', 'new', 'edit', 'search']);

export const cleanHandle = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9._]+/g, '').replace(/^[._]+|[._]+$/g, '').slice(0, 30);
export const handleOk = (h) => /^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$/.test(h) && !RESERVED.has(h);

export async function handleTaken(h, exceptUserId = '') {
  return !!(await get('SELECT 1 FROM users WHERE handle = ? AND id <> ?', h, exceptUserId));
}

// The person's handle, making one the first time it's needed.
export async function handleFor(user) {
  if (!user) return null;
  if (user.handle) return user.handle;
  let base = cleanHandle((user.name || '').split(/\s+/).join('')) || 'friend';
  if (base.length < 3) base = (base + 'joke').slice(0, 30);
  if (!handleOk(base)) base = `${base}.ij`.slice(0, 30);
  let h = base, n = 1;
  while (await handleTaken(h, user.id)) { n += 1; h = `${base.slice(0, 27)}${n}`; }
  try { await run('UPDATE users SET handle = ? WHERE id = ? AND handle IS NULL', h, user.id); } catch { return null; }
  return (await get('SELECT handle FROM users WHERE id = ?', user.id))?.handle || h;
}
