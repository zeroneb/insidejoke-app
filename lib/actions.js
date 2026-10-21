'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { db, id, now, itemColor, slugify } from './db';
import { normalizePhone, startPhoneCode, checkPhoneCode, findOrCreateUser, createSession, currentUser, signOut } from './auth';
import { sendText, appUrl } from './texts';
import { charge, savePaymentMethod, paymentMethod } from './payments';
import { listBySlug, itemById, owner, withProgress } from './lists';

const str = (fd, k) => String(fd.get(k) ?? '').trim();

// ---------- auth ----------
// Step 1: name + phone -> text a code. `next` is where to go after.
export async function requestCode(prev, fd) {
  const phone = normalizePhone(str(fd, 'phone'));
  const name = str(fd, 'name');
  const next = str(fd, 'next') || '/home';
  if (!phone) return { error: 'That phone number does not look right.', name, next };
  await startPhoneCode(phone);
  return { step: 'code', phone, name, next };
}

// Step 2: code -> session.
export async function confirmCode(prev, fd) {
  const phone = str(fd, 'phone');
  const name = str(fd, 'name');
  const next = str(fd, 'next') || '/home';
  const code = str(fd, 'code');
  if (!checkPhoneCode(phone, code)) return { step: 'code', phone, name, next, error: 'That code did not match. Try again.' };
  const u = findOrCreateUser(phone, name);
  await createSession(u.id);
  redirect(next);
}

export async function logOut() {
  await signOut();
  redirect('/');
}

// ---------- lists ----------
export async function createList(prev, fd) {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/lists/new');
  const forWho = str(fd, 'forWho') === 'other' ? 'other' : 'me';
  const recipient = forWho === 'other' ? str(fd, 'recipient') : null;
  if (forWho === 'other' && !recipient) return { error: 'Write their name so the list can say who it is for.' };
  const title = str(fd, 'title') || (forWho === 'other' ? `For ${recipient}` : 'For my birthday');
  const surprise = forWho === 'other' && fd.get('surprise') ? 1 : 0;
  const hasDate = !!fd.get('hasDate') || surprise;
  const date = hasDate ? str(fd, 'date') || null : null;
  const visibility = surprise ? 'private' : (str(fd, 'visibility') === 'private' ? 'private' : 'public');
  const occasion = str(fd, 'occasion') || null;
  const lid = id();
  const slug = slugify(title);
  db().prepare(`INSERT INTO lists (id, slug, owner_id, title, for_who, recipient_name, occasion, surprise, date, visibility, status, nudge_dismissed, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', 0, ?)`).run(lid, slug, me.id, title, forWho, recipient, occasion, surprise, date, visibility, now());
  redirect(`/l/${slug}/add?first=1`);
}

export async function addItem(prev, fd) {
  const me = await currentUser();
  if (!me) redirect('/signup');
  const slug = str(fd, 'slug');
  const list = listBySlug(slug);
  if (!list || list.owner_id !== me.id) return { error: 'This is not your list.' };
  const name = str(fd, 'name');
  const priceRaw = str(fd, 'price').replace(/[^0-9.]/g, '');
  const price = Math.round(parseFloat(priceRaw || '0') * 100);
  if (!name) return { error: 'Give it an exact name.' };
  if (!price || price < 100) return { error: 'Add a price of at least $1.' };
  const unlimited = !!fd.get('unlimited');
  const quantity = unlimited ? 0 : Math.max(1, Math.min(99, parseInt(str(fd, 'quantity') || '1', 10) || 1));
  const count = db().prepare('SELECT COUNT(*) AS n FROM items WHERE list_id = ?').get(list.id).n;
  let photo = null;
  const f = fd.get('photo');
  if (f && typeof f === 'object' && f.size > 0 && f.size < 5 * 1024 * 1024 && /^image\//.test(f.type)) {
    const buf = Buffer.from(await f.arrayBuffer());
    photo = `data:${f.type};base64,${buf.toString('base64')}`;
  }
  db().prepare(`INSERT INTO items (id, list_id, name, price_cents, quantity, store, url, note, photo, color, removed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`)
    .run(id(), list.id, name, price, quantity, str(fd, 'store') || null, str(fd, 'url') || null, str(fd, 'note') || null, photo, itemColor(count), now());
  revalidatePath(`/l/${slug}`);
  redirect(`/l/${slug}?added=1`);
}

export async function dismissNudge(fd) {
  const me = await currentUser();
  const slug = str(fd, 'slug');
  const list = listBySlug(slug);
  if (me && list && list.owner_id === me.id) db().prepare('UPDATE lists SET nudge_dismissed = 1 WHERE id = ?').run(list.id);
  revalidatePath(`/l/${slug}`);
}

