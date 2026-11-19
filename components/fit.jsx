'use client';
// Keeps cover words inside their cover: never cut off, hidden or overlapping the art.
// Two tools: fitCover() for the v1 covers (390 × 480 HTML), and <FitText> for the older covers.
import { useLayoutEffect, useRef } from 'react';

// Where each cover's words may sit, in cover units (390 × 480). Circles: [cx, cy, r]. Rects: [left, top, right, bottom].
// Everything not listed stays inside the cover with a small margin.
const EDGE = [12, 12, 378, 468];
const REGIONS = {
  friend: { title: { circle: [195, 237, 100] } }, // inside the ring of words
  blob: { title: { circle: [200, 270, 110] } }, // inside the blob
  treat: { title: { rect: [104, 330, 372, 466] } }, // under the diamond, clear of the arrows
  collab: { title: { rect: [16, 100, 222, 404] } }, // left of the bouquet, between the band and the names
  surprise: { title: { rect: [14, 60, 376, 244] } }, // above "Surprise · hidden from"
  dots: { title: { rect: [12, 350, 378, 446] } }, // the clear band under the zigzags
  echo: { title: { rect: [44, 196, 346, 396] } }, // inside the frame
  stickers: { title: { rect: [100, 128, 290, 330] }, sign: { rect: [100, 300, 290, 384] } }, // the paper inside the stickers
  border: { title: { rect: [86, 150, 304, 410] } }, // inside the tilted frame
  bilingual: { title: { rect: [118, 208, 378, 398] } },
  squish: { title: { rect: [10, 108, 380, 424] } } // between the top line and the bottom line
};
// Slots that are meant to run off the edge (marquees, text on a loop) are left alone.
const SKIP = new Set(['band', 'phrase', 'ring']);

function unionRect(rects) {
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  for (const x of rects) {
    if (!x || (x.width === 0 && x.height === 0)) continue;
    l = Math.min(l, x.left); t = Math.min(t, x.top); r = Math.max(r, x.right); b = Math.max(b, x.bottom);
  }
  return l === Infinity ? null : { l, t, r, b };
}

// The ink of an element: its text boxes (not its layout box, which can be much wider than the words).
function inkRect(el) {
  const rg = document.createRange();
  rg.selectNodeContents(el);
  const rects = [...rg.getClientRects()];
  // Elements drawn as boxes (bubbles, stencil letters) count too.
  el.querySelectorAll('div, svg').forEach((d) => { const cs = getComputedStyle(d); if (d.tagName.toLowerCase() === 'svg' || cs.backgroundColor !== 'rgba(0, 0, 0, 0)') rects.push(d.getBoundingClientRect()); });
  return unionRect(rects);
}

// Untransformed layout origin (the transform-origin, 50% 50%) of an element, in cover units.
function originOf(el, root) {
  let x = 0, y = 0, n = el;
  while (n && n !== root) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
  return [x + el.offsetWidth / 2, y + el.offsetHeight / 2];
}

const inside = (B, reg) => {
  if (reg.circle) {
    const [cx, cy, r] = reg.circle;
    return [[B.l, B.t], [B.r, B.t], [B.l, B.b], [B.r, B.b]].every(([x, y]) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r);
  }
  const [l, t, r, b] = reg.rect;
  return B.l >= l - 0.5 && B.t >= t - 0.5 && B.r <= r + 0.5 && B.b <= b + 0.5;
};
const scaled = (B, O, s, dx = 0, dy = 0) => ({ l: O[0] + (B.l - O[0]) * s + dx, r: O[0] + (B.r - O[0]) * s + dx, t: O[1] + (B.t - O[1]) * s + dy, b: O[1] + (B.b - O[1]) * s + dy });

