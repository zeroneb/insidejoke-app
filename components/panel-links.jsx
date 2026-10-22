'use client';

// Laptop only (≥900px wide): links to an item, its Contribute screen, or Add item on this list
// open in the side panel (/l/<slug>?item=…) instead of replacing the list. Phones keep normal links.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PanelLinks({ slug }) {
  const router = useRouter();
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)');
    const esc = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const itemRe = new RegExp(`^/l/${esc}/i/([^/?#]+)(/give)?(?:\\?mode=(rest))?$`);
    const addRe = new RegExp(`^/l/${esc}/add(?:\\?treat=1)?$`);
    const onClick = (e) => {
      if (!mq.matches || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a || a.target === '_blank') return;
      const href = a.getAttribute('href');
      let to = null;
      const m = itemRe.exec(href);
      if (m && !/\/(edit|thanks)$/.test(href)) to = `/l/${slug}?item=${m[1]}${m[2] ? '&give=1' : ''}${m[3] ? '&mode=rest' : ''}`;
      else if (addRe.test(href)) to = `/l/${slug}?add=1${/treat=1/.test(href) ? '&treat=1' : ''}`;
      if (!to) return;
      e.preventDefault();
      e.stopPropagation();
      router.push(to, { scroll: false });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [slug, router]);
  return null;
}
