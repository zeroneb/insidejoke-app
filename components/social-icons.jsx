// Instagram and X icons for the welcome page footer. Both open in a new tab so insidejoke stays open.
const LINKS = [
  {
    name: 'insidejoke on Instagram', href: 'https://instagram.com/clubinsidejoke',
    icon: <><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="17.3" cy="6.7" r="1.2" fill="currentColor" /></>
  },
  {
    name: 'insidejoke on X', href: 'https://x.com/clubinsidejoke',
    icon: <path fill="currentColor" d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.78L17.75 3Zm-1.08 16.18h1.7L7.4 4.73H5.58l11.09 14.45Z" />
  }
];

export default function SocialIcons({ size = 24, gap = 18 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap }}>
      {LINKS.map((l) => (
        <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" aria-label={l.name} style={{ color: 'var(--inv-fg, #FFFFFF)', display: 'flex' }}>
          <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24">{l.icon}</svg>
        </a>
      ))}
    </div>
  );
}
