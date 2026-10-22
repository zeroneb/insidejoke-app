'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { get, run, id, now, itemColor, slugify } from './db';
import { normalizePhone, startPhoneCode, checkPhoneCode, findOrCreateUser, createSession, currentUser, signOut } from './auth';
import { sendText, appUrl, isTestMode } from './texts';
import { charge, savePaymentMethod, paymentMethod } from './payments';
import { listBySlug, itemById, owner, withProgress } from './lists';
import { fetchLink } from './fetchlink';
import { shareMessage } from './share-a2';
import { isMember } from './collab'; // a4: collaborators can add/edit like the owner
import { scheduleReminders } from './reminders'; // a4
import { recordGift } from './gifts';
import { headers } from 'next/headers';

const str = (fd, k) => String(fd.get(k) ?? '').trim();

// ---------- auth ----------
// Step 1: name + phone -> text a code. `next` is where to go after.
export async function requestCode(prev, fd) {
  const phone = normalizePhone(str(fd, 'phone'));
  const name = str(fd, 'name');
  const next = str(fd, 'next') || '/home';
  if (!phone) return { error: 'That phone number does not look right.', name, next };
  let code;
  try { code = await startPhoneCode(phone); } catch { return { error: "We couldn't text that number. Check it and try again." }; }
  // Test mode (no Twilio keys): nothing is really texted, so show the code on screen.
  return { step: 'code', phone, name, next, testCode: isTestMode() ? code : undefined };
}

// Step 2: code -> session.
export async function confirmCode(prev, fd) {
  const phone = str(fd, 'phone');
  const name = str(fd, 'name');
  const next = str(fd, 'next') || '/home';
  const code = str(fd, 'code');
  if (!(await checkPhoneCode(phone, code))) return { step: 'code', phone, name, next, error: 'That code did not match. Try again.' };
  const u = await findOrCreateUser(phone, name);
  await createSession(u.id);
  redirect(next);
}

export async function switchAccount() {
  await signOut();
  redirect('/login');
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
  // A surprise goes out at midnight (server time) on its date.
  const sendAt = surprise && date ? new Date(date + 'T00:00:00').getTime() || null : null;
  const recipientPhone = forWho === 'other' ? normalizePhone(str(fd, 'recipientPhone')) : null;
  await run(`INSERT INTO lists (id, slug, owner_id, title, for_who, recipient_name, occasion, surprise, date, visibility, status, nudge_dismissed, created_at, send_at, recipient_phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', 0, ?, ?, ?)`, lid, slug, me.id, title, forWho, recipient, occasion, surprise, date, visibility, now(), sendAt, recipientPhone);
  // Collaborators: friends on insidejoke join as members; phone numbers get a text invite.
  const link = `${appUrl()}/l/${slug}`;
  const who = me.name || 'A friend';
  for (const uid of fd.getAll('collab').map((x) => String(x).trim()).filter(Boolean)) {
    const u = await get('SELECT id, phone, notify_share FROM users WHERE id = ?', uid);
    if (!u || u.id === me.id) continue;
    await run("INSERT INTO list_members (list_id, user_id, role, created_at) VALUES (?, ?, 'collaborator', ?) ON CONFLICT DO NOTHING", lid, u.id, now());
    if (u.notify_share !== 0) await sendText(u.phone, `${who} added you to "${title}" on insidejoke. Add things, share it, send blasts: ${link}`, 'collab');
  }
  for (const raw of fd.getAll('collabPhone')) {
    const phone = normalizePhone(String(raw));
    if (!phone) continue;
    const u = await get('SELECT id FROM users WHERE phone = ?', phone);
    if (u && u.id !== me.id) await run("INSERT INTO list_members (list_id, user_id, role, created_at) VALUES (?, ?, 'collaborator', ?) ON CONFLICT DO NOTHING", lid, u.id, now());
    await run('INSERT INTO list_shares (id, list_id, phone, created_at) VALUES (?, ?, ?, ?) ON CONFLICT (list_id, phone) DO NOTHING', id(), lid, phone, now());
    await sendText(phone, `${who} wants you to build "${title}" with them on insidejoke: ${link}`, 'collab');
  }
  // Private lists: the people picked can see it.
  for (const uid of fd.getAll('viewer').map((x) => String(x).trim()).filter(Boolean)) {
    if (uid === me.id) continue;
    await run("INSERT INTO list_members (list_id, user_id, role, created_at) VALUES (?, ?, 'viewer', ?) ON CONFLICT DO NOTHING", lid, uid, now());
  }
  redirect(`/l/${slug}/add?first=1`);
}

