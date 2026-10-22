// stripe: tiny fetch client for https://api.stripe.com/v1 (no SDK). Only used when STRIPE_SECRET_KEY is set.
// STRIPE_API_BASE: only for local tests against a fake Stripe.
const API = process.env.STRIPE_API_BASE || 'https://api.stripe.com/v1';

export const stripeOn = () => !!process.env.STRIPE_SECRET_KEY;
export const stripeTestKey = () => /^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY || '');

// Flattens { a: { b: 1 }, c: [x] } into Stripe's form encoding: a[b]=1&c[0]=x
function encode(obj, prefix, out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === 'object' && !Array.isArray(v)) encode(v, key, out);
    else if (Array.isArray(v)) v.forEach((x, i) => (typeof x === 'object' ? encode(x, `${key}[${i}]`, out) : out.append(`${key}[${i}]`, String(x))));
    else out.append(key, String(v));
  }
  return out;
}

export async function stripe(method, path, params, { idempotencyKey } = {}) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('stripe_not_configured');
  const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
  const body = params ? encode(params).toString() : undefined;
  const url = method === 'GET' && body ? `${API}${path}?${body}` : `${API}${path}`;
  const res = await fetch(url, { method, headers, body: method === 'GET' ? undefined : body, cache: 'no-store' });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json?.error?.message || `stripe_${res.status}`);
    err.stripe = json?.error || {};
    err.code = json?.error?.code || 'stripe_error';
    throw err;
  }
  return json;
}
