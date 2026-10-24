'use server';

// r1: sign up step 2 (code) and step 3 (optional photo), Option 10 SignUp board.
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { get, run } from './db';
import { checkPhoneCode, findOrCreateUser, createSession, currentUser } from './auth';

const str = (fd, k) => String(fd.get(k) ?? '').trim();
import { safeNext as safeNextTo } from './access';
const safeNext = (n) => safeNextTo(n, '/home');

// Code -> session. New accounts made from /signup go on to "Add your face?" before `next`.
export async function confirmCodeR1(prev, fd) {
  const phone = str(fd, 'phone');
  const name = str(fd, 'name');
  const next = safeNext(str(fd, 'next'));
  const flow = str(fd, 'flow');
  const code = str(fd, 'code');
  if (!(await checkPhoneCode(phone, code))) return { error: 'That code did not match. Try again.' };
  const existed = !!(await get('SELECT 1 FROM users WHERE phone = ?', phone));
  const u = await findOrCreateUser(phone, name);
  await createSession(u.id);
  if (!existed) await (await import('./friends')).welcomeFriends(u.id, u.phone || phone, next);
  if (!existed) {
    const fromShare = /^\/(l|j|join|reveal)\//.test(next);
    (await import('./events')).logEvent('signup', { userId: u.id, ref: next, detail: fromShare ? 'from_share' : 'direct' });
    // Launch tracking: credit whoever first sent them (see middleware.js), then forget the cookie.
    try {
      const jar = await (await import('next/headers')).cookies();
      let src = null;
      try { src = JSON.parse(decodeURIComponent(jar.get('ij_src')?.value || '')); } catch {}
      await run('UPDATE users SET source = ?, source_campaign = ? WHERE id = ?', src?.s || (fromShare ? 'shared list' : 'direct'), src?.c || null, u.id);
      jar.delete('ij_src');
    } catch {}
  }
  if (flow === 'signup' && !existed && !u.photo) redirect(`/signup/photo?next=${encodeURIComponent(next)}`);
  redirect(next);
}

// Step 3: save the photo (shown as a duotone in the person's blob), then carry on.
export async function savePhotoR1(prev, fd) {
  const me = await currentUser();
  if (!me) redirect('/signup');
  const f = fd.get('photo');
  if (!(f && typeof f === 'object' && f.size > 0)) return { error: 'Pick a photo first, or skip.' };
  if (f.size >= 5 * 1024 * 1024 || !/^image\//.test(f.type)) return { error: 'That photo is too big or not an image. Try another.' };
  const { storeFile } = await import('./media');
  await run('UPDATE users SET photo = ? WHERE id = ?', await storeFile(f, 'people', { max: 600 }), me.id);
  revalidatePath('/', 'layout');
  return { ok: true };
}