export async function addItem(prev, fd) {
  const me = await currentUser();
  if (!me) redirect('/signup');
  const slug = str(fd, 'slug');
  const list = await listBySlug(slug);
  if (!list || !(list.owner_id === me.id || await isMember(list.id, me.id))) return { error: 'This is not your list.' };
  const name = str(fd, 'name');
  const priceRaw = str(fd, 'price').replace(/[^0-9.]/g, '');
  const price = Math.round(parseFloat(priceRaw || '0') * 100);
  if (!name) return { error: 'Give it an exact name.' };
  if (!price || price < 100) return { error: 'Add a price of at least $1.' };
  const unlimited = !!fd.get('unlimited');
  const quantity = unlimited ? 0 : Math.max(1, Math.min(99, parseInt(str(fd, 'quantity') || '1', 10) || 1));
  const count = (await get('SELECT COUNT(*) AS n FROM items WHERE list_id = ?', list.id)).n;
  let photo = await photoFrom(fd);
  if (!photo && str(fd, 'url')) { try { const r = await fetchLink(str(fd, 'url')); if (r.ok && r.photo) photo = r.photo; } catch {} }
  await run(`INSERT INTO items (id, list_id, name, price_cents, quantity, store, url, note, photo, color, removed, created_at, added_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    id(), list.id, name, price, quantity, str(fd, 'store') || null, str(fd, 'url') || null, str(fd, 'note') || null, photo, itemColor(count), now(), me.id);
  revalidatePath(`/l/${slug}`);
  redirect(`/l/${slug}?added=1`);
}

// Paste a link: read the page and hand back name, price, store and photo for the form.
export async function previewLink(prev, fd) {
  const me = await currentUser();
  if (!me) return { error: 'Sign in first.' };
  const url = str(fd, 'url');
  if (!url) return { error: 'Paste a link first.' };
  const r = await fetchLink(url);
  if (!r.ok) return { url: r.url, store: r.store, host: r.host, blocked: true };
  return { url: r.url, name: r.name, price: r.price, store: r.store, host: r.host, photo: r.photo || null, imageCandidates: r.photo ? [] : r.imageCandidates || [], ok: true };
}

async function photoFrom(fd) {
  const f = fd.get('photo');
  if (f && typeof f === 'object' && f.size > 0 && f.size < 5 * 1024 * 1024 && /^image\//.test(f.type)) {
    const buf = Buffer.from(await f.arrayBuffer());
    return `data:${f.type};base64,${buf.toString('base64')}`;
  }
  const pulled = str(fd, 'photoData');
  if (/^data:image\//.test(pulled) && pulled.length < 6 * 1024 * 1024) return pulled;
  if (/^https:\/\/\S+$/i.test(pulled) && pulled.length < 2000) return pulled;
  return null;
}

// Owner edits an item after creating it.
export async function updateItem(prev, fd) {
  const me = await currentUser();
  if (!me) redirect('/signup');
  const slug = str(fd, 'slug');
  const list = await listBySlug(slug);
  const it = await itemById(str(fd, 'itemId'));
  if (!list || !it || !(list.owner_id === me.id || await isMember(list.id, me.id)) || it.list_id !== list.id) return { error: 'This is not your item.' };
  const name = str(fd, 'name');
  const price = Math.round(parseFloat(str(fd, 'price').replace(/[^0-9.]/g, '') || '0') * 100);
  if (!name) return { error: 'Give it an exact name.' };
  if (!price || price < 100) return { error: 'Add a price of at least $1.' };
  const unlimited = !!fd.get('unlimited');
  const quantity = unlimited ? 0 : Math.max(1, Math.min(99, parseInt(str(fd, 'quantity') || '1', 10) || 1));
  const url = str(fd, 'url') || null;
  const linkChanged = (url || '') !== (it.url || '');
  const uploaded = await photoFrom(fd);
  let photo = uploaded || (fd.get('keepPhoto') && !linkChanged ? it.photo : null);
  let store = str(fd, 'store') || null;
  let price_cents = price;
  if (url && (!photo || linkChanged)) {
    try {
      const r = await fetchLink(url);
      if (r.ok) {
        if (!uploaded && r.photo) photo = r.photo;
        if (linkChanged && r.store && (!store || store === it.store)) store = r.store;
      }
    } catch {}
  }
  if (!photo && !uploaded && fd.get('keepPhoto')) photo = it.photo;
  await run('UPDATE items SET name = ?, price_cents = ?, quantity = ?, store = ?, url = ?, note = ?, photo = ?, photo_tried = 0 WHERE id = ?',
    name, price_cents, quantity, store, url, str(fd, 'note') || null, photo, it.id);
  revalidatePath(`/l/${slug}`);
  redirect(`/l/${slug}/i/${it.id}`);
}

// ---------- profile & settings ----------
export async function updateProfile(prev, fd) {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/you/settings');
  const name = str(fd, 'name').slice(0, 60);
  if (!name) return { error: 'Your name is what friends see. Add one.' };
  const bio = str(fd, 'bio').slice(0, 120) || null;
  const photo = (await photoFrom(fd)) || (fd.get('removePhoto') ? null : me.photo);
  const COLORS = ['#B36EE0', '#F0895A', '#E8642C', '#E3C552', '#D8F75A', '#93EC75', '#5FC3D9', '#A9CDF5', '#AAB4EC', '#F4D3EE', '#C8743A'];
  const color = COLORS.includes(str(fd, 'color')) ? str(fd, 'color') : me.color;
  await run('UPDATE users SET name = ?, bio = ?, photo = ?, color = ? WHERE id = ?', name, bio, photo, color, me.id);
  revalidatePath('/you');
  revalidatePath('/home');
  return { ok: true };
}

const SETTING_COLS = { weekly_thanks: 1, profile_public: 1, notify_covered: 1, notify_share: 1, notify_reminders: 1 };
export async function setSetting(fd) {
  const me = await currentUser();
  if (!me) return;
  const key = str(fd, 'key');
  if (key === 'theme') {
    const t = ['light', 'dark', 'auto'].includes(str(fd, 'value')) ? str(fd, 'value') : 'light';
    await run('UPDATE users SET theme = ? WHERE id = ?', t, me.id);
    revalidatePath('/', 'layout');
    return;
  }
  if (!SETTING_COLS[key]) return;
  const value = fd.get('value') === '1' ? 1 : 0;
  await run(`UPDATE users SET ${key} = ? WHERE id = ?`, value, me.id);
  revalidatePath('/you/settings');
}

export async function deleteAccount(fd) {
  const me = await currentUser();
  if (!me || str(fd, 'confirm') !== 'delete') return;
  // Keep money records; detach the person.
  await run("UPDATE users SET name = 'Deleted', bio = NULL, photo = NULL, phone = ? WHERE id = ?", 'deleted:' + me.id, me.id);
  await run("UPDATE lists SET status = 'archived', archived_at = ? WHERE owner_id = ?", now(), me.id);
  await signOut();
  redirect('/');
}

export async function dismissNudge(fd) {
  const me = await currentUser();
  const slug = str(fd, 'slug');
  const list = await listBySlug(slug);
  if (me && list && list.owner_id === me.id) await run('UPDATE lists SET nudge_dismissed = 1 WHERE id = ?', list.id);
  revalidatePath(`/l/${slug}`);
}

export async function removeItem(fd) {
  const me = await currentUser();
  const slug = str(fd, 'slug');
  const list = await listBySlug(slug);
  if (me && list && (list.owner_id === me.id || await isMember(list.id, me.id))) await run('UPDATE items SET removed = 1 WHERE id = ? AND list_id = ?', str(fd, 'itemId'), list.id);
  revalidatePath(`/l/${slug}`);
}

export async function archiveList(fd) {
  const me = await currentUser();
  const slug = str(fd, 'slug');
  const list = await listBySlug(slug);
  if (me && list && list.owner_id === me.id) await run("UPDATE lists SET status = 'archived', archived_at = ? WHERE id = ?", now(), list.id);
  redirect('/home');
}

// Share: text the link to a number (test mode: lands in the outbox).
export async function shareByText(prev, fd) {
  const me = await currentUser();
  const slug = str(fd, 'slug');
  const list = await listBySlug(slug);
  if (!me || !list) return { error: 'Not found.' };
  const to = normalizePhone(str(fd, 'to'));
  if (!to) return { error: 'That number does not look right.' };
  // a2: same words as the share sheet preview.
  const o = await owner(list);
  const msg = shareMessage({ list, sharerName: me.name, ownerName: o?.name, link: `${appUrl()}/l/${slug}` });
  await sendText(to, `${msg.body} ${msg.link}`, 'share');
  await run('INSERT INTO list_shares (id, list_id, phone, created_at) VALUES (?, ?, ?, ?) ON CONFLICT (list_id, phone) DO NOTHING', id(), list.id, to, now());
  if (!list.shared_at) {
    await run('UPDATE lists SET shared_at = ? WHERE id = ?', now(), list.id);
    await scheduleReminders({ ...list, shared_at: now() }); // a4
  }
  return { ok: true, to };
}

// ---------- giving ----------
// a3: the label shown in the payment row, e.g. "Visa ·· 4421".
function payLabelFor(kind, last4, first) {
  const d = String(last4 || '').replace(/\D/g, '').slice(-4) || '4242';
  const f = String(first || '4')[0];
  const brand = f === '5' || f === '2' ? 'Mastercard' : f === '3' ? 'Amex' : 'Visa';
  return kind === 'card' ? `${brand} ·· ${d}` : kind === 'apple' ? 'Apple Pay' : 'Bank ·· 6789';
}
// One action handles: get it (remaining), chip in (amount), treat (units).
export async function give(prev, fd) {
  const me = await currentUser();
  const slug = str(fd, 'slug');
  const itemId = str(fd, 'itemId');
  if (!me) redirect(`/signup?next=/l/${slug}/i/${itemId}/give`);
  const list = await listBySlug(slug);
  const it = await itemById(itemId);
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
  if (!(await paymentMethod(me.id))) {
    const kind = str(fd, 'payKind');
    if (!kind) return { needPayment: true, cents, units, note, visibility, mode };
    try {
      await savePaymentMethod(me.id, kind, payLabelFor(kind, str(fd, 'last4'), str(fd, 'cardFirst')), { paymentMethodId: str(fd, 'paymentMethodId') });
    } catch (e) {
      console.error('save payment', e.message);
      const { stripeTestKey } = await import('./stripe');
      return { error: (e.message === 'unsupported_payment_method' ? 'Use a card, Apple Pay or Google Pay.' : 'That card did not go through. Try another one.') + (stripeTestKey() && e.message !== 'unsupported_payment_method' ? ` (Stripe test: ${e.message})` : ''), needPayment: true, cents, units, note, visibility, mode };
    }
  }
  const cid = id();
  let res;
  try {
    // stripe: keyed on the contribution id so a retried request is never charged twice.
    const piDone = str(fd, 'paymentIntentId');
    if (piDone) {
      const { confirmedPayment } = await import('./payments');
      res = await confirmedPayment(me.id, piDone, cents);
      if (!res) return { error: 'That payment did not finish. Nothing was charged.', cents, units, note, visibility, mode };
    } else {
      // If the bank sends the giver to its own page, Stripe brings them back here to finish the gift.
      const h = await headers();
      const base = `${h.get('x-forwarded-proto') || 'https'}://${h.get('x-forwarded-host') || h.get('host')}`;
      res = await charge(me.id, cents, `${it.name} for ${list.title}`, {
        idempotencyKey: `give_${cid}`,
        returnUrl: `${base}/api/give/return`,
        metadata: { item_id: it.id, list_slug: slug, units: String(units), visibility, note: note.slice(0, 450) }
      });
      if (res.requiresAction) return { needAuth: { clientSecret: res.clientSecret, paymentIntentId: res.paymentIntentId }, cents, units, note, visibility, mode };
    }
  } catch (e) {
    console.error('charge', e.message);
    if (e.message === 'no_payment_method') return { needPayment: true, error: 'That way to pay could not be charged. Add a card to finish.', cents, units, note, visibility, mode };
    const { stripeTestKey } = await import('./stripe');
    const why = stripeTestKey() && e.message && e.message !== 'payment_failed' ? ` (Stripe test: ${e.message})` : '';
    return { error: 'Your card was declined. Nothing was charged.' + why, cents, units, note, visibility, mode };
  }
  const gid = await recordGift({ me, list, it, cents, units, note, visibility, res });
  redirect(`/l/${slug}/sent/${gid}`);
}

export async function react(fd) {
  const me = await currentUser();
  if (!me) return;
  const cid = str(fd, 'contributionId');
  const emoji = str(fd, 'emoji').slice(0, 8);
  if (!emoji) return;
  // Each emoji is its own toggle: tap to add it, tap again to take it back.
  const had = await get('SELECT 1 FROM reactions WHERE contribution_id = ? AND user_id = ? AND emoji = ?', cid, me.id, emoji);
  if (had) await run('DELETE FROM reactions WHERE contribution_id = ? AND user_id = ? AND emoji = ?', cid, me.id, emoji);
  else await run('INSERT INTO reactions (contribution_id, user_id, emoji, created_at) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING', cid, me.id, emoji, now());
  revalidatePath('/home');
}
