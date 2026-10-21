import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { listBySlug, itemById } from '@/lib/lists';
import { EditItemForm } from '@/components/add-item-form';

export const dynamic = 'force-dynamic';

export default async function EditItemPage({ params }) {
  const { slug, itemId } = await params;
  const list = await listBySlug(slug);
  if (!list) notFound();
  const me = await currentUser();
  if (!me) redirect(`/signup?next=/l/${slug}/i/${itemId}/edit`);
  if (list.owner_id !== me.id) redirect(`/l/${slug}/i/${itemId}`);
  const it = await itemById(itemId);
  if (!it || it.list_id !== list.id) notFound();
  const added = new Date(Number(it.created_at)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const contributed = it.givers > 0;
  const item = { id: it.id, name: it.name, price_cents: it.price_cents, quantity: it.quantity, store: it.store, url: it.url, note: it.note, photo: it.photo, color: it.color };
  const D = ({ children }) => <span className="dot" style={{ fontSize: 15, color: '#000000' }}>{children}</span>;
  return (
    <main style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 0 8px' }}>
        <Link href={`/l/${slug}`} aria-label="Close without saving" className="iconbtn"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg></Link>
        <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em', textAlign: 'center' }}>{list.title}</span>
        <div style={{ width: 44 }} />
      </header>
      <section style={{ padding: '12px 20px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h1 style={{ margin: 0, fontWeight: 400, fontSize: 36, lineHeight: 1, letterSpacing: '-0.035em' }}>Edit · <span className="serif" style={{ fontStyle: 'italic', fontSize: 40 }}>{it.name}</span></h1>
        <span style={{ fontSize: 14, color: '#4A4A4A' }}>
          {it.unlimited
            ? <>Given <D>×{it.timesTreated}</D> by <D>{it.givers}</D> {it.givers === 1 ? 'friend' : 'friends'} · added <D>{added}</D></>
            : it.givers
              ? <><D>{it.pct}%</D> covered by <D>{it.givers}</D> {it.givers === 1 ? 'friend' : 'friends'} · added <D>{added}</D></>
              : <>Nobody has given yet · added <D>{added}</D></>}
        </span>
      </section>
      <EditItemForm slug={slug} item={item} listTitle={list.title} contributed={contributed} />
    </main>
  );
}
