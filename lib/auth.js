import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import { db, id, now, pickColor } from './db';
import { sendText } from './texts';

const COOKIE = 'ij_session';

export function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  if (digits.length >= 8 && digits.length <= 15) return '+' + digits;
  return null;
}

export function formatPhone(p) {
  const d = (p || '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return p;
}

export async function startPhoneCode(phone) {
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  db().prepare('INSERT INTO codes (phone, code, expires_at, tries) VALUES (?, ?, ?, 0) ON CONFLICT(phone) DO UPDATE SET code = excluded.code, expires_at = excluded.expires_at, tries = 0')
    .run(phone, code, now() + 10 * 60 * 1000);
  await sendText(phone, `Your insidejoke code is ${code}. It expires in 10 minutes.`, 'code');
  return code;
}

export function checkPhoneCode(phone, code) {
  const row = db().prepare('SELECT * FROM codes WHERE phone = ?').get(phone);
  if (!row) return false;
  if (row.expires_at < now() || row.tries >= 5) return false;
  if (row.code !== String(code).trim()) {
    db().prepare('UPDATE codes SET tries = tries + 1 WHERE phone = ?').run(phone);
    return false;
  }
  db().prepare('DELETE FROM codes WHERE phone = ?').run(phone);
  return true;
}

export function findOrCreateUser(phone, name) {
  const d = db();
  let u = d.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
  if (!u) {
    const { color, seed } = pickColor(phone);
    const uid = id();
    d.prepare('INSERT INTO users (id, phone, name, color, seed, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(uid, phone, (name || '').trim(), color, seed, now());
    u = d.prepare('SELECT * FROM users WHERE id = ?').get(uid);
  } else if (name && !u.name) {
    d.prepare('UPDATE users SET name = ? WHERE id = ?').run(name.trim(), u.id);
    u.name = name.trim();
  }
  return u;
}

export async function createSession(userId) {
  const token = crypto.randomBytes(24).toString('base64url');
  db().prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(token, userId, now());
  const jar = await cookies();
  jar.set(COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365, secure: process.env.NODE_ENV === 'production' });
}

export async function currentUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return db().prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?').get(token) || null;
}

export async function signOut() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) db().prepare('DELETE FROM sessions WHERE token = ?').run(token);
  jar.delete(COOKIE);
}
