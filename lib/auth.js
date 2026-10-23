import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import { get, run, id, now, pickColor } from './db';
import { sendText, verifyEnabled, twilio } from './texts';

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
  // Limits: 5 codes per number per hour, 15 per network per hour. Texts cost money and invite abuse.
  const { allow, clientIp } = await import('./ratelimit');
  const H = 60 * 60 * 1000;
  if (!(await allow('rl_code_phone', phone, 5, H)) || !(await allow('rl_code_ip', await clientIp(), 15, H))) throw new Error('rate_limited');
  if (verifyEnabled()) {
    const r = await twilio(`https://verify.twilio.com/v2/Services/${process.env.TWILIO_VERIFY_SID}/Verifications`, { To: phone, Channel: 'sms' });
    if (!r.ok) throw new Error('verify_failed');
    return null;
  }
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  await run('INSERT INTO codes (phone, code, expires_at, tries) VALUES (?, ?, ?, 0) ON CONFLICT(phone) DO UPDATE SET code = excluded.code, expires_at = excluded.expires_at, tries = CASE WHEN codes.expires_at < ? THEN 0 ELSE codes.tries END',
    phone, code, now() + 10 * 60 * 1000, now());
  await sendText(phone, `Your insidejoke code is ${code}. It expires in 10 minutes.`, 'code');
  return code;
}

export async function checkPhoneCode(phone, code) {
  // At most 10 code guesses per number per hour.
  const { allow } = await import('./ratelimit');
  if (!(await allow('rl_check_phone', phone, 10, 60 * 60 * 1000))) return false;
  if (verifyEnabled()) {
    const r = await twilio(`https://verify.twilio.com/v2/Services/${process.env.TWILIO_VERIFY_SID}/VerificationCheck`, { To: phone, Code: String(code).trim() });
    return r.ok && r.data.status === 'approved';
  }
  const row = await get('SELECT * FROM codes WHERE phone = ?', phone);
  if (!row) return false;
  if (row.expires_at < now() || row.tries >= 5) return false;
  if (row.code !== String(code).trim()) {
    await run('UPDATE codes SET tries = tries + 1 WHERE phone = ?', phone);
    return false;
  }
  await run('DELETE FROM codes WHERE phone = ?', phone);
  return true;
}

export async function findOrCreateUser(phone, name) {
  let u = await get('SELECT * FROM users WHERE phone = ?', phone);
  if (!u) {
    const { color, seed } = pickColor(phone);
    const uid = id();
    await run('INSERT INTO users (id, phone, name, color, seed, created_at) VALUES (?, ?, ?, ?, ?, ?)', uid, phone, (name || '').trim(), color, seed, now());
    u = await get('SELECT * FROM users WHERE id = ?', uid);
  } else if (name && !u.name) {
    await run('UPDATE users SET name = ? WHERE id = ?', name.trim(), u.id);
    u.name = name.trim();
  }
  return u;
}

export async function createSession(userId) {
  const token = crypto.randomBytes(24).toString('base64url');
  await run('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)', token, userId, now());
  const jar = await cookies();
  jar.set(COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365, secure: process.env.NODE_ENV === 'production' });
}

export async function currentUser() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return (await get('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?', token)) || null;
}

export async function signOut() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await run('DELETE FROM sessions WHERE token = ?', token);
  jar.delete(COOKIE);
}
