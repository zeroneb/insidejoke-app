// Store links earn a commission when someone buys through them. Turned on by settings in Vercel:
//   AMAZON_TAG      Amazon Associates tracking id (e.g. insidejoke-20) for amazon.* links
//   SKIMLINKS_ID    Skimlinks publisher id (e.g. 123456X789012), covers most other stores
//   SOVRN_KEY       Sovrn Commerce (VigLink) API key, used if Skimlinks isn't set
// With none set, links go straight to the store, unchanged.

export function affiliateUrl(raw) {
  let u;
  try { u = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const host = u.hostname.toLowerCase();
  if (/(^|\.)amazon\.[a-z.]+$/.test(host) || host === 'amzn.to') {
    if (process.env.AMAZON_TAG && host !== 'amzn.to') { u.searchParams.set('tag', process.env.AMAZON_TAG); return u.toString(); }
    return u.toString();
  }
  if (process.env.SKIMLINKS_ID) return `https://go.skimresources.com/?id=${encodeURIComponent(process.env.SKIMLINKS_ID)}&xs=1&url=${encodeURIComponent(u.toString())}`;
  if (process.env.SOVRN_KEY) return `https://redirect.viglink.com/?key=${encodeURIComponent(process.env.SOVRN_KEY)}&u=${encodeURIComponent(u.toString())}`;
  return u.toString();
}
