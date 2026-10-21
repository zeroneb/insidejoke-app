import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { all } from '@/lib/db';
import { listBySlug, itemsFor } from '@/lib/lists';
import { setListArchived, setItemRemoved } from '@/lib/actions-a2';
import { Blob } from '@/components/ui';
import { tileInk } from '@/components/friend-list';
import { SplitTitle } from '@/components/owner-list';
import ManageForm from '@/components/manage-form';

export const dynamic = 'force-dynamic';

const stat = (it) => (it.unlimited ? `×${it.timesTreated}` : it.covered ? 'DONE' : `${it.pct}%`);
const tag = (name) => (name.split(/[\s,]+/).filter(Boolean).slice(-1)[0] || '').slice(0, 6).toUpperCase();

export default async function ManagePage({ params }) {
  const { slug } = await params;
  const list = await listBySlug(slug);
  if (!list) notFound();
  const me = await currentUser();
  if (!me) redirect(`/signup?next=/l/${slug}/manage`);
  if (list.owner_id !== me.id) redirect(`/l/${slug}`);
  const items = await itemsFor(list.id);
  const removed = await all('SELECT id, name FROM items WHERE list_id = ? AND removed = 1 ORDER BY created_at DESC', list.id);
  const archived = list.status === 'archived';
  const H = { margin: 0, fontSize: 12, letterSpacing: '0.18em' };

  return (
    <main style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, paddingBottom: 40 }}>
      <section style={{ position: 'relative', background: archived ? '#8C8A86' : '#E8642C', color: '#FFFFFF', height: 300, overflow: 'hidden', flexShrink: 0 }}>
        <div aria-hidden="true" className="breathe" style={{ position: 'absolute', right: -70, bottom: -80, width: 260, height: 260, borderRadius: '50%', background: '#13286B' }} />
        <header style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 0 8px' }}>
          <Link href={`/l/${slug}`} aria-label="Back to the list" className="iconbtn"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></Link>
          <form action={setListArchived}>
            <input type="hidden" name="slug" value={slug} /><input type="hidden" name="archive" value={archived ? '0' : '1'} />
            <button style={{ border: '2px solid #FFFFFF', background: 'transparent', color: '#FFFFFF', fontFamily: 'inherit', fontWeight: 800, fontSize: 13, padding: '9px 14px', borderRadius: 999, cursor: 'pointer' }}>{archived ? 'Unarchive list' : 'Archive list'}</button>
          </form>
        </header>
        <Blob seed={5} width={320} height={190} style={{ left: -24, top: 64 }} />
        <h1 className="serif" style={{ position: 'relative', margin: '40px 0 0', padding: '0 60px 0 20px', color: '#000000', fontWeight: 400, fontSize: (list.title || '').length > 22 ? 40 : 50, lineHeight: 0.92 }}><SplitTitle title={list.title} /></h1>
        <p style={{ position: 'relative', margin: '16px 0 0', padding: '0 20px', color: '#13286B', fontWeight: 800, fontSize: 14 }}>{archived ? 'Archived · friends can no longer see this list' : `${list.visibility === 'private' ? 'Only people you share with' : 'Friends can see'} · ${items.length} ${items.length === 1 ? 'thing' : 'things'}`}</p>
      </section>

      <section style={{ padding: '22px 20px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 className="wide" style={H}>List settings</h2>
        <ManageForm slug={slug} title={list.title} visibility={list.visibility} date={list.date} surprise={!!list.surprise} />
        {archived ? <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: '#4A4A4A' }}>Money already given stays in your wallet. Unarchive to open it again.</p> : null}
      </section>

      <section style={{ padding: '30px 20px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 6 }}>
          <h2 className="wide" style={{ margin: 0, fontSize: 16, letterSpacing: '0.12em' }}>On the list</h2>
          <Link href={`/l/${slug}/add`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 14, textDecoration: 'none', padding: '10px 0', color: '#000' }}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>Add</Link>
        </div>
        {items.map((it) => (
          <div key={it.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', borderTop: '1.5px solid #000000' }}>
            <span style={{ width: 54, height: 54, flexShrink: 0, background: it.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="dot" style={{ fontSize: 13, color: tileInk(it.color), textAlign: 'center', lineHeight: 1 }}>{tag(it.name)}</span></span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flexGrow: 1, minWidth: 0 }}><span style={{ fontWeight: 800, fontSize: 15 }}>{it.name}</span><span style={{ fontSize: 12 }}>{it.unlimited ? 'Treat' : 'Wish'}{it.givers ? ` · ${it.givers} ${it.givers === 1 ? 'friend' : 'friends'}` : ''}{it.store ? ` · ${it.store}` : ''}</span></span>
            <span className="dot" style={{ fontSize: 16, flexShrink: 0 }}>{stat(it)}</span>
            <Link href={`/l/${slug}/i/${it.id}/edit`} aria-label={`Edit ${it.name}`} style={{ width: 40, height: 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20l4-1 11-11-3-3L5 16z" /><path d="M13 8l3 3" /></svg></Link>
          </div>
        ))}
        {!items.length ? <p style={{ margin: 0, padding: '14px 0', borderTop: '1.5px solid #000000', fontSize: 14, color: '#4A4A4A' }}>Nothing on it yet.</p> : null}
      </section>

      <section style={{ margin: '22px 20px 0', borderTop: '2.5px solid #000000', borderBottom: '2.5px solid #000000', padding: '12px 0 6px', display: 'flex', flexDirection: 'column' }}>
        <h2 className="wide" style={{ margin: '0 0 4px', fontSize: 14, letterSpacing: '0.16em' }}>Removed · {removed.length}</h2>
        <span style={{ fontSize: 12, paddingBottom: 6 }}>Hidden from friends. Contributions stay safe.</span>
        {removed.map((it) => (
          <form key={it.id} action={setItemRemoved} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px dashed #000000', opacity: 0.75 }}>
            <input type="hidden" name="slug" value={slug} /><input type="hidden" name="itemId" value={it.id} /><input type="hidden" name="removed" value="0" />
            <span style={{ flexGrow: 1, fontWeight: 700, fontSize: 14 }}>{it.name}</span>
            <button style={{ border: '2px solid #000000', background: 'transparent', fontFamily: 'inherit', fontWeight: 800, fontSize: 12, padding: '8px 12px', borderRadius: 999, cursor: 'pointer', color: '#000' }}>Restore</button>
          </form>
        ))}
      </section>
    </main>
  );
}