export async function removeItem(fd) {
  const me = await currentUser();
  const slug = str(fd, 'slug');
  const list = listBySlug(slug);
  if (me && list && list.owner_id === me.id) db().prepare('UPDATE items SET removed = 1 WHERE id = ? AND list_id = ?').run(str(fd, 'itemId'), list.id);
  revalidatePath(`/l/${slug}`);
}

export async function archiveList(fd) {
  const me = await currentUser();
  const slug = str(fd, 'slug');
  const list = listBySlug(slug);
  if (me && list && list.owner_id === me.id) db().prepare("UPDATE lists SET status = 'archived' WHERE id = ?").run(list.id);
  redirect('/home');
}

// Share: text the link to a number (test mode: lands in the outbox).
export async function shareByText(prev, fd) {
  const me = await currentUser();
  const slug = str(fd, 'slug');
  const list = listBySlug(slug);
  if (!me || !list) return { error: 'Not found.' };
  const to = normalizePhone(str(fd, 'to'));
  if (!to) return { error: 'That number does not look right.' };
  const whose = list.for_who === 'other' ? `${list.recipient_name}'s` : (me.name ? `${me.name}'s` : 'a');
  await sendText(to, `${me.name || 'A friend'} shared ${whose} list with you: ${appUrl()}/l/${slug}`, 'share');
  return { ok: true, to };
}

// ---------- giving ----------
// One action handles: get it (remaining), chip in (amount), treat (units).
export async function give(prev, fd) {
  const me = await currentUser();
  const slug = str(fd, 'slug');
  const itemId = str(fd, 'itemId');
  if (!me) redirect(`/signup?next=/l/${slug}/i/${itemId}/give`);
  const list = listBySlug(slug);
  const it = itemById(itemId);
  if (!list || !it || it.list_id !== list.id) return { error: 'This item is gone.' };
  const mode = str(fd, 'mode'); // 'rest' | 'amount' | 'treat'
  let cents = 0, units = 0;
  if (it.unlimited) {
    units = Math.max(1, Math.min(50, parseInt(str(fd, 'units') || '1', 10) || 1));
    cents = units * it.price_cents;
  } else if (mode === 'rest') {
    cents = it.remaining;
  } else {
    const raw = str(fd, 'amount') === 'custom' ? str(fd, 'custom') : str(fd, 'amount');
    cents = Math.round(parseFloat(raw.replace(/[^0-9.]/g, '') || '0') * 100);
    if (cents > it.remaining) cents = it.remaining; // wishes stop at covered
  }
  if (!cents || cents < 100) return { error: it.covered ? 'This one is already covered.' : 'Pick an amount of at least $1.' };
  const note = str(fd, 'note').slice(0, 280);
  const visibility = str(fd, 'visibility') === 'private' ? 'private' : 'public';
  // Payment setup, once.
  if (!paymentMethod(me.id)) {
    const kind = str(fd, 'payKind');
    if (!kind) return { needPayment: true, cents, units, note, visibility, mode };
    savePaymentMethod(me.id, kind, kind === 'card' ? `Card ••${(str(fd, 'last4') || '4242').slice(-4)}` : kind === 'apple' ? 'Apple Pay' : 'Bank');
  }
  const res = await charge(me.id, cents, `${it.name} for ${list.title}`);
  const cid = id();
  db().prepare('INSERT INTO contributions (id, item_id, list_id, giver_id, amount_cents, units, note, visibility, payment_ref, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(cid, it.id, list.id, me.id, cents, units, note || null, visibility, res.ref, now());
  // Texts carry the key moments: owner hears when a wish is fully covered.
  const after = withProgress(it);
  if (!it.unlimited && after.covered) {
    const o = owner(list);
    await sendText(o.phone, `${it.name} on "${list.title}" is all covered 🎉 Say thanks: ${appUrl()}/l/${slug}/i/${it.id}`, 'covered');
  }
  revalidatePath(`/l/${slug}`);
  redirect(`/l/${slug}/sent/${cid}`);
}

export async function react(fd) {
  const me = await currentUser();
  if (!me) return;
  const cid = str(fd, 'contributionId');
  const emoji = str(fd, 'emoji').slice(0, 8);
  db().exec(`CREATE TABLE IF NOT EXISTS reactions (contribution_id TEXT NOT NULL, user_id TEXT NOT NULL, emoji TEXT NOT NULL, PRIMARY KEY (contribution_id, user_id))`);
  db().prepare('INSERT INTO reactions (contribution_id, user_id, emoji) VALUES (?, ?, ?) ON CONFLICT(contribution_id, user_id) DO UPDATE SET emoji = excluded.emoji').run(cid, me.id, emoji);
  revalidatePath('/home');
}
