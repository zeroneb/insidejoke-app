import { db, id, now } from './db';

// Texts carry the key moments. In test mode (no Twilio keys) every text is
// stored in the outbox and can be read at /dev/texts. With keys, it is sent
// through Twilio and also recorded in the outbox.
export async function sendText(to, body, kind) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const tok = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  let status = 'test';
  if (sid && tok && from) {
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
  db().prepare('INSERT INTO texts (id, to_phone, body, kind, status, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(id(), to, body, kind, status, now());
  return status;
}

export const isTestMode = () => !(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
export const appUrl = () => process.env.APP_URL || 'http://localhost:3000';
