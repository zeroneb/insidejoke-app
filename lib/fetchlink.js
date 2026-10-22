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

// Drop ad and tracking params (gclid, utm_*, gad_*, …) so stores serve the plain product page.
export function cleanUrl(url) {
  try {
    const u = new URL(url);
    for (const k of [...u.searchParams.keys()]) if (/^(utm_|gad_|gclid|gbraid|wbraid|fbclid|msclkid|source$|srsltid|_ga)/i.test(k)) u.searchParams.delete(k);
    return u.href;
  } catch { return url; }
}

// Second try when a store blocks us: a link-preview service that renders the page like a browser.
async function viaPreview(url) {
  try {
    const r = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(12000) });
    const j = await r.json();
    const d = j?.data;
    if (j?.status !== 'success' || !d) return null;
    const image = [d.image?.url].find((x) => x && !/\.svg(\?|$)|logo|favicon|bimi/i.test(x)) || '';
    const name = String(d.title || '').replace(/\s*[|–-]\s*[^|–-]{0,40}$/, '').trim().slice(0, 120);
    const price = (/\$\s?(\d{1,5}(?:[.,]\d{2})?)/.exec(d.description || '') || [])[1] || '';
    if (!name && !image) return null;
    return { name, price, image, store: String(d.publisher || storeName(url)).replace(/\s*[|·-].*$/, '').slice(0, 40), host: hostOf(url) };
  } catch { return null; }
}

async function withPhoto(url, p) {
  const photo = p.image ? ((await fetchImageAsDataUri(p.image)) || p.image) : null;
  return { ok: true, url, ...p, photo };
}

export async function fetchLink(url) {
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  url = cleanUrl(url);
  // Stores with a public product feed (ASOS, Shopify shops) answer there even when the page blocks us.
  const api = await storeApi(url);
  if (api?.name && api?.image) return withPhoto(url, api);
  const direct = await fetchDirect(url);
  if (direct.ok && direct.image && direct.name) return withPhoto(url, direct);
  const pv = await viaPreview(url);
  if (pv) return withPhoto(url, { ...pv, name: direct.name || pv.name, price: direct.price || pv.price, image: direct.image || pv.image, store: direct.ok ? direct.store : pv.store });
  if (direct.ok) return withPhoto(url, direct);
  if (api?.name) return withPhoto(url, api);
  // Last resort: the product name is usually in the link itself.
  const guess = nameFromUrl(url);
  if (guess) return { ok: true, partial: true, url, name: guess, price: '', image: '', photo: null, store: storeName(url), host: hostOf(url) };
  return { ok: false, url, store: storeName(url), host: hostOf(url) };
}

