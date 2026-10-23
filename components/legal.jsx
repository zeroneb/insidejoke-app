// Shared layout for the Privacy and Terms pages.
import Link from 'next/link';
import { Header } from '@/components/ui';

export const LEGAL = {
  name: process.env.LEGAL_NAME || 'insidejoke',
  email: process.env.CONTACT_EMAIL || '',
  state: process.env.LEGAL_STATE || 'New York',
  updated: 'October 23, 2026'
};

export function Mail() {
  return LEGAL.email ? <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> : <span>the contact email on our menu page</span>;
}

export function LegalPage({ title, intro, sections }) {
  return (
    <main>
      <Header back="/menu" title={title} />
      <article className="page legal">
        <h1>{title}</h1>
        <p className="legal-date">Last updated {LEGAL.updated}</p>
        {intro ? <p>{intro}</p> : null}
        <nav aria-label="Sections" className="legal-toc">
          {sections.map((s, i) => <a key={i} href={`#s${i + 1}`}>{i + 1}. {s.h}</a>)}
        </nav>
        {sections.map((s, i) => (
          <section key={i} id={`s${i + 1}`}>
            <h2>{i + 1}. {s.h}</h2>
            {s.body}
          </section>
        ))}
        <Link href="/" style={{ fontSize: 14 }}>Back to insidejoke</Link>
      </article>
    </main>
  );
}
