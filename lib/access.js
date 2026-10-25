// Who may see a list (one rule, used by every page and action that shows or charges against a list).
// Owner and members: always. Archived: nobody else. Surprise: never the person it's for until it's sent.
// Private: members or numbers it was texted to. Public: anyone with the link.
import { get } from './db';
import { isAdmin } from './admin';

export async function canSeeList(list, me) {
  if (!list) return false;
  if (me && list.owner_id === me.id) return true;
  if (me && (await get('SELECT 1 FROM list_members WHERE list_id = ? AND user_id = ?', list.id, me.id))) return true;
  if (list.status === 'archived' || list.status === 'deleted') return false;
  if (list.surprise && !list.sent_at && me && ((list.recipient_phone && list.recipient_phone === me.phone) || (list.recipient_id && list.recipient_id === me.id))) return false;
  if (list.visibility !== 'private') return true;
  if (!me) return false;
  if (await get('SELECT 1 FROM list_shares WHERE list_id = ? AND phone = ?', list.id, me.phone)) return true;
  // The founder (ADMIN_PHONES) can open private lists, to help people. Surprise and archived rules above still apply.
  return isAdmin(me);
}

// A same-site path to go to next ("/home", "/l/x"); anything else falls back.
export function safeNext(n, d = '/home') {
  const s = String(n || '');
  return /^\/(?![\/\\])/.test(s) && !/[\\\s]/.test(s) && !/^\/[^?#]*:/.test(s) ? s : d;
}