// Shrinks (and if needed nudges) each word slot of a rendered v1 cover so it sits inside its region.
// Uses the CSS `scale`/`translate` properties, so it composes with the covers' own transforms and animations.
export function fitCover(root, key, view = null) {
  if (!root) return;
  const box = root.getBoundingClientRect();
  if (!box.width) return;
  const k = box.width / 390;
  for (const el of root.querySelectorAll('[data-slot]')) {
    const slot = el.getAttribute('data-slot');
    if (SKIP.has(slot) || !(el instanceof HTMLElement)) continue; // SVG slots size themselves in the template
    el.style.scale = ''; el.style.translate = '';
    const ink = inkRect(el);
    if (!ink) continue;
    const B = { l: (ink.l - box.left) / k, r: (ink.r - box.left) / k, t: (ink.t - box.top) / k, b: (ink.b - box.top) / k };
    let reg = REGIONS[key]?.[slot] || { rect: EDGE };
    if (view && reg.rect) {
      // Keep to the part of the cover that shows (tiles crop it).
      const [vl, vt, vr, vb] = [view[0] + 8, view[1] + 8, view[2] - 8, view[3] - 8];
      const [l, t, r, b] = reg.rect;
      const nl = Math.max(l, vl), nt = Math.max(t, vt), nr = Math.min(r, vr), nb = Math.min(b, vb);
      reg = { rect: nr - nl > 40 && nb - nt > 24 ? [nl, nt, nr, nb] : [vl, Math.max(vt, nb - 60), vr, vb] };
    }
    if (inside(B, reg)) continue;
    const O = originOf(el, root);
    let s = 1, dx = 0, dy = 0;
    if (reg.circle) {
      // Largest scale that keeps every corner inside the circle (centered on the circle if the words are off-center).
      const [cx, cy] = reg.circle;
      const bc = [(B.l + B.r) / 2, (B.t + B.b) / 2];
      const off = Math.hypot(bc[0] - cx, bc[1] - cy) > 6;
      const shift = (m) => (off ? [cx - (O[0] + (bc[0] - O[0]) * m), cy - (O[1] + (bc[1] - O[1]) * m)] : [0, 0]);
      let lo = 0.2, hi = 1;
      for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; const [a, c] = shift(m); if (inside(scaled(B, O, m, a, c), reg)) lo = m; else hi = m; }
      s = lo; [dx, dy] = shift(s);
    } else {
      const [l, t, r, b] = reg.rect;
      s = Math.min(1, (r - l) / (B.r - B.l), (b - t) / (B.b - B.t));
      const S = scaled(B, O, s);
      if (S.l < l) dx = l - S.l; else if (S.r > r) dx = r - S.r;
      if (S.t < t) dy = t - S.t; else if (S.b > b) dy = b - S.b;
    }
    if (s < 0.999) el.style.scale = String(Math.max(0.2, s * 0.98));
    if (dx || dy) el.style.translate = `${dx.toFixed(1)}px ${dy.toFixed(1)}px`;
  }
}

// Older covers: shrinks its words until they fit the box it is given (a rect, or the circle inscribed in it).
// The words keep their own line breaks; only their size changes.
export function FitText({ children, shape = 'rect', style, innerStyle, className, deps = [] }) {
  const box = useRef(null);
  const inner = useRef(null);
  useLayoutEffect(() => {
    const el = inner.current, bx = box.current;
    if (!el || !bx) return;
    const fit = () => {
      el.style.scale = '';
      const W = bx.clientWidth, H = bx.clientHeight;
      const w = el.offsetWidth, h = el.offsetHeight;
      if (!W || !H || !w || !h) return;
      let s;
      if (shape === 'circle') {
        // Each line, at its height from the middle, must fit the circle's width there.
        const r = Math.min(W, H) / 2;
        const lines = el.children.length ? [...el.children] : [el];
        s = 1;
        for (const ln of lines) {
          const lw = ln.offsetWidth / 2;
          const top = ln.offsetTop - h / 2, bot = top + ln.offsetHeight;
          const y = Math.max(Math.abs(top), Math.abs(bot));
          const need = Math.sqrt(lw * lw + y * y);
          if (need > 0) s = Math.min(s, r / need);
        }
      } else {
        s = Math.min(1, W / w, H / h);
      }
      if (s < 0.999) el.style.scale = String(Math.max(0.25, s * 0.97));
    };
    fit();
    let alive = true;
    document.fonts?.ready.then(() => { if (alive) fit(); });
    const ro = new ResizeObserver(fit);
    ro.observe(bx);
    return () => { alive = false; ro.disconnect(); };
  }, [shape, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <span ref={box} className={className} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0, minHeight: 0, ...style }}>
      <span ref={inner} style={{ display: 'inline-block', width: 'max-content', whiteSpace: 'nowrap', flexShrink: 0, ...innerStyle }}>{children}</span>
    </span>
  );
}
