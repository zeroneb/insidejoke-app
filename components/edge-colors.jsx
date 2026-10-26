'use client';
// Phones draw edge to edge. Safari tints the status bar from theme-color and shows the html ground behind its
// bottom toolbar and on overscroll, so after each page shows, both take the colors the page actually draws at
// its top edge (a cover, the lime wallet…) and the page's own ground at the bottom. Bigger screens keep the CSS.
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const solid = (c) => c && c !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(c);
function colorAt(y) {
  for (const el of document.elementsFromPoint(window.innerWidth / 2, y)) {
    if (el.closest('.nav, .a1-sheetwrap')) continue;
    const c = getComputedStyle(el).backgroundColor;
    if (solid(c)) return c;
  }
  return null;
}

// The page's own ground: the last screen block's background, else the app column's.
function ground() {
  const app = document.querySelector('.app');
  if (!app) return null;
  const blocks = [...app.children].filter((e) => !e.classList.contains('testbar'));
  let el = blocks[blocks.length - 1];
  while (el && el !== app) {
    const c = getComputedStyle(el).backgroundColor;
    if (solid(c)) return c;
    el = el.lastElementChild && getComputedStyle(el).display === 'contents' ? el.lastElementChild : null;
  }
  const c = getComputedStyle(app).backgroundColor;
  return solid(c) ? c : null;
}

export default function EdgeColors() {
  const path = usePathname();
  useEffect(() => {
    const html = document.documentElement;
    const sync = () => {
      if (window.innerWidth >= 700) { html.style.removeProperty('--page'); return; }
      const top = colorAt(1);
      const bottom = ground();
      if (bottom) html.style.setProperty('--page', bottom); else html.style.removeProperty('--page');
      if (top) document.querySelectorAll('meta[name="theme-color"]').forEach((m) => { m.setAttribute('content', top); m.removeAttribute('media'); });
    };
    const t = setTimeout(sync, 60);
    window.addEventListener('resize', sync);
    return () => { clearTimeout(t); window.removeEventListener('resize', sync); };
  }, [path]);
  return null;
}
