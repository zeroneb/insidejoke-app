import { redirect, notFound } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { listBySlug, itemsFor, owner as ownerOf } from '@/lib/lists';
import { appUrl } from '@/lib/texts';
import { shareMessage } from '@/lib/share-a2';
import { blob } from '@/lib/blob';
import { tileInk } from '@/components/friend-list';
import { SplitTitle } from '@/components/owner-list';
import ShareSheet from '@/components/share-sheet';

export const dynamic = 'force-dynamic';

export default async function SharePage({ params }) {
  const { slug } = await params;
  const list = await listBySlug(slug);
  if (!list) notFound();
  const me = await currentUser();
  if (!me) redirect(`/signup?next=/l/${slug}/share`);
  const isOwner = me.id === list.owner_id;
  // Friends can pass a public list along; private and surprise lists are shared by the owner only.
  if (!isOwner && (list.visibility === 'private' || list.surprise)) redirect(`/l/${slug}`);
  const owner = await ownerOf(list);
  const items = await itemsFor(list.id);
  const link = `${appUrl()}/l/${slug}`;
  const msg = shareMessage({ list, sharerName: me.name, ownerName: owner?.name, link });
  const vis = list.surprise ? 'Surprise' : list.visibility === 'private' ? 'Private' : 'Public';
  const heroBg = isOwner ? '#E8642C' : '#13286B';

  return (
    <main style={{ position: 'relative', minHeight: '100dvh', overflow: 'hidden', flexGrow: 1 }}>
      {/* The list, dimmed behind the sheet */}
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
        <section style={{ position: 'relative', background: heroBg, color: '#FFFFFF', height: 300, overflow: 'hidden', flexShrink: 0 }}>
          {isOwner ? <div style={{ position: 'absolute', right: -70, bottom: -80, width: 260, height: 260, borderRadius: '50%', background: '#13286B' }} /> : null}
          <header style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 0 8px' }}>
            <span style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></span>
            <span style={{ border: '2px solid #FFFFFF', color: '#FFFFFF', fontWeight: 800, fontSize: 13, padding: '9px 14px', borderRadius: 999 }}>Share</span>
          </header>
          <svg style={{ position: 'absolute', left: -24, top: 64 }} width="320" height="190" viewBox="0 0 200 200" preserveAspectRatio="none"><path d={blob(5, 11)} fill="#D8F75A" /></svg>
          <span className="serif" style={{ position: 'relative', display: 'block', margin: '40px 0 0', padding: '0 20px', color: '#000000', fontWeight: 400, fontSize: (list.title || '').length > 22 ? 40 : 50, lineHeight: 0.92 }}><SplitTitle title={list.title} /></span>
          <span style={{ position: 'relative', display: 'block', margin: '16px 0 0', padding: '0 20px', color: '#13286B', fontWeight: 800, fontSize: 14 }}>{vis} · {items.length} {items.length === 1 ? 'thing' : 'things'} so far</span>
        </section>
        <section style={{ padding: '14px 20px 0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 6 }}><span className="wide" style={{ fontSize: 16, letterSpacing: '0.12em' }}>On the list</span>{isOwner ? <span style={{ fontWeight: 800, fontSize: 14, padding: '10px 0' }}>+ Add</span> : null}</div>
          {items.slice(0, 4).map((it) => (
            <div key={it.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', borderTop: '1.5px solid #000000' }}>
              <span style={{ width: 54, height: 54, flexShrink: 0, background: it.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="dot" style={{ fontSize: 13, color: tileInk(it.color) }}>{(it.name.split(/\s+/).slice(-1)[0] || '').slice(0, 6).toUpperCase()}</span></span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flexGrow: 1, minWidth: 0 }}><span style={{ fontWeight: 800, fontSize: 15 }}>{it.name}</span><span style={{ fontSize: 12 }}>{it.unlimited ? 'Unlimited' : `×${it.quantity}`}{it.store ? ` · ${it.store}` : ''}</span></span>
              <span className="dot" style={{ fontSize: 16 }}>{it.unlimited ? `×${it.timesTreated}` : `${it.pct}%`}</span>
            </div>
          ))}
        </section>
      </div>
      <ShareSheet slug={slug} title={list.title} url={link} body={msg.body} back={`/l/${slug}`} />
    </main>
  );
}
