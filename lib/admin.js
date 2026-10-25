// The founder's admin check: phones listed in ADMIN_PHONES (Vercel setting). Same rule as /admin.
const digits = (p) => String(p || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');

export function isAdmin(me) {
  if (!me) return false;
  const admins = String(process.env.ADMIN_PHONES || '').split(',').map(digits).filter(Boolean);
  return admins.includes(digits(me.phone));
}
