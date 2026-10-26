import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { listBySlug, itemById } from '@/lib/lists';
import { EditItemForm } from '@/components/add-item-form';
import { isMember } from '@/lib/collab';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // reading a store link can take a while

export default async function EditItemPage({ params }) {
  const { slug, itemId } = await params;
  const list = await listBySlug(slug);
  if (!list) notFound();
  const me = await currentUser();
  if (!me) redirect(`/signup?next=/l/${slug}/i/${itemId}/edit`);
  if (list.owner_id !== me.id && !(await isMember(list.id, me.id))) redirect(`/l/${slug}/i/${itemId}`);
  const it = await itemById(itemId);
  if (!it || it.list_id !== list.id) notFound();
  const added = new Date(Number(it.created_at)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const contributed = it.givers > 0;
  const item = { id: it.id, name: it.name, price_cents: it.price_cents, quantity: it.quantity, store: it.store, url: it.url, note: it.note, photo: it.photo, color: it.color };
  const lead = it.covered ? 'All covered.' : it.pct >= 75 ? 'Almost there.' : it.pct >= 50 ? 'More than halfway.' : it.pct > 0 ? 'Off to a good start.' : 'Up for grabs.';
  const fr = (n) => `${n} ${n === 1 ? 'friend' : 'friends'}`;
  return (
    <main style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 0 8px', gap: 8 }}>
        <Link href={`/l/${slug}/i/${it.id}`} aria-label="Close without saving" className="iconbtn"><svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="1.73" strokeLinecap="round"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg></Link>
        <span style={{ fontWeight: 800, fontSize: 15, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Edit in "{list.title}"</span>
        <div style={{ width: 44, flexShrink: 0 }} />
      </header>
      <section style={{ padding: '16px 20px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h1 style={{ margin: 0, fontWeight: 400, fontSize: 32, lineHeight: 1.02, letterSpacing: '-0.035em' }}>{it.name}{it.quantity > 1 ? <> <span className="dot" style={{ fontSize: 30 }}>×{it.quantity}</span></> : null}</h1>
        <span style={{ fontWeight: 500, fontSize: 13 }}>{it.unlimited ? 'Unlimited treat' : it.quantity > 1 ? `A set of ${it.quantity}` : 'Just one'} · added {added}</span>
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {it.unlimited ? (
            <span style={{ fontSize: 14, color: 'var(--sub, #3A3A3A)' }}><b style={{ color: 'var(--ink, #000000)' }}>Given ×{it.timesTreated}.</b> {it.givers ? `${fr(it.givers)} sent one.` : 'Nobody has sent one yet.'}</span>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ flexGrow: 1, height: 10, borderRadius: 999, background: 'var(--surface2, #D7D7DC)', overflow: 'hidden' }}><div style={{ width: `${it.pct}%`, height: '100%', borderRadius: 999, background: it.covered ? 'var(--lt, #2E9B47)' : 'var(--dk, #5546A0)' }} /></div><span className="dot" style={{ fontSize: 16 }}>{it.pct}%</span></div>
              <span style={{ fontSize: 14, color: 'var(--sub, #3A3A3A)' }}><b style={{ color: 'var(--ink, #000000)' }}>{lead}</b> {it.givers ? `${fr(it.givers)} ${it.givers === 1 ? 'is' : 'are'} in.` : 'Nobody has given yet.'}</span>
            </>
          )}
        </div>
      </section>
      <EditItemForm slug={slug} item={item} listTitle={list.title} contributed={contributed} />
    </main>
  );
}
