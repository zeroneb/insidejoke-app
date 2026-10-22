// Reads a product page and pulls out what the Add item form needs:
// exact name, price, store, image. Best effort: many stores block bots,
// and then the form falls back to typing it in.

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

const dec = (s) => String(s || '')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
  .replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(+n)).replace(/\s+/g, ' ').trim();

function meta(html, names) {
  for (const n of names) {
    const re = new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*>`, 'i');
    const tag = re.exec(html)?.[0];
    if (!tag) continue;
    const c = /content=["']([^"']*)["']/i.exec(tag)?.[1];
    if (c) return dec(c);
  }
  return '';
}

function jsonLd(html) {
  const out = [];
  const re = /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try { const j = JSON.parse(m[1].trim()); out.push(...(Array.isArray(j) ? j : j['@graph'] ? j['@graph'] : [j])); } catch { /* ignore */ }
  }
  return out;
}

export function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

export function storeName(url, html = '') {
  const site = meta(html, ['og:site_name', 'application-name']);
  if (site && site.length < 40) return site.replace(/\s*[|·-].*$/, '').trim();
  const h = hostOf(url).split('.')[0];
  return h ? h.charAt(0).toUpperCase() + h.slice(1) : '';
}

// Fallback: the product photo as a plain <img> (no preview tags on the page).
function pageImage(html, url) {
  const tag = (re) => re.exec(html)?.[1];
  let src = tag(/<link[^>]+rel=["']image_src["'][^>]*href=["']([^"']+)["']/i) || tag(/itemprop=["']image["'][^>]*(?:content|src)=["']([^"']+)["']/i);
  if (src) return src;
  const id = (/(\d{5,})/.exec(new URL(url).pathname) || [])[1];
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const srcOf = (t) => {
    const ss = /\s(?:data-)?srcset=["']([^"']+)["']/i.exec(t)?.[1];
    const one = /\s(?:data-src|src)=["']([^"']+)["']/i.exec(t)?.[1];
    return dec(one && !/^data:/.test(one) ? one : (ss ? ss.split(',')[0].trim().split(/\s+/)[0] : one || ''));
  };
  const ok = (u) => u && !/^data:/.test(u) && !/(logo|icon|sprite|pixel|badge|flag|payment|1x1|spacer)/i.test(u) && !/\.svg(\?|$)/i.test(u);
  const ranked = imgs.map((t) => ({ t, u: srcOf(t) })).filter((x) => ok(x.u));
  const pick = (id && ranked.find((x) => x.u.includes(id))) || ranked.find((x) => /(product|pdp|main|zoom|large|hero|primary)/i.test(x.t + x.u)) || ranked[0];
  return pick?.u || '';
}

export function parseProduct(html, url) {
  const ld = jsonLd(html).find((j) => /Product/i.test(String(j['@type'])));
  let name = ld?.name || meta(html, ['og:title', 'twitter:title']) || dec(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || '');
  // "Baby Floral Sock by Janie and Jack" → name + store
  let byStore = '';
  const by = / by ([A-Z][\w&'. -]{1,40})$/.exec(name.trim());
  if (by) { byStore = by[1].trim(); name = name.trim().slice(0, by.index); }
  name = name.replace(/\s*[|–-]\s*[^|–-]{0,40}$/, '').trim().slice(0, 120);
  let price = '';
  const offers = ld?.offers ? (Array.isArray(ld.offers) ? ld.offers[0] : ld.offers) : null;
  if (offers?.price != null) price = String(offers.price);
  else if (offers?.lowPrice != null) price = String(offers.lowPrice);
  if (!price) price = meta(html, ['product:price:amount', 'og:price:amount', 'price', 'twitter:data1']);
  if (!price) {
    const m = /itemprop=["']price["'][^>]*content=["']([\d.,]+)["']/i.exec(html) || /content=["']([\d.,]+)["'][^>]*itemprop=["']price["']/i.exec(html) || /["'](?:salePrice|sale_price|price)["']\s*:\s*["']?(\d+(?:[.,]\d{1,2})?)/i.exec(html) || /([\d]+\.\d{2})\s*USD/.exec(html);
    if (m) price = m[1];
  }
  if (!price) {
    const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
    const m = /\$\s?(\d{1,5}(?:[.,]\d{2})?)/.exec(text);
    if (m) price = m[1];
  }
  price = (price.match(/\d+(?:[.,]\d{1,2})?/) || [''])[0].replace(',', '.');
  let image = (ld?.image && (Array.isArray(ld.image) ? ld.image[0] : typeof ld.image === 'object' ? ld.image.url : ld.image)) || meta(html, ['og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src']) || pageImage(html, url);
  if (image && image.startsWith('//')) image = 'https:' + image;
  if (image && !/^https?:/.test(image)) { try { image = new URL(image, url).href; } catch { image = ''; } }
  const store = (ld?.brand && (typeof ld.brand === 'object' ? ld.brand.name : ld.brand)) || byStore || storeName(url, html);
  return { name, price, image, store: String(store || '').slice(0, 40), host: hostOf(url) };
}

export async function fetchImageAsDataUri(src) {
  try {
    const r = await fetch(src, { headers: { 'User-Agent': UA, Accept: 'image/*' }, redirect: 'follow', signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const type = r.headers.get('content-type') || 'image/jpeg';
    if (!/^image\//.test(type)) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 4 * 1024 * 1024) return null;
    return `data:${type.split(';')[0]};base64,${buf.toString('base64')}`;
  } catch { return null; }
}

export async function fetchLink(url) {
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9' }, redirect: 'follow', signal: AbortSignal.timeout(9000) });
    if (!r.ok) return { ok: false, url, store: storeName(url), host: hostOf(url) };
    const html = (await r.text()).slice(0, 1_500_000);
    const p = parseProduct(html, r.url || url);
    if (!p.name && !p.price && !p.image) return { ok: false, url, store: p.store, host: p.host };
    // Prefer a stored copy; if the store blocks the download, keep its image link and let the browser load it.
    const photo = p.image ? ((await fetchImageAsDataUri(p.image)) || p.image) : null;
    return { ok: true, url, ...p, photo };
  } catch {
    return { ok: false, url, store: storeName(url), host: hostOf(url) };
  }
}
