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

const KNOWN = { crateandbarrel: 'Crate & Barrel', cb2: 'CB2', potterybarn: 'Pottery Barn', westelm: 'West Elm', williams_sonoma: 'Williams Sonoma', 'williams-sonoma': 'Williams Sonoma', anthropologie: 'Anthropologie', urbanoutfitters: 'Urban Outfitters', freepeople: 'Free People', bedbathandbeyond: 'Bed Bath & Beyond', bestbuy: 'Best Buy', homedepot: 'Home Depot', lowes: "Lowe's", walmart: 'Walmart', amazon: 'Amazon', target: 'Target', asos: 'ASOS', zara: 'Zara', hm: 'H&M', nordstrom: 'Nordstrom', sephora: 'Sephora', ulta: 'Ulta', etsy: 'Etsy', janieandjack: 'Janie and Jack', lelabofragrances: 'Le Labo', ganni: 'Ganni', jcrew: 'J.Crew', madewell: 'Madewell', everlane: 'Everlane', ikea: 'IKEA', wayfair: 'Wayfair', rei: 'REI', apple: 'Apple', nike: 'Nike', adidas: 'adidas', uniqlo: 'Uniqlo', aritzia: 'Aritzia', revolve: 'Revolve', ssense: 'SSENSE', mrporter: 'Mr Porter', netaporter: 'Net-a-Porter', stokke: 'Stokke' };
export function storeName(url, html = '') {
  const site = meta(html, ['og:site_name', 'application-name']);
  if (site && site.length < 40) return site.replace(/\s*[|·-].*$/, '').trim();
  const h = hostOf(url).split('.')[0];
  if (KNOWN[h]) return KNOWN[h];
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
  name = name.replace(/\s*[|–-]\s*[^|–-]{0,40}$/, '').replace(/\s+:\s+[A-Z][\w&' .]{1,24}$/, '').trim().slice(0, 120);
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
    // Target-style embedded data, often inside a JS string with escaped quotes (\"current_retail\":9.99).
    const m = /\\?"current_retail\\?"\s*:\s*(\d+(?:\.\d{1,2})?)/.exec(html) || /\\?"formatted_current_price\\?"\s*:\s*\\?"\$(\d+(?:\.\d{2})?)/.exec(html);
    if (m) price = m[1];
  }
  if (!price) {
    // Rendered pages (Jina): the price element itself.
    const m = /data-test=["']product-price["'][^>]*>\s*(?:<[^>]+>\s*)*\$\s?(\d+(?:\.\d{2})?)/.exec(html) || /data-testid=["'](?:product-)?price["'][^>]*>\s*(?:<[^>]+>\s*)*\$\s?(\d+(?:\.\d{2})?)/.exec(html);
    if (m) price = m[1];
  }
  // No guessing from the first "$" on the page: it is often another product (carousels, "frequently bought").
  price = (price.match(/\d+(?:[.,]\d{1,2})?/) || [''])[0].replace(',', '.');
  let currency = String(offers?.priceCurrency || meta(html, ['product:price:currency', 'og:price:currency']) || (/itemprop=["']priceCurrency["'][^>]*content=["']([A-Z]{3})["']/i.exec(html) || [])[1] || (/"priceCurrency"\s*:\s*"([A-Z]{3})"/.exec(html) || [])[1] || '').toUpperCase().slice(0, 3);
  if (!/^[A-Z]{3}$/.test(currency)) currency = '';
  let image = (ld?.image && (Array.isArray(ld.image) ? ld.image[0] : typeof ld.image === 'object' ? ld.image.url : ld.image)) || meta(html, ['og:image:secure_url', 'og:image', 'twitter:image', 'twitter:image:src']) || pageImage(html, url);
  if (image && image.startsWith('//')) image = 'https:' + image;
  if (image && !/^https?:/.test(image)) { try { image = new URL(image, url).href; } catch { image = ''; } }
  const store = (ld?.brand && (typeof ld.brand === 'object' ? ld.brand.name : ld.brand)) || byStore || storeName(url, html);
  return { name, price, currency, image, store: String(store || '').slice(0, 40), host: hostOf(url) };
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
const BLOCKED = /access denied|just a moment|attention required|captcha|robot|forbidden|are you a human|pardon our interruption|request unsuccessful|not available in your region/i;

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
    const q = new URLSearchParams({ url, 'data.photo.selector': 'img[src*="/products/"], img[src*="product"], main img, picture img', 'data.photo.attr': 'src', 'data.photo.type': 'image' });
    const r = await fetch(`https://api.microlink.io/?${q}`, { signal: AbortSignal.timeout(15000) });
    const j = await r.json();
    const d = j?.data;
    if (j?.status !== 'success' || !d) return null;
    const image = [d.image?.url, d.photo?.url, typeof d.photo === 'string' ? d.photo : null].find((x) => x && !/\.svg(\?|$)|logo|favicon|bimi/i.test(x)) || '';
    const name = String(d.title || '').replace(/\s*[|–-]\s*[^|–-]{0,40}$/, '').trim().slice(0, 120);
    // No price from the description: it is marketing text ("free shipping on orders $35+").
    const price = '';
    if (BLOCKED.test(name)) return null;
    if (!name && !image) return null;
    return { name, price, image, store: String(d.publisher || storeName(url)).replace(/\s*[|·-].*$/, '').slice(0, 40), host: hostOf(url) };
  } catch { return null; }
}

async function withPhoto(url, p) {
  const photo = p.image ? ((await fetchImageAsDataUri(p.image)) || p.image) : null;
  return { ok: true, url, ...p, ...(await inDollars(url, p)), photo };
}

// Prices in another currency: keep the store's price, fill in dollars at today's rate (ECB, via Frankfurter).
const TLD_CUR = [[/\.(co\.)?uk$/, 'GBP'], [/\.(de|fr|it|es|nl|ie|be|at|pt|fi|gr)$/, 'EUR'], [/\.ca$/, 'CAD'], [/\.(com\.)?au$/, 'AUD'], [/\.(co\.)?jp$/, 'JPY'], [/\.ch$/, 'CHF'], [/\.(se)$/, 'SEK'], [/\.(dk)$/, 'DKK'], [/\.(no)$/, 'NOK'], [/\.(co\.)?nz$/, 'NZD'], [/\.mx$/, 'MXN']];
async function inDollars(url, p) {
  if (!p.price) return {};
  let cur = p.currency || '';
  if (!cur) { const h = hostOf(url); cur = (TLD_CUR.find(([re]) => re.test(h)) || [])[1] || 'USD'; }
  if (cur === 'USD') return { currency: 'USD' };
  const amount = parseFloat(p.price);
  try {
    const r = await fetch(`https://api.frankfurter.dev/v1/latest?base=${cur}&symbols=USD`, { signal: AbortSignal.timeout(6000) });
    const rate = (await r.json())?.rates?.USD;
    if (!rate) throw new Error('no rate');
    return { price: (amount * rate).toFixed(2), currency: 'USD', origPrice: amount.toFixed(2), origCurrency: cur };
  } catch {
    // Unknown rate: leave the dollar price for the person to type, but show what the store says.
    return { price: '', currency: 'USD', origPrice: amount.toFixed(2), origCurrency: cur };
  }
}

export async function fetchLink(url) {
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  url = cleanUrl(url);
  // Stores with a public product feed (ASOS, Shopify shops) answer there even when the page blocks us.
  const api = await storeApi(url);
  if (api?.name && api?.image) return withPhoto(url, api);
  const direct = await fetchDirect(url);
  if (direct.ok && direct.image && direct.name && direct.price) return withPhoto(url, direct);
  if (api?.name && api?.image && !api.price) {
    const j = await viaJina(url);
    return withPhoto(url, { ...api, price: direct.price || j?.price || '' });
  }
  if (direct.ok && direct.image && direct.name) {
    const j = await viaJina(url);
    return withPhoto(url, { ...direct, price: j?.price || '', currency: direct.currency || j?.currency || '' });
  }
  // Free real-browser read through Jina Reader (r.jina.ai): works for many stores that block plain requests.
  const jina = await viaJina(url);
  if (jina?.ok && jina.name && jina.image) return withPhoto(url, { ...jina, price: jina.price || direct.price || '' });
  // Free: the Internet Archive's copy of the page (or a fresh save of it), for stores that block everyone else.
  const arch = await viaArchive(url);
  if (arch?.ok && arch.name && arch.image) return withPhoto(url, { ...arch, price: arch.price || direct.price || '' });
  // Paid fallback, only if a key is set: ScrapingBee.
  const rendered = await viaBrowser(url);
  if (rendered?.ok && rendered.name && rendered.image) return withPhoto(url, { ...rendered, price: rendered.price || direct.price || '' });
  const pv = await viaPreview(url);
  if (pv) return withPhoto(url, { ...pv, name: direct.name || pv.name, price: direct.price || pv.price, image: direct.image || pv.image, store: direct.ok ? direct.store : pv.store });
  if (direct.ok) return withPhoto(url, direct);
  if (jina?.ok && jina.name) return withPhoto(url, { ...jina, price: jina.price || direct.price || '' });
  if (api?.name) return { ...(await withPhoto(url, api)), imageCandidates: imageCandidates(url) };
  // Last resort: the product name is usually in the link itself. The phone then tries likely photo addresses itself.
  const guess = nameFromUrl(url);
  if (guess) {
    const [found, price] = await Promise.all([viaImageSearch(url, guess), priceFromSearch(url, guess)]);
    // The phone loads these itself (store image servers let browsers in) and keeps the first that works.
    return { ok: true, partial: !found.length, url, name: guess, price: price || '', currency: 'USD', image: '', photo: null, store: storeName(url), host: hostOf(url), imageCandidates: [...found, ...imageCandidates(url)] };
  }
  return { ok: false, url, store: storeName(url), host: hostOf(url) };
}

// Jina Reader: free (rate-limited; JINA_API_KEY raises the limit). Returns the page's HTML after a browser loads it.
export async function viaJina(url, { debug = false } = {}) {
  try {
    const headers = { 'X-Return-Format': 'html', 'X-Timeout': '20', 'X-Locale': 'en-US', Accept: 'text/html' };
    if (process.env.JINA_API_KEY) headers.Authorization = `Bearer ${process.env.JINA_API_KEY}`;
    const r = await fetch(`https://r.jina.ai/${url}`, { headers, signal: AbortSignal.timeout(30000) });
    const html = (await r.text()).slice(0, 2_000_000);
    if (!r.ok) return debug ? { ok: false, status: r.status, body: html.slice(0, 160) } : null;
    const p = parseProduct(html, url);
    if (BLOCKED.test(p.name)) return debug ? { ok: false, blocked: p.name } : null;
    if (!p.name && !p.image) return debug ? { ok: false, empty: true, bytes: html.length } : null;
    return { ok: true, ...p };
  } catch (e) { return debug ? { ok: false, error: e.message } : null; }
}

// Photo addresses worth trying from the phone itself (stores' image servers rarely block real browsers).
export function imageCandidates(url) {
  try {
    const u = new URL(url);
    const asos = /asos\.com$/.test(u.hostname) && /\/prd\/(\d+)/.exec(u.pathname);
    if (asos) {
      const slug = u.pathname.split('/').filter((x) => /-/.test(x)).sort((a, b) => b.length - a.length)[0] || 'p';
      const colour = (/-in-([a-z-]+?)(?:-part-of|-exclusive|$)/.exec(slug) || [])[1] || '';
      const cs = [colour, colour.split('-').pop(), ''].filter((x, i, a) => a.indexOf(x) === i);
      return cs.map((c) => `https://images.asos-media.com/products/${slug}/${asos[1]}-1${c ? '-' + c : ''}?$XXL$`);
    }
  } catch {}
  return [];
}

// The Internet Archive (free): use the latest saved copy of the page; if there is none, ask it to save one now.
// Its own crawler is often let in where ours is not. Prices may be a little old, which is fine for "About".
export async function viaArchive(url, { debug = false } = {}) {
  const log = [];
  const bare = url.replace(/[?#].*$/, '');
  const read = async (snap) => {
    const raw = snap.replace(/\/web\/(\d{14})\//, '/web/$1id_/');
    const r = await fetch(raw, { headers: BROWSER, redirect: 'follow', signal: AbortSignal.timeout(15000) });
    log.push(`snapshot ${r.status}`);
    if (!r.ok) return null;
    const p = parseProduct((await r.text()).slice(0, 2_000_000), url);
    if (BLOCKED.test(p.name) || (!p.name && !p.image)) { log.push('snapshot blocked or empty'); return null; }
    return { ok: true, ...p };
  };
  try {
    const a = await fetch(`https://archive.org/wayback/available?url=${encodeURIComponent(bare)}`, { signal: AbortSignal.timeout(8000) });
    const snap = (await a.json())?.archived_snapshots?.closest;
    log.push(`available ${a.status} ${snap?.status || 'none'}`);
    if (snap?.available && snap.status === '200') { const got = await read(snap.url); if (got) return debug ? { ...got, log } : got; }
    // No usable copy: ask for a fresh save (can take ~20s), then read what it saved.
    const sv = await fetch(`https://web.archive.org/save/${bare}`, { headers: BROWSER, redirect: 'follow', signal: AbortSignal.timeout(28000) });
    log.push(`save ${sv.status} ${sv.url.slice(0, 60)}`);
    if (sv.ok && /\/web\/\d{14}/.test(sv.url)) { const got = await read(sv.url); if (got) return debug ? { ...got, log } : got; }
  } catch (e) { log.push(e.message); }
  return debug ? { ok: false, log } : null;
}

// Last free resort for stores that block every reader: look the product up in a public image search and keep
// only results hosted by that store's own image server, so the photo is the store's own product shot.
const STORE_IMG = { crateandbarrel: /(cb\.scene7\.com\/is\/image\/Crate|images\.crateandbarrel\.com)/i, cb2: /(cb\.scene7\.com\/is\/image\/CB2|images\.cb2\.com)/i, potterybarn: /assets\.pbimgs\.com/i, westelm: /assets\.weimgs\.com/i, williams_sonoma: /assets\.wsimgs\.com/i, 'williams-sonoma': /assets\.wsimgs\.com/i, anthropologie: /images\.urbndata\.com/i, urbanoutfitters: /images\.urbndata\.com/i, freepeople: /images\.urbndata\.com/i, nordstrom: /n\.nordstrommedia\.com/i, zara: /static\.zara\.net/i, lelabofragrances: /lelabofragrances\.com/i };
export async function viaImageSearch(url, name, { debug = false } = {}) {
  const key = hostOf(url).split('.')[0];
  const want = STORE_IMG[key] || new RegExp(key.replace(/[^a-z0-9]/gi, ''), 'i');
  const q = `${name} ${KNOWN[key] || key}`.slice(0, 180);
  const log = [];
  const found = [];
  const add = (u) => { u = dec(u).replace(/\\\//g, '/'); if (/^https?:\/\//.test(u) && want.test(u) && !found.includes(u)) found.push(u); };
  try {
    const r = await fetch(`https://www.bing.com/images/search?q=${encodeURIComponent(q)}&form=HDRSC2&first=1`, { headers: { ...BROWSER, Accept: 'text/html' }, signal: AbortSignal.timeout(8000) });
    const html = await r.text();
    log.push(`bing ${r.status} ${html.length}`);
    for (const m of html.matchAll(/murl&quot;:&quot;(.*?)&quot;/g)) add(m[1]);
    for (const m of html.matchAll(/"murl":"(.*?)"/g)) add(m[1]);
  } catch (e) { log.push('bing ' + e.message); }
  if (!found.length) {
    try {
      const h = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(q)}&iax=images&ia=images`, { headers: { ...BROWSER, Accept: 'text/html' }, signal: AbortSignal.timeout(8000) });
      const vqd = (/vqd=["']?([\d-]+)/.exec(await h.text()) || [])[1];
      log.push(`ddg ${h.status} vqd ${vqd ? 'yes' : 'no'}`);
      if (vqd) {
        const r = await fetch(`https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(q)}&vqd=${vqd}&f=,,,&p=1`, { headers: { ...BROWSER, Accept: 'application/json', Referer: 'https://duckduckgo.com/' }, signal: AbortSignal.timeout(8000) });
        const j = await r.json().catch(() => ({}));
        log.push(`ddg images ${r.status} ${(j.results || []).length}`);
        for (const x of j.results || []) add(x.image || '');
      }
    } catch (e) { log.push('ddg ' + e.message); }
  }
  log.push(`store photos ${found.length}`);
  return debug ? { found: found.slice(0, 5), log } : found.slice(0, 5);
}

// Price for blocked stores: a web search result for that exact product page often shows its price in the snippet.
// Only a result that links to the same product page counts, so another shop's price is never used.
export async function priceFromSearch(url, name, { debug = false } = {}) {
  const u = new URL(url);
  const path = u.pathname.replace(/\/$/, '');
  const id = (/(\d{5,})/.exec(path) || [])[1];
  const q = `${name} ${KNOWN[hostOf(url).split('.')[0]] || hostOf(url)}`;
  const log = [];
  const pick = (block) => (/\$\s?(\d{1,5}(?:,\d{3})?(?:\.\d{2})?)/.exec(block.replace(/<[^>]+>/g, ' ')) || [])[1];
  const same = (href) => { const h = dec(href); return h.includes(hostOf(url)) && (id ? h.includes(id) : h.includes(path)); };
  try {
    const r = await fetch(`https://www.bing.com/search?q=${encodeURIComponent(q)}&setlang=en-US&cc=US`, { headers: { ...BROWSER, Accept: 'text/html' }, signal: AbortSignal.timeout(8000) });
    const html = await r.text();
    log.push(`bing ${r.status}`);
    for (const b of html.split(/<li class="b_algo/).slice(1)) {
      const href = (/href="([^"]+)"/.exec(b) || [])[1] || '';
      if (same(href)) { const p = pick(b.slice(0, 4000)); log.push(`bing match ${p || 'no price'}`); if (p) return debug ? { price: p.replace(',', ''), log } : p.replace(',', ''); }
    }
  } catch (e) { log.push('bing ' + e.message); }
  try {
    const r = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`, { headers: { ...BROWSER, Accept: 'text/html' }, signal: AbortSignal.timeout(8000) });
    const html = await r.text();
    log.push(`ddg ${r.status}`);
    for (const b of html.split(/class="result results_links/).slice(1)) {
      const href = (/href="([^"]+)"/.exec(b) || [])[1] || '';
      if (same(decodeURIComponent(href))) { const p = pick(b.slice(0, 4000)); log.push(`ddg match ${p || 'no price'}`); if (p) return debug ? { price: p.replace(',', ''), log } : p.replace(',', ''); }
    }
  } catch (e) { log.push('ddg ' + e.message); }
  return debug ? { price: '', log } : '';
}

// SCRAPINGBEE_API_KEY: renders the page in a real browser from a home-like connection.
// Tries the cheaper premium proxy first (25 credits), then stealth (75) if the store still blocks it.
export async function viaBrowser(url, { debug = false } = {}) {
  const key = process.env.SCRAPINGBEE_API_KEY;
  if (!key) return debug ? { skipped: 'no SCRAPINGBEE_API_KEY' } : null;
  const tries = [{ premium_proxy: 'true' }, { stealth_proxy: 'true' }];
  const log = [];
  for (const t of tries) {
    try {
      const q = new URLSearchParams({ api_key: key, url, render_js: 'true', country_code: 'us', block_resources: 'false', wait: '1500', ...t });
      const r = await fetch(`https://app.scrapingbee.com/api/v1/?${q}`, { signal: AbortSignal.timeout(45000) });
      const html = (await r.text()).slice(0, 2_000_000);
      if (!r.ok) { log.push(`${Object.keys(t)[0]}: ${r.status} ${html.slice(0, 120)}`); continue; }
      const p = parseProduct(html, url);
      if (/access denied|just a moment|attention required|captcha|robot/i.test(p.name)) { log.push(`${Object.keys(t)[0]}: blocked page`); continue; }
      if (p.name && p.image) return debug ? { ok: true, via: Object.keys(t)[0], ...p, log } : { ok: true, ...p };
      log.push(`${Object.keys(t)[0]}: page read, name ${p.name ? 'yes' : 'no'}, image ${p.image ? 'yes' : 'no'}`);
    } catch (e) { log.push(`${Object.keys(t)[0]}: ${e.message}`); }
  }
  return debug ? { ok: false, log } : null;
}

let debugLog = null;
const BROWSER = { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36', Accept: 'application/json,text/plain,*/*', 'Accept-Language': 'en-US,en;q=0.9' };

async function getJson(u, extra = {}) {
  try {
    const host = new URL(u).hostname;
    const ref = /redsky\.target\.com$/.test(host) ? { Origin: 'https://www.target.com', Referer: 'https://www.target.com/' } : {};
    const r = await fetch(u, { headers: { ...BROWSER, ...ref, ...extra }, redirect: 'follow', signal: AbortSignal.timeout(8000) });
    if (debugLog) debugLog.push(`${host}: ${r.status}`);
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
      return { ok: true, name: dec(j.name).slice(0, 120), price: price != null ? String(price).replace(/[^\d.]/g, '') : '', image: img ? (img.startsWith('http') ? img : 'https://' + img) + '?$XXL$' : '', store: j.brand?.name || 'ASOS', currency: 'USD', host: hostOf(url) };
    }
  }
  if (asos) {
    // Feed blocked too: ASOS photos live on its image CDN as <slug>/<id>-1-<colour>.
    const slug = (u.pathname.split('/').filter((x) => /-/.test(x)).sort((a, b) => b.length - a.length)[0] || 'p');
    const colour = (/-in-([a-z-]+?)(?:-part-of|-exclusive|$)/.exec(slug) || [])[1] || '';
    for (const c of [colour, colour.split('-').pop(), ''].filter((x, i, a) => a.indexOf(x) === i)) {
      const img = `https://images.asos-media.com/products/${slug}/${asos[1]}-1${c ? '-' + c : ''}?$XXL$`;
      try {
        const r = await fetch(img, { headers: { ...BROWSER, Accept: 'image/*', Referer: 'https://www.asos.com/' }, signal: AbortSignal.timeout(6000) });
        if (r.ok && /^image\//.test(r.headers.get('content-type') || '')) return { ok: true, name: nameFromUrl(url), price: '', image: img, store: 'ASOS', host: hostOf(url) };
      } catch {}
    }
  }
  // Target: /A-<tcin> → its public product feed (the same one target.com's pages use).
  const tgt = /(^|\.)target\.com$/.test(u.hostname) && /\/A-(\d{5,})/.exec(u.pathname);
  if (tgt) {
    let j = null;
    for (const key of ['9f36aeafbe60771e321a7cc95a78140772ab3e96', 'ff457966e64d5e877fdbad070f276d18ecec4a01']) {
      j = await getJson(`https://redsky.target.com/redsky_aggregations/v1/web/pdp_client_v1?key=${key}&tcin=${tgt[1]}&store_id=3991&pricing_store_id=3991&has_pricing_store_id=true&is_bot=false`);
      if (j?.data?.product) break;
    }
    const pr = j?.data?.product;
    if (pr) {
      const item = pr.item || {};
      const price = pr.price?.current_retail ?? pr.price?.reg_retail ?? (pr.price?.formatted_current_price || '').replace(/[^\d.]/g, '');
      const img = item.enrichment?.images?.primary_image_url || '';
      return { ok: true, name: dec(item.product_description?.title || '').slice(0, 120), price: price ? String(price) : '', image: img, store: 'Target', currency: 'USD', host: hostOf(url) };
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
      const cart = await getJson(`${u.origin}/cart.js`);
      return { ok: true, currency: cart?.currency || '', name: dec(j.title).slice(0, 120), price: cents != null ? (Number(cents) / 100).toFixed(2) : '', image: (v?.featured_image?.src || img || '').replace(/^\/\//, 'https://'), store: storeName(url) || j.vendor || '', host: hostOf(url) };
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
    if (BLOCKED.test(p.name)) return { ok: false };
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
    const q = new URLSearchParams({ url, 'data.photo.selector': 'img[src*="/products/"], img[src*="product"], main img, picture img', 'data.photo.attr': 'src', 'data.photo.type': 'image' });
    const r = await fetch(`https://api.microlink.io/?${q}`, { signal: AbortSignal.timeout(15000) });
    const j = await r.json();
    out.preview = { status: j?.status, title: j?.data?.title, image: j?.data?.image?.url, photo: j?.data?.photo, publisher: j?.data?.publisher, message: j?.message };
  } catch (e) { out.preview = { error: String(e?.message || e) }; }
  debugLog = [];
  out.storeFeed = await storeApi(url);
  out.feedCalls = debugLog; debugLog = null;
  out.jina = await viaJina(url, { debug: true });
  out.archive = await viaArchive(url, { debug: true });
  out.imageSearch = await viaImageSearch(url, nameFromUrl(url), { debug: true });
  out.priceSearch = await priceFromSearch(url, nameFromUrl(url), { debug: true });
  if (process.env.SCRAPINGBEE_API_KEY) out.browser = await viaBrowser(url, { debug: true });
  out.imageCandidates = imageCandidates(url);
  const full = await fetchLink(raw);
  out.result = { ok: full.ok, partial: !!full.partial, name: full.name, store: full.store, price: full.price, image: full.image, photoStored: !!(full.photo && full.photo.startsWith('data:')) };
  return out;
}
