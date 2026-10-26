import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { listBySlug } from '@/lib/lists';
import AddItemForm from '@/components/add-item-form';
import { isMember } from '@/lib/collab';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // reading a store link can take a while

export default async function AddItemPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const list = await listBySlug(slug);
  if (!list) notFound();
  const me = await currentUser();
  if (!me) redirect(`/signup?next=/l/${slug}/add`);
  if (list.owner_id !== me.id && !(await isMember(list.id, me.id))) redirect(`/l/${slug}`);
  return (
    <main style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 0 8px', gap: 8 }}>
        <Link href={`/l/${slug}`} aria-label="Close" className="iconbtn"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg></Link>
        <span style={{ fontWeight: 800, fontSize: 15, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Add to "{list.title}"</span>
        <div style={{ width: 44, flexShrink: 0 }} />
      </header>
      <AddItemForm slug={slug} initialTreat={sp?.treat === '1'} />
    </main>
  );
}
