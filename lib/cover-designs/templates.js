// The v1 list covers (Option 20 on the design canvas), as HTML for a 390 × 480 box.
// Every cover is a template: the list name is the title, other words are named slots people can edit.
// Pure functions, no data access: safe on the server and in the browser.
import { TRI, CAKE, BOUQUET, ISO, DRAWN, ICONS, DECKLE } from './art';

export const W = 390, H = 480;

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const words = (t) => String(t || '').trim().split(/\s+/).filter(Boolean);
const longest = (ws) => Math.max(1, ...ws.map((w) => w.length));
function rng(seed) {
  let h = 2166136261;
  for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => { h = (h + 0x6D2B79F5) | 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const boil = (fill, style) => `<svg aria-hidden="true" style="${style}" viewBox="0 0 200 200" preserveAspectRatio="none">${TRI.map((d, i) => `<path class="b${i + 1}" d="${d}" fill="${fill}"></path>`).join('')}</svg>`;
const grain = (u, color, alpha = '.55', freq = '.95') => {
  const [r, g, b] = [1, 3, 5].map((i) => (parseInt(color.slice(i, i + 2), 16) / 255).toFixed(3));
  return `<svg aria-hidden="true" width="390" height="480" style="position: absolute; inset: 0; pointer-events: none"><filter id="${u}g"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" seed="7"></feTurbulence><feColorMatrix values="0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  0 0 0 2.2 -1.1"></feColorMatrix></filter><rect width="390" height="480" filter="url(#${u}g)" opacity="${alpha}"></rect></svg>`;
};

// ---- the covers ----
// Each takes (title, palette, slots, uid, ctx) and returns the inner HTML of the 390 × 480 box.

function friend(t, p, s, u) {
  const ws = words(t);
  // Inside the ring: longer names put the last word on its own line, sized to stay inside the circle.
  const brk = ws.length > 1 && t.length > 10;
  const lineLen = brk ? Math.max(ws.slice(0, -1).join(' ').length, ws[ws.length - 1].length) : t.length;
  const fs = Math.min(52, Math.floor(200 / (Math.max(1, lineLen) * 0.45)));
  const title = ws.length > 1 ? `${esc(ws.slice(0, -1).join(' '))}${brk ? '<br>' : ' '}<span style="font-weight: 600">${esc(ws[ws.length - 1])}</span>` : `<span style="font-weight: 600">${esc(t)}</span>`;
  const ring = `${s.ring} · `.repeat(2);
  return `<div style="position: absolute; inset: 0; background: ${p.g}"></div>
${boil(p.b, 'position: absolute; left: -5px; top: 67px; width: 400px; height: 340px')}
<svg aria-hidden="true" style="position: absolute; left: 60px; top: 102px" width="270" height="270" viewBox="0 0 270 270"><g><animateTransform attributeName="transform" type="rotate" from="0 135 135" to="360 135 135" dur="50s" repeatCount="indefinite"></animateTransform><path id="${u}r" d="M135 135 m-112 0 a112 112 0 1 1 224 0 a112 112 0 1 1 -224 0" fill="none"></path><text style="font-family: 'EB Garamond', serif; font-size: 15px; fill: ${p.ring}"><textPath href="#${u}r" data-slot="ring">${esc(ring)}</textPath></text></g></svg>
<h1 data-slot="title" style="position: absolute; left: 40px; right: 40px; top: 237px; transform: translateY(-50%); margin: 0; text-align: center; font-family: 'EB Garamond', serif; font-weight: 400; font-size: ${fs}px; line-height: .92; color: ${p.k}; overflow-wrap: anywhere">${title}</h1>`;
}

function stickers(t, p, s, u) {
  const S = 66, X0 = 30, Y0 = 58;
  const cells = [];
  for (let c = 0; c < 5; c++) cells.push([c, 0]);
  for (let r = 1; r < 5; r++) cells.push([4, r]);
  for (let c = 4; c >= 0; c--) cells.push([c, 5]);
  for (let r = 4; r > 0; r--) cells.push([0, r]);
  const tiles = cells.map(([c, r], n) => `<div style="position: absolute; left: ${X0 + c * S}px; top: ${Y0 + r * S}px; width: ${S}px; height: ${S}px; background: ${(c + r) % 2 === 0 ? p.A : p.B}; display: flex; align-items: center; justify-content: center"><svg aria-hidden="true" width="56" height="56" viewBox="0 0 100 100" style="overflow: visible; animation: cv-stick 7s ease-in-out ${(n * 7 / cells.length).toFixed(2)}s infinite">${ICONS[n].replace(/__K__/g, p.k).replace(/__U__/g, u)}</svg></div>`).join('');
  const filt = `<svg aria-hidden="true" width="0" height="0" style="position: absolute"><filter id="${u}w" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="2"><animate attributeName="seed" values="2;7;13" dur=".66s" calcMode="discrete" repeatCount="indefinite"></animate></feTurbulence><feDisplacementMap in="SourceGraphic" scale="3.5"></feDisplacementMap></filter></svg>`;
  const ws = words(t);
  let l1, l2, lng;
  if (ws.length >= 3) { l1 = `${esc(ws[0])}<span style="font-size: .38em; vertical-align: .9em; margin: 0 .12em">${esc(ws[1])}</span>`; l2 = esc(ws.slice(2).join(' ')); lng = Math.max(ws.slice(2).join(' ').length, ws[0].length + 1); }
  else if (ws.length === 2) { l1 = esc(ws[0]); l2 = esc(ws[1]); lng = longest(ws); }
  else { l1 = esc(t); l2 = ''; lng = t.length || 1; }
  const fs = Math.min(50, 188 / (lng * 0.66));
  return `${filt}<div style="position: absolute; inset: 0; background: ${p.paper}"></div>
<div style="position: absolute; left: ${X0 - 6}px; top: ${Y0 - 6}px; width: ${S * 5 + 12}px; height: ${S * 6 + 12}px; background: ${p.B}"></div>
${tiles}
<div style="position: absolute; left: ${X0 + S}px; top: ${Y0 + S}px; width: ${S * 3}px; height: ${S * 4}px; background: ${p.paper}; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; text-align: center; color: ${p.k}">
<div data-slot="title" style="font-family: 'Bagel Fat One', sans-serif; font-size: ${fs.toFixed(0)}px; line-height: .95; text-transform: uppercase; text-shadow: 2px 1.5px 0 ${p.A}; animation: cv-thud .9s cubic-bezier(.3,1.4,.5,1) both; overflow-wrap: anywhere"><div>${l1}</div><div>${l2}</div></div>
<svg aria-hidden="true" width="80" height="20" viewBox="0 0 80 20"><g filter="url(#${u}w)"><path d="M2 10 C 12 2, 18 18, 28 10 S 44 2, 52 10" fill="none" stroke="${p.k}" stroke-width="2.4" stroke-linecap="round"></path><path d="M62 7 c 2 -5 9 -4 8 1 c -1 4 -8 8 -8 8 c 0 0 -7 -4 -8 -8 c -1 -5 6 -6 8 -1 z" fill="${p.A}" stroke="${p.k}" stroke-width="2"></path></g></svg>
<div data-slot="sign" style="font-family: 'Bagel Fat One', sans-serif; font-size: 15px; letter-spacing: .04em; text-transform: uppercase">${esc(s.sign)}</div></div>
${grain(u, p.paper, '.55')}`;
}

function drawn(t, p, s, u) {
  const ws = words(t);
  const mid = Math.ceil(ws.length / 2);
  const l1 = ws.slice(0, mid).join(' '), l2 = ws.slice(mid).join(' ');
  const m = Math.max(l1.length, l2.length);
  const fs = m <= 9 ? 66 : m <= 12 ? 50 : Math.max(30, Math.floor(320 / (m * 0.52)));
  const vals = DRAWN.concat([DRAWN[0]]).join(';');
  const title = (fill) => `<text x="195" y="252" text-anchor="middle" font-family="'Familjen Grotesk', sans-serif" font-weight="600" font-size="${fs}" letter-spacing="-2" fill="${fill}"><tspan x="195">${esc(l1)}</tspan><tspan x="195" dy="${Math.round(fs * 0.92)}">${esc(l2)}</tspan></text>`;
  const stamp = (fill) => `<text x="195" y="150" text-anchor="middle" font-family="'Familjen Grotesk', sans-serif" font-weight="600" font-size="13" letter-spacing="1" fill="${fill}">${esc(s.stamp.toUpperCase())}</text>`;
  const tag = words(s.tag.toUpperCase());
  return `<svg aria-hidden="true" width="390" height="480" viewBox="0 0 390 480" style="position: absolute; inset: 0">
<rect width="390" height="480" fill="${p.g}"></rect>
<defs><clipPath id="${u}c"><path d="${DRAWN[0]}"><animate attributeName="d" values="${vals}" dur="12s" repeatCount="indefinite"></animate></path></clipPath></defs>
<path d="${DRAWN[0]}" fill="${p.blob}"><animate attributeName="d" values="${vals}" dur="12s" repeatCount="indefinite"></animate></path>
<g clip-path="url(#${u}c)"><g transform="translate(30 90)" fill="none" stroke="${p.inner}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="600" style="animation: cv-drawin 4s ease-out both" opacity=".55">${ISO}</g></g>
<g data-slot="title">${title(p.k)}</g><g clip-path="url(#${u}c)">${title(p.inner)}</g>
<g data-slot="stamp">${stamp(p.k)}</g><g clip-path="url(#${u}c)">${stamp(p.inner)}</g>
</svg>
<div data-slot="tag" style="position: absolute; left: 20px; right: 20px; bottom: 22px; display: flex; justify-content: ${tag.length > 1 ? 'space-between' : 'center'}; font-family: 'Familjen Grotesk', sans-serif; font-weight: 600; font-size: 13px; color: ${p.k}">${tag.map((w) => `<span>${esc(w)}</span>`).join('')}</div>`;
}

function echo(t, p, s) {
  const shifts = [];
  for (let i = 9; i > 0; i--) shifts.push(-i, i);
  let rects = shifts.map((i) => `<rect x="24" y="150" width="342" height="250" rx="30" fill="${p.g}" stroke="${p.k}" stroke-width="1.4" style="--a: ${i * 15}px; --b: ${i * 19}px; animation: cv-accordion 4s ease-in-out ${(-Math.abs(i) * 0.18).toFixed(2)}s infinite"></rect>`).join('');
  rects += `<rect x="24" y="150" width="342" height="250" rx="30" fill="${p.g}" stroke="${p.k}" stroke-width="1.6"></rect>`;
  const fs = Math.min(60, Math.floor(290 / (longest(words(t)) * 0.5)));
  return `<div style="position: absolute; inset: 0; background: ${p.g}"></div>
<svg aria-hidden="true" width="390" height="480" style="position: absolute; inset: 0">${rects}</svg>
<div style="position: absolute; left: 50px; right: 50px; top: 178px; bottom: 98px; color: ${p.k}; display: flex; flex-direction: column; justify-content: space-between">
<div data-slot="label" style="font-family: 'Barlow Semi Condensed', sans-serif; font-weight: 800; font-size: 14px; letter-spacing: .38em">${esc(s.label.toUpperCase())}</div>
<div data-slot="title" style="font-family: 'Barlow Semi Condensed', sans-serif; font-weight: 800; font-size: ${fs}px; line-height: .9; letter-spacing: -.01em; overflow-wrap: anywhere">${esc(t)}</div></div>`;
}

const STAR = (c, size, style) => `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" style="${style}"><path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z" fill="${c}"></path></svg>`;
function border(t, p, s, u) {
  const ws = words(t);
  const tick = `${t.toUpperCase()} · ${s.phrase.toUpperCase()} · `.repeat(Math.max(4, Math.ceil(1100 / Math.max(1, (t.length + s.phrase.length + 6) * 9))));
  const fs = Math.min(58, Math.floor(250 / (longest(ws) * 0.6)));
  const lines = ws.length > 3 ? [ws.slice(0, Math.ceil(ws.length / 2)).join(' '), ws.slice(Math.ceil(ws.length / 2)).join(' ')] : ws;
  return `<div style="position: absolute; inset: 0; background: ${p.g}"></div>
<svg aria-hidden="true" width="390" height="480" style="position: absolute; inset: 0">
<g transform="rotate(-9 195 265)"><path id="${u}f" d="M95 95 H295 A40 40 0 0 1 335 135 V395 A40 40 0 0 1 295 435 H95 A40 40 0 0 1 55 395 V135 A40 40 0 0 1 95 95 Z" fill="none" stroke="${p.k}" stroke-width="1.5"></path>
<text font-family="'DM Mono', monospace" font-weight="500" font-size="13" letter-spacing="1.5" fill="${p.k}" dy="-8" data-slot="phrase"><textPath href="#${u}f">${esc(tick)}<animate attributeName="startOffset" from="0" to="-1080" dur="22s" repeatCount="indefinite"></animate></textPath></text>
<rect x="80" y="120" width="230" height="290" rx="22" fill="none" stroke="${p.k}" stroke-width="1.5" stroke-dasharray="3 6"></rect></g></svg>
<div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 40px; gap: 6px; color: ${p.k}">
${STAR(p.k, 46, 'animation: cv-spin 8s linear infinite')}
<div data-slot="title" style="font-family: 'Fraunces', serif; font-style: italic; font-weight: 900; font-size: ${fs}px; line-height: .95; letter-spacing: -.02em; text-align: center; max-width: 250px; overflow-wrap: anywhere">${lines.map(esc).join('<br>')}</div></div>`;
}

function dots(t, p, s, u) {
  let lines = [t];
  if (t.length > 14 && t.includes(' ')) {
    const ws = t.split(' ');
    let cut = 1, best = Infinity;
    for (let i = 1; i < ws.length; i++) { const d = Math.abs(ws.slice(0, i).join(' ').length - ws.slice(i).join(' ').length); if (d < best) { best = d; cut = i; } }
    lines = [ws.slice(0, cut).join(' '), ws.slice(cut).join(' ')];
  }
  const fs = Math.min(lines.length === 1 ? 54 : 40, Math.floor(350 / (longest(lines) * 0.6)));
  let zz = '';
  for (let n = 0; n < 8; n++) { const x = n * 96; zz += `<path d="M${x} 0 L${x + 48} 60 L${x + 96} 0 L${x + 96} 30 L${x + 48} 90 L${x} 30 Z"></path>`; }
  const dia = [[52, 104, 46], [250, 96, 46], [300, 262, 40]].map(([x, y, sz], n) => `<div style="position: absolute; left: ${x}px; top: ${y}px; width: ${sz}px; height: ${sz}px; background: ${p.k}; animation: cv-pop ${(2.6 + n * 0.4).toFixed(1)}s ease-in-out ${(-n * 0.7).toFixed(1)}s infinite"></div>`).join('');
  return `<div style="position: absolute; inset: 0; background: ${p.g}"></div>
<svg aria-hidden="true" width="390" height="480" style="position: absolute; inset: 0"><defs><pattern id="${u}p" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.9" fill="${p.k}"></circle></pattern></defs>
<rect width="390" height="480" fill="url(#${u}p)"></rect>
<g fill="${p.g}"><g transform="translate(0 150)"><g style="animation: cv-zig 4s linear infinite">${zz}</g></g><g transform="translate(0 230)"><g style="animation: cv-zig 6s linear infinite reverse">${zz}</g></g></g>
<rect x="0" y="352" width="390" height="92" fill="${p.g}"></rect></svg>${dia}
<div data-slot="title" style="position: absolute; left: 20px; right: 20px; top: ${lines.length === 1 ? 360 : 358}px; font-family: 'Doto', monospace; font-weight: 900; font-size: ${fs}px; line-height: .95; color: ${p.k}; letter-spacing: -.02em; white-space: nowrap">${lines.map(esc).join('<br>')}</div>`;
}

const FACES = [["'Big Shoulders Stencil Display', sans-serif", 900, 'normal', 1.0], ["'Fraunces', serif", 900, 'italic', 0.86], ["'Archivo', sans-serif", 900, 'normal', 0.92], ["'Anton', sans-serif", 400, 'normal', 0.95]];
function stencil(t, p, s, u) {
  const ws = words(t.toUpperCase());
  const pre = ws.length > 1 ? ws.slice(0, -1).join(' ') : '';
  const main = ws.length ? ws[ws.length - 1] : '';
  const fs = Math.min(86, 330 / (Math.max(1, main.length) * 0.62));
  const bw = fs * 0.62;
  const rnd = rng(t);
  let letters = '';
  [...main].forEach((ch, n) => {
    const faces = FACES.slice().sort(() => rnd() - 0.5).slice(0, 3);
    const stack = faces.map(([fam, wt, st, sc], f) => `<span style="position: absolute; inset: 0; display: flex; align-items: flex-end; justify-content: center; font-family: ${fam}; font-weight: ${wt}; font-style: ${st}; font-size: ${(fs * sc).toFixed(0)}px; line-height: 1; animation: cv-face 4.5s steps(1) ${(-(f * 1.5) - n * 0.37).toFixed(2)}s infinite">${esc(ch)}</span>`).join('');
    const dy = [0, -3, 2, -5, 4][Math.floor(rnd() * 5)];
    letters += `<span style="position: relative; display: inline-block; width: ${bw.toFixed(0)}px; height: ${(fs * 1.02).toFixed(0)}px; transform: translateY(${dy}px)">${stack}</span>`;
  });
  const left = Math.max(14, (390 - bw * main.length) / 2 - 10);
  const preFs = Math.min(40, Math.floor(330 / (Math.max(1, pre.length) * 0.5)));
  const preHtml = pre ? `<div style="font-family: 'Big Shoulders Stencil Display', sans-serif; font-weight: 900; font-size: ${preFs}px; line-height: 1; margin-left: ${(fs * 0.5).toFixed(0)}px; white-space: nowrap">${esc(pre)}</div>` : '';
  return `<div style="position: absolute; inset: 0; background: ${p.k}"></div>
<svg aria-hidden="true" width="390" height="480" style="position: absolute; inset: 0"><path d="${DECKLE}" fill="${p.g}"></path></svg>
${grain(u + 'd', '#000000', '.18', '.8')}${grain(u + 'l', p.k, '.22', '1.2')}
<div style="position: absolute; left: ${left.toFixed(0)}px; top: 150px; color: ${p.k}; display: flex; flex-direction: column; gap: 2px">
<div data-slot="title">${preHtml}<div style="display: flex; white-space: nowrap">${letters}</div></div>
<div data-slot="tagline" style="align-self: flex-end; margin-top: 8px; background: ${p.k}; color: ${p.g}; padding: 2px 8px 1px; font-family: 'Anton', sans-serif; font-size: 22px; letter-spacing: .01em; white-space: nowrap">${esc(s.tagline.toUpperCase())}</div></div>
<div style="position: absolute; right: 36px; top: 344px; width: 30px; height: 30px; border: 2px solid ${p.k}; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-family: 'Big Shoulders Stencil Display', sans-serif; font-weight: 900; font-size: 15px; color: ${p.k}">ij</div>`;
}

function squish(t, p, s, u) {
  const rnd = rng(t + 's');
  let rows = '', n = 0;
  for (const w of words(t.toUpperCase())) {
    const fs = Math.min(112, 250 / (w.length * 0.5));
    let spans = '';
    for (const ch of w) {
      const r = rnd() * 18 - 9, y = rnd() * 20 - 10;
      const [sx, sy] = n % 2 ? [1.14, 0.88] : [0.9, 1.12];
      spans += `<span style="display: inline-block; margin: 0 -.03em; --r: ${r.toFixed(1)}deg; --y: ${y.toFixed(0)}px; --sx: ${sx}; --sy: ${sy}; animation: cv-jelly ${(1.8 + (n % 3) * 0.3).toFixed(1)}s ease-in-out ${(-n * 0.21).toFixed(2)}s infinite">${esc(ch)}</span>`;
      n++;
    }
    rows += `<div style="font-size: ${fs.toFixed(0)}px; line-height: .8; white-space: nowrap">${spans}</div>`;
  }
  return `<div style="position: absolute; inset: 0; background: ${p.g}"></div>
<svg aria-hidden="true" width="0" height="0" style="position: absolute"><filter id="${u}w"><feTurbulence type="fractalNoise" baseFrequency=".018" numOctaves="2" seed="3"><animate attributeName="baseFrequency" values=".016;.024;.016" dur="6s" repeatCount="indefinite"></animate></feTurbulence><feDisplacementMap in="SourceGraphic" scale="7"></feDisplacementMap></filter></svg>
<div data-slot="top" style="position: absolute; left: 0; right: 0; top: 84px; text-align: center; font-family: 'Fredoka', sans-serif; font-weight: 600; font-size: 17px; letter-spacing: .04em; color: ${p.k}">${esc(s.top.toUpperCase())}</div>
<div data-slot="title" style="position: absolute; left: 0; right: 0; top: 118px; bottom: 96px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; font-family: 'Fredoka', sans-serif; font-weight: 700; color: ${p.k}; filter: url(#${u}w)">${rows}</div>
<div data-slot="bottom" style="position: absolute; left: 0; right: 0; bottom: 34px; text-align: center; font-family: 'Inter Tight', sans-serif; font-weight: 600; font-size: 15px; color: ${p.k}">${esc(s.bottom)}</div>`;
}

function fieldnotes(t, p, s, u) {
  const rays = Array.from({ length: 18 }, (_, a) => { const r = a % 2 ? 56 : 30, ang = (a / 18) * Math.PI * 2; return `<line x1="0" y1="0" x2="${(Math.cos(ang) * r).toFixed(1)}" y2="${(Math.sin(ang) * r).toFixed(1)}"></line>`; }).join('');
  const fs = t.length > 16 ? 20 : 26;
  return `<div style="position: absolute; inset: 0; background: ${p.g}"></div>
<svg aria-hidden="true" width="430" height="520" style="position: absolute; left: -20px; top: -20px; opacity: .22; animation: cv-grain .5s steps(1) infinite"><filter id="${u}n"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"></feTurbulence><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.2 -.35"></feColorMatrix></filter><rect width="430" height="520" filter="url(#${u}n)"></rect></svg>
<div data-slot="intro" style="position: absolute; left: 130px; right: 20px; top: 74px; font-family: 'IBM Plex Mono', monospace; font-size: 10px; line-height: 1.5; letter-spacing: .06em; color: ${p.k}; text-align: right">*${esc(s.intro.toUpperCase())}*</div>
<div style="position: absolute; left: 22px; top: 190px; width: 10px; height: 40px; background: ${p.k}; animation: cv-flicker 4s infinite"></div>
<div style="position: absolute; right: 30px; bottom: 70px; width: 10px; height: 40px; background: ${p.k}; animation: cv-flicker 5s -2s infinite"></div>
<svg aria-hidden="true" width="120" height="120" viewBox="-60 -60 120 120" style="position: absolute; left: 70px; top: 150px; animation: cv-spin 24s linear infinite"><g stroke="${p.k}" stroke-width="1" fill="none">${rays}</g></svg>
<svg aria-hidden="true" width="80" height="30" viewBox="0 0 80 30" style="position: absolute; right: 40px; top: 230px; animation: cv-sway 1.2s ease-in-out infinite"><path d="M2 20 C 10 10, 18 26, 26 16 S 40 6, 48 18 S 64 24, 78 10" fill="none" stroke="${p.k}" stroke-width="1.5" stroke-linecap="round"></path></svg>
<div style="position: absolute; left: 20px; right: 20px; top: 300px; display: grid; grid-template-columns: 70px 1fr; row-gap: 10px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .08em; color: ${p.k}">
<span>LIST =</span><span data-slot="title" style="font-size: ${fs}px; letter-spacing: -.01em; line-height: 1.05; font-weight: 500; overflow-wrap: anywhere">${esc(t.toUpperCase())}<span style="animation: cv-blink 1s steps(1) infinite">_</span></span>
<span>FROM =</span><span data-slot="from">( ${esc(s.from.toUpperCase())} )</span>
<span>MOOD =</span><span data-slot="mood">${esc(s.mood.toUpperCase())}</span></div>`;
}

function bilingual(t, p, s) {
  const hl = '#E8FF4A';
  const fs = t.length > 16 ? 28 : 34;
  return `<div style="position: absolute; inset: 0; background: ${p.g}"></div>
<div data-slot="ar1" style="position: absolute; right: 20px; left: 20px; top: 78px; font-family: 'Reem Kufi', sans-serif; font-weight: 700; font-size: 34px; line-height: 1.25; color: ${p.k}; text-align: right" dir="auto">${esc(s.ar1)}</div>
<div style="position: absolute; left: 22px; top: 92px; width: 10px; height: 40px; background: ${p.k}; transform-origin: bottom; animation: cv-growy 3s ease-in-out infinite"></div>
<div style="position: absolute; left: 38px; top: 92px; width: 10px; height: 40px; background: ${p.k}; transform-origin: bottom; animation: cv-growy 3s ease-in-out -.6s infinite"></div>
<div data-slot="ar2" style="position: absolute; left: 70px; right: 40px; top: 146px; height: 30px; background: ${hl}; transform-origin: right; animation: cv-growx 1s cubic-bezier(.2,.8,.2,1) .2s both; display: flex; align-items: center; justify-content: center; font-family: 'Reem Kufi', sans-serif; font-weight: 600; font-size: 15px; color: ${p.k}" dir="auto">${esc(s.ar2)}</div>
<div style="position: absolute; left: 20px; right: 20px; top: 200px; height: 3px; background: ${hl}; transform-origin: left; animation: cv-growx 1.2s cubic-bezier(.2,.8,.2,1) .4s both"></div>
<div data-slot="side" style="position: absolute; left: 20px; top: 222px; width: 92px; font-family: 'Archivo', sans-serif; font-stretch: 125%; font-weight: 800; font-size: 13px; letter-spacing: .22em; line-height: 1.4; color: ${p.k}">${words(s.side.toUpperCase()).map(esc).join('<br>')}</div>
<div data-slot="title" style="position: absolute; left: 120px; right: 20px; top: 214px; font-family: 'Archivo', sans-serif; font-weight: 800; font-size: ${fs}px; line-height: 1.05; letter-spacing: -.02em; color: ${p.k}; text-align: left; overflow-wrap: anywhere" dir="auto">${esc(t)}</div>
<div data-slot="band" style="position: absolute; left: 60px; right: 60px; bottom: 76px; height: 30px; background: ${hl}; transform-origin: left; animation: cv-growx 1s cubic-bezier(.2,.8,.2,1) .6s both; display: flex; align-items: center; justify-content: center; font-family: 'Archivo', sans-serif; font-weight: 800; font-size: 12px; letter-spacing: .1em; color: ${p.k}">${esc(s.band.toUpperCase())}</div>
<div style="position: absolute; left: 0; bottom: 0; width: 46px; height: 58px; background: ${p.k}; transform-origin: bottom; animation: cv-growy 4s ease-in-out infinite"></div>
<div style="position: absolute; right: 0; top: 230px; width: 12px; height: 46px; background: ${p.k}"></div>
<div style="position: absolute; right: 26px; bottom: 0; width: 14px; height: 40px; background: ${p.k}; opacity: .45"></div>`;
}

// Split words into lines so the longest line is as short as possible, for each line count.
function packLines(ws, maxLines) {
  const out = [];
  for (let L = 1; L <= Math.min(maxLines, ws.length); L++) {
    // best split of ws into L lines (small n: try every split)
    let best = null;
    const go = (i, left, acc) => {
      if (left === 1) { const l = acc.concat([ws.slice(i).join(' ')]); const m = Math.max(...l.map((x) => x.length)); if (!best || m < best.m) best = { lines: l, m }; return; }
      for (let j = i + 1; j <= ws.length - left + 1; j++) go(j, left - 1, acc.concat([ws.slice(i, j).join(' ')]));
    };
    go(0, L, []);
    out.push(best.lines);
  }
  return out;
}

// Archivo 62% black caps, measured: width of a line in em.
const capsEm = (l) => [...l].reduce((w, ch) => w + (/[MW]/.test(ch) ? 0.73 : /[IJ1.,'’!:;|]/.test(ch) ? 0.27 : ch === ' ' ? 0.22 : 0.52), 0);

function collab(t, p, s, u, ctx) {
  const band = `${s.band.toUpperCase()} ✦ `.repeat(6);
  const ws = words(t.toUpperCase()).slice(0, 8);
  // The flower pot never moves or changes size. The title fits the space to its left
  // (x 22–215, below the band and above the name pills), as big as it can, centered top to bottom.
  const W = 193, Y0 = 104, HH = 296, LH = 0.84;
  const { fs, lines } = packLines(ws, 6).map((lines) => ({ lines, fs: Math.min(104, Math.floor(W / Math.max(...lines.map(capsEm))), Math.floor(HH / (lines.length * LH))) }))
    .reduce((m, c) => (c.fs > m.fs ? c : m));
  const h = lines.length * fs * LH;
  const top = 150 + h <= Y0 + HH ? 150 : Math.round(Y0 + (HH - h) / 2); // board position when it fits, else centered
  const people = (ctx.people && ctx.people.length ? ctx.people : ['You']).slice(0, 3);
  const pill = (x, dashed, first) => `<span style="border: 2px ${dashed ? 'dashed' : 'solid'} ${p.k}; border-radius: 999px; padding: 8px ${dashed ? 14 : 18}px; font-weight: 800; font-size: 16px; white-space: nowrap${first ? '' : '; margin-left: -2px'}">${esc(x)}</span>`;
  return `<div style="position: absolute; inset: 0; background: ${p.g}"></div>
<div data-slot="band" style="position: absolute; left: 0; right: 0; top: 64px; border-top: 1.5px solid ${p.k}; border-bottom: 1.5px solid ${p.k}; padding: 7px 0; overflow: hidden; white-space: nowrap; color: ${p.k}; font-family: 'Archivo', sans-serif; font-stretch: 112%; font-style: italic; font-size: 12px; letter-spacing: .14em"><div style="display: flex; width: max-content; animation: cv-marq 20s linear infinite"><span>${esc(band)}</span><span>${esc(band)}</span></div></div>
<svg aria-hidden="true" style="position: absolute; right: 6px; top: 110px" width="200" height="273" viewBox="0 0 110 150" fill="none" stroke="${p.k}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${BOUQUET}</svg>
<div data-slot="title" style="position: absolute; left: 22px; width: ${W}px; top: ${top}px; font-family: 'Archivo', sans-serif; font-stretch: 62%; font-weight: 900; font-size: ${fs}px; line-height: ${LH}; color: ${p.k}; white-space: nowrap">${lines.map(esc).join('<br>')}</div>
<div style="position: absolute; left: 22px; bottom: 30px; display: flex; color: ${p.k}">${people.map((x, i) => pill(x, false, i === 0)).join('')}${pill('+ Add', true, false)}</div>`;
}

function surprise(t, p, s, u, ctx) {
  const lines = words(t.toUpperCase());
  const fs = Math.min(50, 330 / (longest(lines) * 0.86));
  const who = ctx.recipient || 'them';
  return `<div style="position: absolute; inset: 0; background: ${p.g}"></div>
<svg aria-hidden="true" style="position: absolute; right: -110px; top: 170px; animation: cv-breathe 5s ease-in-out infinite" width="340" height="340" viewBox="0 0 270 270"><defs><pattern id="${u}ht" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="2.7" fill="${p.accent}"></circle></pattern><radialGradient id="${u}f" cx="40%" cy="40%" r="65%"><stop offset="0" stop-color="#000000"></stop><stop offset="1" stop-color="#FFFFFF"></stop></radialGradient><mask id="${u}m"><rect width="270" height="270" fill="url(#${u}f)"></rect></mask></defs><circle cx="135" cy="135" r="135" fill="${p.dots}"></circle><circle cx="135" cy="135" r="135" fill="url(#${u}ht)" mask="url(#${u}m)"></circle></svg>
${boil(p.blob, 'position: absolute; left: -30px; top: 214px; width: 300px; height: 170px')}
<svg aria-hidden="true" style="position: absolute; right: 4px; bottom: 30px" width="190" height="222" viewBox="0 0 120 140" fill="none" stroke="${p.k}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${CAKE}</svg>
<h1 data-slot="title" style="position: absolute; left: 20px; right: 20px; top: 74px; margin: 0; font-family: 'Archivo', sans-serif; font-stretch: 125%; font-weight: 800; text-transform: uppercase; font-size: ${fs.toFixed(0)}px; letter-spacing: .1em; line-height: 1; color: ${p.k}">${lines.map(esc).join('<br>')}</h1>
<div style="position: absolute; left: 20px; top: 250px; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; color: ${p.accent}">
<span style="font-family: 'Archivo', sans-serif; font-stretch: 125%; font-weight: 800; text-transform: uppercase; font-size: 12px; letter-spacing: .2em; border-bottom: 2px solid ${p.accent}; padding-bottom: 3px">Surprise</span>
<span style="font-weight: 800; font-size: 24px; line-height: 1.1; max-width: 200px">Hidden<br>from ${esc(who)}</span></div>
<span style="position: absolute; left: 20px; bottom: 18px; font-family: 'Doto', monospace; font-weight: 900; font-size: 64px; line-height: 1; color: ${p.k}">SHHH</span>`;
}

function treat(t, p, s, u, ctx) {
  const arrows = [0, 1, 2].map((n) => `<svg width="22" height="25" viewBox="0 0 30 34" style="animation: cv-arrow 1.2s ${(n * 0.2).toFixed(1)}s infinite"><path d="M0 0 L30 17 L0 34 Z" fill="${p.k}"></path></svg>`).join('');
  const nfs = t.length > 14 ? Math.max(13, Math.floor(20 * 14 / t.length)) : 20;
  return `<div style="position: absolute; inset: 0; background: ${p.g}"></div>
${boil('#FFFFFF', 'position: absolute; left: 14px; top: 70px; width: 360px; height: 310px')}
<div aria-hidden="true" style="position: absolute; left: 80px; top: 110px; width: 230px; height: 230px; background: ${p.dia}; animation: cv-spin 40s linear infinite"></div>
<div style="position: absolute; left: 22px; top: 76px; font-size: 13px; font-weight: 700; color: ${p.k}">${ctx.visibility === 'private' ? 'Private' : 'Public'} · unlimited</div>
<div style="position: absolute; left: 0; right: 0; top: 160px; text-align: center; font-family: 'Doto', monospace; font-weight: 900; font-size: 56px; line-height: .95; color: ${p.k}">TREAT<br><span style="position: relative; left: .45em">TREAT</span><br>TREAT</div>
<div style="position: absolute; left: 22px; bottom: 30px; display: flex; gap: 2px">${arrows}</div>
<span data-slot="title" style="position: absolute; right: 22px; bottom: 28px; max-width: 230px; text-align: right; font-family: 'Inter Tight', sans-serif; font-weight: 800; font-size: ${nfs}px; letter-spacing: -.01em; color: ${p.k}">${esc(t)}</span>`;
}

function photo(t, p, s, u, ctx) {
  const ws = words(t);
  const fs = Math.min(56, Math.floor(330 / (longest(ws) * 0.55)));
  const pos = Number.isFinite(+s.y) ? Math.max(0, Math.min(100, +s.y)) : 50;
  return `<div style="position: absolute; inset: 0; background: #13286B"></div>
${ctx.photo ? `<img src="${esc(ctx.photo)}" alt="" referrerpolicy="no-referrer" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% ${pos}%">` : ''}
<div aria-hidden="true" style="position: absolute; left: 0; right: 0; bottom: 0; height: 220px; background: linear-gradient(to top, rgba(0,0,0,.42), rgba(0,0,0,0))"></div>
<div data-slot="title" style="position: absolute; left: 20px; right: 20px; bottom: 34px; font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; font-size: ${fs}px; line-height: .9; letter-spacing: -.03em; color: #FFFFFF; text-shadow: 0 2px 18px rgba(0,0,0,.35); overflow-wrap: anywhere">${ws.map(esc).join('<br>')}</div>`;
}


// ---- added after v1: Blob, Bubbles, Wave, Hand-lettered ----
const STAR2 = (fill, stroke, size, style) => `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="-2 -2 28 28" style="position: absolute; z-index: 4; ${style}"><path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z" fill="${fill}" stroke="${stroke}" stroke-width="2.5" paint-order="stroke"></path></svg>`;
function blob(t, p, s, u) {
  const ws = words(t);
  const mid = Math.ceil(ws.length / 2);
  const l1 = ws.slice(0, mid).join(' '), l2 = ws.slice(mid).join(' ');
  const m = Math.max(l1.length, l2.length, 1);
  const fs = Math.min(44, Math.floor(250 / (m * 0.55)));
  const one = `${t.toUpperCase()} ✦ `;
  const ring = one.repeat(Math.max(3, Math.ceil(80 / one.length)));
  return `<div style="position: absolute; inset: 0; background: ${p.g}"></div>
<div style="position: absolute; left: 82px; top: 152px; width: 236px; height: 236px; background: ${p.b}; animation: cv-morph 9s ease-in-out infinite, cv-breathe 6s ease-in-out infinite"></div>
<svg aria-hidden="true" width="390" height="480" viewBox="0 0 390 480" style="position: absolute; inset: 0"><g><animateTransform attributeName="transform" type="rotate" from="0 200 270" to="360 200 270" dur="18s" repeatCount="indefinite"></animateTransform><path id="${u}r" d="M200 270 m-178 0 a178 178 0 1 1 356 0 a178 178 0 1 1 -356 0" fill="none"></path><text font-family="'Inter Tight', sans-serif" font-weight="800" font-size="14" letter-spacing="3.2" fill="${p.ring}" textLength="1100" lengthAdjust="spacing"><textPath href="#${u}r">${esc(ring)}</textPath></text></g></svg>
<div data-slot="title" style="position: absolute; left: 82px; top: 152px; width: 236px; height: 236px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: 'Bricolage Grotesque', sans-serif; font-weight: 800; color: ${p.g}; font-size: ${fs}px; line-height: .9; letter-spacing: -.03em; text-align: center; animation: cv-bob 5s ease-in-out infinite">
<span>${esc(l1)}</span>${l2 ? `<span style="font-style: italic; transform: translateX(18px)">${esc(l2)}</span>` : ''}</div>
${STAR2(p.star, p.g, 36, 'left: 70px; top: 140px; animation: cv-twinkle 3s ease-in-out infinite')}
${STAR2(p.star, p.g, 28, 'left: 299px; top: 369px; animation: cv-twinkle 3s ease-in-out -1.5s infinite')}`;
}

const FIZZ = [[59, 413, 10, 2.5, 0], [259, 427, 16, 2.9, -0.6], [165, 403, 8, 3.3, -1.2], [134, 459, 22, 3.7, -1.8], [127, 380, 12, 4.1, -2.4], [22, 436, 14, 2.7, -0.3], [88, 450, 9, 3.1, -1.0], [196, 446, 18, 3.5, -1.6], [232, 404, 10, 2.8, -2.1], [318, 452, 13, 3.9, -0.8], [362, 400, 8, 3.0, -1.4], [8, 388, 11, 3.4, -2.8]];
function bubbles(t, p) {
  let rows = words(t);
  while (rows.length > 3) { // at most three rows: join the shortest neighbors
    let best = 0;
    for (let i = 1; i < rows.length - 1; i++) if (rows[i].length + rows[i + 1].length < rows[best].length + rows[best + 1].length) best = i;
    rows.splice(best, 2, rows[best] + ' ' + rows[best + 1]);
  }
  const rnd = rng(t);
  let y = rows.length > 1 ? (rows.length > 2 ? 110 : 150) : 210, i = 0, out = '';
  for (const w of rows) {
    const base = Math.min(92, Math.floor(330 / Math.max(w.length, 1)) + 16);
    const items = []; let x = 0, prev = '', sz = base;
    for (const ch of w) {
      sz = ch === ' ' ? base * 0.4 : ch.toLowerCase() === prev.toLowerCase() ? sz * 0.78 : base; // repeated letters keep shrinking
      items.push([ch, x, sz]); x += sz * 0.86; prev = ch;
    }
    const total = x + items[items.length - 1][2] * 0.14;
    const sc = Math.min(1, 360 / total);
    const x0 = (390 - total * sc) / 2;
    for (const [ch, xx, sz] of items) {
      if (ch === ' ') continue;
      const s2 = sz * sc;
      const dy = (base - sz) * 0.9 * sc + (rnd() * 16 - 8);
      out += `<div style="position: absolute; left: ${(x0 + xx * sc).toFixed(0)}px; top: ${(y + (base * sc - s2) / 2 - dy * 0.6).toFixed(0)}px; width: ${s2.toFixed(0)}px; height: ${s2.toFixed(0)}px; animation: cv-rise ${(3.2 + (i % 3) * 0.5).toFixed(1)}s ease-in-out ${(-i * 0.37).toFixed(2)}s infinite"><div style="width: 100%; height: 100%; background: ${p.k}; display: flex; align-items: center; justify-content: center; font-family: 'Unbounded', sans-serif; font-weight: 800; font-size: ${(s2 * 0.5).toFixed(0)}px; color: ${p.g}; animation: cv-morph ${6 + (i % 4)}s ease-in-out ${(-i * 0.9).toFixed(1)}s infinite">${esc(ch)}</div></div>`;
      i++;
    }
    y += base * sc * 1.05;
  }
  const fizz = FIZZ.map(([x, yy, sz, d, dl]) => `<div style="position: absolute; left: ${x}px; top: ${yy}px; width: ${sz}px; height: ${sz}px; border: 2.5px solid ${p.k}; border-radius: 50%; animation: cv-rise ${d}s ease-in-out ${dl}s infinite"></div>`).join('');
  return `<div style="position: absolute; inset: 0; background: ${p.g}"></div>${fizz}<div data-slot="title">${out}</div>`;
}

function wave(t, p) {
  const ws = words(t);
  const mid = Math.ceil(ws.length / 2);
  const lines = [ws.slice(0, mid).join(' '), ws.slice(mid).join(' ')].filter(Boolean);
  const fs = Math.min(70, Math.floor((360 / longest(lines)) * 1.55));
  let i = 0;
  const html = lines.map((l) => `<div style="white-space: nowrap">${[...l].map((ch) => `<span style="display: inline-block; animation: cv-wave 2.4s ease-in-out ${(-(i++) * 0.14).toFixed(2)}s infinite">${ch === ' ' ? '&#160;' : esc(ch)}</span>`).join('')}</div>`).join('');
  let wl = '';
  for (let n = 0; n < 7; n++) {
    const a = 12 + (n % 3) * 5;
    wl += `<path d="M-200 ${60 + n * 64}${` q 50 -${a} 100 0 q 50 ${a} 100 0`.repeat(4)}" style="animation: cv-drift ${7 + n}s linear infinite${n % 2 ? ' reverse' : ''}"></path>`;
  }
  return `<div style="position: absolute; inset: 0; background: ${p.g}"></div>
<svg aria-hidden="true" width="390" height="480" style="position: absolute; inset: 0"><g fill="none" stroke="${p.k}" stroke-width="2" opacity=".35">${wl}</g></svg>
<div data-slot="title" style="position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; font-family: 'Bagel Fat One', sans-serif; font-size: ${fs}px; line-height: 1.05; color: ${p.k}; padding-top: 30px">${html}</div>`;
}

// The title's script picks the lettering: Arabic → Aref Ruqaa, Chinese/Japanese → Ma Shan Zheng, else Kaushan Script.
function lettered(title, p, s, u) {
  const t = s.word || title;
  const rays = Array.from({ length: 24 }, (_, n) => {
    const a = (n * 15) * Math.PI / 180, d = 3.2 * Math.PI / 180, R = 700;
    const pt = (x) => `${Math.round(Math.cos(x) * R)} ${Math.round(Math.sin(x) * R)}`;
    return `<path d="M0 0 L${pt(a - d)} L${pt(a + d)} Z"></path>`;
  }).join('');
  const ar = /[؀-ۿ]/.test(t), zh = /[぀-ヿ㐀-鿿]/.test(t);
  const sh = `text-shadow: 3px 3px 0 ${p.sh}, 6px 6px 0 ${p.sh}`;
  const len = Math.max(1, [...t].length);
  const txt = ar
    ? `<div dir="rtl" lang="ar" style="font-family: 'Aref Ruqaa', serif; font-weight: 700; font-size: ${Math.min(92, Math.floor(920 / len))}px; line-height: 1.35; ${sh}; text-align: right; max-width: 390px">${esc(t)}</div>`
    : zh
      ? `<div lang="zh" style="font-family: 'Ma Shan Zheng', cursive; font-size: ${Math.min(84, Math.floor(336 / len))}px; line-height: 1.1; text-align: right; padding-right: 14px; ${sh}">${esc(t)}</div>`
      : `<div style="font-family: 'Kaushan Script', cursive; font-size: ${Math.min(74, Math.floor(666 / len))}px; line-height: 1.05; text-align: right; max-width: 390px; ${sh}">${esc(t)}</div>`;
  return `<div style="position: absolute; inset: 0; background: ${p.g}"></div>
<svg aria-hidden="true" width="390" height="480" viewBox="0 0 390 480" style="position: absolute; inset: 0"><g transform="translate(300 300)" fill="${p.ray}"><g>${rays}<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="80s" repeatCount="indefinite"></animateTransform></g></g></svg>
<div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: flex-end; color: ${p.k}; padding-top: 30px"><div data-slot="word" style="transform: rotate(-7deg); transform-origin: right bottom; animation: cv-write 7s cubic-bezier(.6,0,.3,1) infinite">${txt}</div></div>
<div style="position: absolute; left: 0; right: 0; bottom: 26px; display: flex; justify-content: center"><span data-slot="cap" style="border: 2px solid ${p.k}; border-radius: 999px; padding: 6px 16px; font-family: 'DM Mono', monospace; font-size: 12px; letter-spacing: ${/[\u0600-\u06FF\u3040-\u9FFF]/.test(s.cap) ? '0' : '.2em'}; color: ${p.k}; white-space: nowrap" dir="auto">★ ${esc(s.cap.toUpperCase())} ★</span></div>${grain(u + 'g', '#FFF3D6', '.22')}`;
}

// #04 Wave type on curves (Option 15): contour lines, the title riding two wavy paths.
function wavecurve(t, p, s, u) {
  const W = 390, H = 480;
  const ws = words(t.toLowerCase());
  const lines = ws.length > 1 ? packLines(ws, 2)[1] : ws; // two balanced lines: "wishes / come true"
  const big = Math.round(H * 0.19); // as on the board; like the board, a long line may run off the edge
  const fs = longest(lines) > 12 ? Math.floor(big * 12 / longest(lines)) : big;
  let contour = '';
  for (let j = 0; j < H + 20; j += 9) {
    const ph = j * 0.07; const pts = [];
    for (let x = -10; x < W + 20; x += 12) pts.push(`${x} ${(j + 5 * Math.sin(x / 34 + ph)).toFixed(1)}`);
    contour += `<path d="M${pts.join(' L')}"></path>`;
  }
  let text = '';
  lines.forEach((l, i) => {
    const base = H * (0.42 + i * 0.3), amp = H * 0.05, pts = [];
    for (let x = -40; x < W + 60; x += 8) pts.push(`${x} ${(base + amp * Math.sin(x / 58 + i * 1.7)).toFixed(1)}`);
    const o = 8 + i * 10;
    text += `<path id="${u}w${i}" d="M${pts.join(' L')}" fill="none"></path><text font-family="'Archivo', sans-serif" font-weight="900" font-stretch="112%" font-size="${fs}" fill="${p.k}"><textPath href="#${u}w${i}" startOffset="${o}">${esc(l)}<animate attributeName="startOffset" values="${o};${o + 20};${o}" dur="5s" begin="${(-i * 1.6).toFixed(1)}s" repeatCount="indefinite" calcMode="spline" keyTimes="0;.5;1" keySplines=".45 0 .55 1;.45 0 .55 1"></animate></textPath></text>`;
  });
  return `<svg aria-hidden="true" width="390" height="480" viewBox="0 0 390 480" style="position: absolute; inset: 0"><rect width="390" height="480" fill="${p.g}"></rect><g fill="none" stroke="${p.line}" stroke-width="1.5" opacity="${p.op}"><animateTransform attributeName="transform" type="translate" values="0 0;-16 7;0 0" dur="8s" repeatCount="indefinite" calcMode="spline" keyTimes="0;.5;1" keySplines=".45 0 .55 1;.45 0 .55 1"></animateTransform>${contour}</g><g data-slot="title">${text}</g></svg>`;
}

export const RENDER = { wavecurve, blob, bubbles, wave, lettered, friend, stickers, drawn, echo, border, dots, stencil, squish, fieldnotes, bilingual, collab, surprise, treat, photo };
