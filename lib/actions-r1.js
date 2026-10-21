'use server';

// r1: sign up step 2 (code) and step 3 (optional photo), Option 10 SignUp board.
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { get, run } from './db';
import { checkPhoneCode, findOrCreateUser, createSession, currentUser } from './auth';

const str = (fd, k) => String(fd.get(k) ?? '').trim();
const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/home');

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
  const buf = Buffer.from(await f.arrayBuffer());
  await run('UPDATE users SET photo = ? WHERE id = ?', `data:${f.type};base64,${buf.toString('base64')}`, me.id);
  revalidatePath('/', 'layout');
  return { ok: true };
}
