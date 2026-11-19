'use client';
// A list cover (Option 20 template) drawn at any width. The art is 390 × 480 and scales to fit.
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { coverHTML, FONT_URL, KEYFRAMES } from '@/lib/cover-designs';
import { fitCover } from '@/components/fit';

export function CoverStyles() {
  return (
    <>
      <link rel="stylesheet" href={FONT_URL} precedence="default" />
      <style href="cv-keyframes" precedence="default">{`.cvx{position:relative;width:390px;height:480px;overflow:hidden;transform-origin:0 0;font-family:'Inter Tight',sans-serif;text-align:left;line-height:normal}.cvx *{box-sizing:border-box}${KEYFRAMES}`}</style>
    </>
  );
}

// Fixed size: draws at `width` (and `height`, for tiles). Fluid: fills its column. The box keeps the cover's
// shape from the first paint and the art appears only once it is scaled to the measured width, so nothing jumps.
export default function CoverDesign({ design, title, ctx, width = 390, height, fluid = false, radius = 0, style, label }) {
  const id = useId();
  const box = useRef(null);
  const art = useRef(null);
  const [w, setW] = useState(fluid ? 0 : width);
  useLayoutEffect(() => {
    if (!fluid || !box.current) return;
    setW(Math.round(box.current.getBoundingClientRect().width));
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, [fluid]);
  const html = coverHTML(design, title, 'c' + id, ctx);
  // Words always fit inside the cover (and inside its ring, blob or frame): measured once laid out, again once fonts load.
  useLayoutEffect(() => {
    // Tiles crop the cover to their box: the words must fit the part that shows.
    const kk = w ? (height ? Math.max(w / 390, height / 480) : w / 390) : 1;
    const ox = height && w ? (390 * kk - w) / 2 / kk : 0;
    const view = height && w ? [ox, 0, 390 - ox, Math.min(480, height / kk)] : null;
    const run = () => fitCover(art.current, design?.key, view);
    run();
    let alive = true;
    const again = () => { if (alive) run(); };
    document.fonts?.ready.then(again);
    document.fonts?.addEventListener?.('loadingdone', again);
    const t = setTimeout(again, 1200);
    return () => { alive = false; clearTimeout(t); document.fonts?.removeEventListener?.('loadingdone', again); };
  }, [html, w, height, design?.key]);
  // With a fixed height (tiles), the cover fills the box and is centered.
  const k = w ? (height ? Math.max(w / 390, height / 480) : w / 390) : 1;
  const dx = height && w ? Math.round((w - 390 * k) / 2) : 0;
  const size = fluid ? (height ? { width: '100%', height } : { width: '100%', aspectRatio: '390 / 480' }) : { width, height: height || Math.round(480 * k) };
  return (
    <div ref={box} role="img" aria-label={label || `Cover: ${title}`} style={{ position: 'relative', ...size, overflow: 'hidden', borderRadius: radius, flexShrink: 0, ...style }}>
      <CoverStyles />
      <div ref={art} className="cvx" aria-hidden="true" style={{ position: 'absolute', left: dx, top: 0, transform: `scale(${k})`, visibility: w ? 'visible' : 'hidden' }} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
