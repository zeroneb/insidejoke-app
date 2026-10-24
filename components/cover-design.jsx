'use client';
// A list cover (Option 20 template) drawn at any width. The art is 390 × 480 and scales to fit.
import { useEffect, useId, useRef, useState } from 'react';
import { coverHTML, FONT_URL, KEYFRAMES } from '@/lib/cover-designs';

export function CoverStyles() {
  return (
    <>
      <link rel="stylesheet" href={FONT_URL} precedence="default" />
      <style href="cv-keyframes" precedence="default">{`.cvx{position:relative;width:390px;height:480px;overflow:hidden;transform-origin:0 0;font-family:'Inter Tight',sans-serif;text-align:left;line-height:normal}.cvx *{box-sizing:border-box}${KEYFRAMES}`}</style>
    </>
  );
}

// width: the width to draw at before the page measures (and for fixed-size tiles).
export default function CoverDesign({ design, title, ctx, width = 390, height, fluid = false, radius = 0, style, label }) {
  const id = useId();
  const box = useRef(null);
  const [w, setW] = useState(width);
  useEffect(() => {
    if (!fluid || !box.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, [fluid]);
  // With a fixed height (tiles), the cover fills the box and is centered.
  const k = height ? Math.max(w / 390, height / 480) : w / 390;
  const dx = height ? Math.round((w - 390 * k) / 2) : 0;
  return (
    <div ref={box} role="img" aria-label={label || `Cover: ${title}`} style={{ position: 'relative', width: fluid ? '100%' : width, height: height || Math.round(480 * k), overflow: 'hidden', borderRadius: radius, flexShrink: 0, ...style }}>
      <CoverStyles />
      <div className="cvx" aria-hidden="true" style={{ position: 'absolute', left: dx, top: 0, transform: `scale(${k})` }} dangerouslySetInnerHTML={{ __html: coverHTML(design, title, 'c' + id, ctx) }} />
    </div>
  );
}