const BROWSER = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36', Accept: 'application/json,text/plain,*/*', 'Accept-Language': 'en-US,en;q=0.9' };

async function getJson(u) {
  try {
    const r = await fetch(u, { headers: BROWSER, redirect: 'follow', signal: AbortSignal.timeout(8000) });
    if (!r.ok || !/json|javascript/.test(r.headers.get('content-type') || '')) return null;
    return await r.json();
  } catch { return null; }
}

export async function storeApi(url) {
  let u;
  try { u = new URL(url); } catch { return null; }
  // ASOS: /prd/<id>
  const asos = /asos\.com$/.test(u.hostname) && /\/prd\/(\d+)/.exec(u.pathname);
  if (asos) {
    const j = await getJson(`https://www.asos.com/api/product/catalogue/v4/products/${asos[1]}?store=US&lang=en-US&currency=USD&sizeSchema=US`);
    if (j?.name) {
      const img = j.media?.images?.[0]?.url;
      const price = j.price?.current?.value ?? j.price?.current?.text;
      return { ok: true, name: dec(j.name).slice(0, 120), price: price != null ? String(price).replace(/[^\d.]/g, '') : '', image: img ? (img.startsWith('http') ? img : 'https://' + img) + '?$XXL$' : '', store: j.brand?.name || 'ASOS', host: hostOf(url) };
    }
  }
  if (asos) {
    // Feed blocked too: ASOS photos live on its image CDN as <slug>/<id>-1-<colour>.
    const slug = (u.pathname.split('/').filter((x) => /-/.test(x)).sort((a, b) => b.length - a.length)[0] || 'p');
    const colour = (/-in-([a-z-]+?)(?:-part-of|-exclusive|$)/.exec(slug) || [])[1] || '';
    for (const c of [colour, colour.split('-').pop(), ''].filter((x, i, a) => a.indexOf(x) === i)) {
      const img = `https://images.asos-media.com/products/${slug}/${asos[1]}-1${c ? '-' + c : ''}?$XXL$`;
      try {
        const r = await fetch(img, { method: 'HEAD', headers: BROWSER, signal: AbortSignal.timeout(5000) });
        if (r.ok && /^image\//.test(r.headers.get('content-type') || '')) return { ok: true, name: nameFromUrl(url), price: '', image: img, store: 'ASOS', host: hostOf(url) };
      } catch {}
    }
  }
  // Shopify shops: /products/<handle> has a .js feed with title, price, photo and vendor.
  const shop = /\/products\/([^/?#]+)/.exec(u.pathname);
  if (shop) {
    const j = await getJson(`${u.origin}/products/${shop[1]}.js`);
    if (j?.title) {
      let img = j.featured_image || j.images?.[0] || '';
      if (img.startsWith('//')) img = 'https:' + img;
      const variant = u.searchParams.get('variant');
      const v = (variant && j.variants?.find((x) => String(x.id) === variant)) || j.variants?.[0];
      const cents = v?.price ?? j.price;
      return { ok: true, name: dec(j.title).slice(0, 120), price: cents != null ? (Number(cents) / 100).toFixed(2) : '', image: (v?.featured_image?.src || img || '').replace(/^\/\//, 'https://'), store: storeName(url) || j.vendor || '', host: hostOf(url) };
    }
  }
  return null;
}

// "…/asos-design-flocked-mesh-low-rise-maxi-skirt-in-red-part-of-a-set/prd/208065150" → "Asos design flocked mesh low rise maxi skirt in red"
export function nameFromUrl(url) {
  try {
    const segs = new URL(url).pathname.split('/').map((x) => decodeURIComponent(x).replace(/\.(html?|php|aspx?)$/i, ''));
    const best = segs.filter((x) => /[a-z]/i.test(x) && /[-_]/.test(x)).sort((a, b) => b.length - a.length)[0];
    if (!best) return '';
    let words = best.split(/[-_]+/).filter((w) => w && !/^\d{4,}$/.test(w) && !/^[a-z]?\d+[a-z]?$/i.test(w));
    const cut = words.findIndex((w, i) => w === 'part' && words[i + 1] === 'of');
    if (cut > 2) words = words.slice(0, cut);
    const s = words.join(' ').trim();
    return s.length > 3 ? (s[0].toUpperCase() + s.slice(1)).slice(0, 120) : '';
  } catch { return ''; }
}

async function fetchDirect(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9' }, redirect: 'follow', signal: AbortSignal.timeout(9000) });
    if (!r.ok) return { ok: false };
    const html = (await r.text()).slice(0, 1_500_000);
    const p = parseProduct(html, r.url || url);
    // Bot walls return a page with no product on it.
    if (!p.name && !p.price && !p.image) return { ok: false };
    if (/access denied|just a moment|attention required|captcha/i.test(p.name)) return { ok: false };
    return { ok: true, ...p };
  } catch {
    return { ok: false };
  }
}

// For /api/link: what each step saw, without the image bytes.
export async function debugLink(raw) {
  let url = /^https?:\/\//i.test(raw) ? raw : 'https://' + raw;
  url = cleanUrl(url);
  const out = { url };
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9' }, redirect: 'follow', signal: AbortSignal.timeout(9000) });
    const html = (await r.text()).slice(0, 1_500_000);
    out.direct = { status: r.status, bytes: html.length, title: (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html) || [])[1]?.trim().slice(0, 80), ...parseProduct(html, r.url || url) };
  } catch (e) { out.direct = { error: String(e?.message || e) }; }
  try {
    const r = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(12000) });
    const j = await r.json();
    out.preview = { status: j?.status, title: j?.data?.title, image: j?.data?.image?.url, publisher: j?.data?.publisher, message: j?.message };
  } catch (e) { out.preview = { error: String(e?.message || e) }; }
  out.storeFeed = await storeApi(url);
  const full = await fetchLink(raw);
  out.result = { ok: full.ok, partial: !!full.partial, name: full.name, store: full.store, price: full.price, image: full.image, photoStored: !!(full.photo && full.photo.startsWith('data:')) };
  return out;
}
