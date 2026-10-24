'use client';

import { useEffect } from 'react';

// The laptop welcome page is long, so its one-shot animations (bars filling, lines drawing) would finish
// before anyone scrolls to them. They wait, paused, until they come into view.
export default function PlayOnScroll() {
  useEffect(() => {
    const els = document.querySelectorAll('.lp-dk .grow, .lp-dk .draw');
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('run')); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('run'); io.unobserve(en.target); }
    }), { threshold: 0.4 });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
  return null;
}
