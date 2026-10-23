'use client';
// Share your profile: the phone's share sheet where there is one, otherwise copy the link.
import { useState } from 'react';

export default function ShareProfile({ url, name, style, iconOnly = false }) {
  const [copied, setCopied] = useState(false);
  const go = async () => {
    const text = `${name ? name + ' on' : 'Me on'} insidejoke: the things I'd actually love.`;
    try {
      if (navigator.share) { await navigator.share({ title: 'insidejoke', text, url }); return; }
    } catch (e) { if (e?.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };
  return (
    <button type="button" onClick={go} style={style} aria-label={iconOnly ? (copied ? 'Link copied' : 'Share your profile') : undefined}>
      <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v13" /><path d="M7 8l5-5 5 5" /><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></svg>
      {iconOnly ? null : copied ? 'Link copied' : 'Share my profile'}
    </button>
  );
}
