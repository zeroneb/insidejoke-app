import { run, id, now } from './db';

// Texts carry the key moments. In test mode (no Twilio keys) every text is
// stored in the outbox and can be read at /dev/texts. With keys, it is sent
// through Twilio and also recorded in the outbox.
export async function sendText(to, body, kind) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const tok = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  let status = smsEnabled() ? 'test' : (isTestMode() ? 'test' : 'held');
  if (smsEnabled()) {
    try {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${tok}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: to, From: from, Body: body })
      });
      status = res.ok ? 'sent' : 'failed';
    } catch {
      status = 'failed';
    }
  }
  await run('INSERT INTO texts (id, to_phone, body, kind, status, created_at) VALUES (?, ?, ?, ?, ?, ?)', id(), to, body, kind, status, now());
  return status;
}

// Automatic texts need an approved A2P registration: turn them on with TWILIO_SMS_ENABLED=1 once it is.
// Until then they are kept in the outbox ('held'); people share from their own phone instead.
export const smsEnabled = () => !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER && process.env.TWILIO_SMS_ENABLED === '1');
// Sign-in codes go through Twilio Verify, which needs no A2P registration.
export const verifyEnabled = () => !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VERIFY_SID);
export const isTestMode = () => !verifyEnabled() && !smsEnabled() && !/^(sk|rk)_live_/.test(process.env.STRIPE_SECRET_KEY || '');
export async function twilio(url, params) {
  const sid = process.env.TWILIO_ACCOUNT_SID, tok = process.env.TWILIO_AUTH_TOKEN;
  const res = await fetch(url, { method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${tok}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}
export const appUrl = () => process.env.APP_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
