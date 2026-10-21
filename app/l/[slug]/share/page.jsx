import { redirect, notFound } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { listBySlug } from '@/lib/lists';
import { appUrl } from '@/lib/texts';
import { Header } from '@/components/ui';
import ShareSheet from '@/components/share-sheet';

export const dynamic = 'force-dynamic';

export default async function SharePage({ params }) {
  const { slug } = await params;
  const list = listBySlug(slug);
  if (!list) notFound();
  const me = await currentUser();
  if (!me) redirect(`/signup?next=/l/${slug}/share`);
  if (list.owner_id !== me.id) redirect(`/l/${slug}`);
  const whose = list.for_who === 'other' ? `${list.recipient_name}'s` : 'a';
  const occ = list.occasion ? `${list.occasion.toLowerCase()} ` : '';
  return (
    <main>
      <Header back={`/l/${slug}`} title="Share" />
      <section style={{ padding: '18px 20px 0' }}>
        <h1 style={{ margin: 0, fontWeight: 400, fontSize: 40, lineHeight: 0.98, letterSpacing: '-0.035em' }}>Send it <span className="it" style={{ fontSize: 44 }}>anywhere.</span></h1>
        <p className="muted" style={{ margin: '10px 0 0', fontSize: 15, lineHeight: 1.4 }}>One link. Nobody has to guess, and nobody doubles up.</p>
      </section>
      <ShareSheet slug={slug} title={list.title} ownerName={me.name || 'A friend'} url={`${appUrl()}/l/${slug}`} whose={list.for_who === 'other' ? whose : `a ${occ}`} />
    </main>
  );
}
