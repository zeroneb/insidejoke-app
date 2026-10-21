// a2: the one message a shared list goes out with (share sheet preview, sms:, WhatsApp, texted).
import { formatPhone } from './auth';

export function shareMessage({ list, sharerName, ownerName, link }) {
  const who = sharerName || 'A friend';
  let whose;
  if (list.for_who === 'other' && list.recipient_name) whose = `${list.recipient_name}'s`;
  else if (ownerName && sharerName && ownerName !== sharerName) whose = `${ownerName}'s`;
  else whose = list.occasion ? `${/^[aeiou]/i.test(list.occasion) ? 'an' : 'a'} ${list.occasion.toLowerCase()}` : 'a';
  return { body: `${who} shared ${whose} list with you: “${list.title}.” Pick something, chip in, or just look.`, link };
}

export const prettyPhone = formatPhone;
