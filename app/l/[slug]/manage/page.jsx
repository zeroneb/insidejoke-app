import Link from 'next/link';
import { Avatar } from '@/components/ui';
import { membersOf } from '@/lib/collab';
import { removeMember } from '@/lib/actions-a4';
import { redirect, notFound } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { all } from '@/lib/db';
import { listBySlug, itemsFor, withProgress } from '@/lib/lists';
import { setListArchived, deleteList } from '@/lib/actions-a2';
import { Blob } from '@/components/ui';
import { SplitTitle } from '@/components/owner-list';
import ManageForm from '@/components/manage-form';
import ManageRows from '@/components/manage-list-r2';

export const dynamic = 'force-dynamic';


export default async function ManagePage({ params, searchParams }) {
  const { slug } = await params;
  const sp = (await searchParams) || {};
  const list = await listBySlug(slug);
  if (!list) notFound();
  const me = await currentUser();
  if (!me) redirect(`/signup?next=/l/${slug}/manage`);
  if (list.owner_id !== me.id) redirect(`/l/${slug}`);
  const items = await itemsFor(list.id);
  const people = (await membersOf(list.id)).filter((u) => u.id !== list.owner_id);
  const archivedItems = await Promise.all((await all('SELECT * FROM items WHERE list_id = ? AND removed = 2 ORDER BY created_at DESC', list.id)).map(withProgress));
  const archived = list.status === 'archived';
  const plain = (it) => ({ id: it.id, name: it.name, color: it.color, store: it.store, url: it.url, photo: it.photo ? 1 : 0, price_cents: it.price_cents, quantity: it.quantity, unlimited: it.unlimited, covered: it.covered, pct: it.pct, givers: it.givers, timesTreated: it.timesTreated });

  return (
    <main style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <section style={{ position: 'relative', background: archived ? '#8C8A86' : '#E8642C', color: '#FFFFFF', height: 300, overflow: 'hidden', flexShrink: 0 }}>
        <div aria-hidden="true" className="breathe" style={{ position: 'absolute', right: -70, bottom: -80, width: 260, height: 260, borderRadius: '50%', background: '#13286B' }} />
        <header style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 0 8px' }}>
          <Link href={`/l/${slug}`} aria-label="Back" className="iconbtn"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></Link>
          <form action={setListArchived}>
            <input type="hidden" name="slug" value={slug} /><input type="hidden" name="archive" value={archived ? '0' : '1'} />
            <button style={{ border: '2px solid #FFFFFF', background: 'transparent', color: '#FFFFFF', fontFamily: 'inherit', fontWeight: 800, fontSize: 13, padding: '9px 14px', borderRadius: 999, cursor: 'pointer' }}>{archived ? 'Unarchive list' : 'Archive list'}</button>
          </form>
        </header>
        <Blob seed={5} width={320} height={190} style={{ left: -24, top: 64 }} />
        <h1 className="serif" style={{ position: 'relative', margin: '40px 0 0', padding: '0 60px 0 20px', color: '#000000', fontWeight: 400, fontSize: (list.title || '').length > 22 ? 40 : 50, lineHeight: 0.92 }}><SplitTitle title={list.title} /></h1>
        <p style={{ position: 'relative', margin: '16px 0 0', padding: '0 20px', color: '#13286B', fontWeight: 800, fontSize: 14 }}>{archived ? 'Archived · friends can no longer see this list' : `${list.visibility === 'private' ? 'Only people you pick' : 'Friends can see'} · ${items.length} ${items.length === 1 ? 'thing' : 'things'}`}</p>
      </section>

      <ManageRows slug={slug} active={items.map(plain)} archived={archivedItems.map(plain)} />

      <section style={{ padding: '30px 20px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 className="wide" style={{ margin: 0, fontSize: 14, letterSpacing: '0.16em' }}>List settings</h2>
        <ManageForm slug={slug} title={list.title} visibility={list.visibility} date={list.date} surprise={!!list.surprise} ring={list.ring_text || ''} ringDefault={list.for_who === 'other' && list.recipient_name ? `${list.recipient_name.toLowerCase()}'s list · things ${list.recipient_name.toLowerCase()} would actually loveeee` : 'your list · things you would actually loveeee'} />
        {archived ? <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: '#4A4A4A' }}>Money already given stays in your wallet. Unarchive to open it again.</p> : null}
      </section>
      <section aria-labelledby="h-people" style={{ padding: '30px 20px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8 }}>
          <h2 id="h-people" className="wide" style={{ margin: 0, fontSize: 14, letterSpacing: '0.16em' }}>Collaborators</h2>
          <Link href={`/l/${slug}/invite`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 14, textDecoration: 'none', color: '#000000', padding: '10px 0' }}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>Add</Link>
        </div>
        <p style={{ margin: '0 0 6px', fontSize: 13, lineHeight: 1.45, color: '#4A4A4A' }}>Collaborators can add, edit and share things on this list with you.</p>
        {people.length === 0 ? <p style={{ margin: 0, padding: '14px 0', borderTop: '1.5px solid #000000', fontSize: 15 }}>Just you for now.</p> : null}
        {people.map((u) => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1.5px solid #000000' }}>
            <Avatar user={u} size={40} />
            <span style={{ flexGrow: 1, minWidth: 0, fontWeight: 700, fontSize: 16 }}>{u.name || 'Someone'}</span>
            <form action={removeMember}>
              <input type="hidden" name="slug" value={slug} /><input type="hidden" name="userId" value={u.id} />
              <button aria-label={`Remove ${u.name || 'this person'} from the list`} style={{ border: '1.5px solid #E2452B', background: 'transparent', color: '#E2452B', fontFamily: 'inherit', fontWeight: 800, fontSize: 13, padding: '9px 14px', borderRadius: 999, cursor: 'pointer' }}>Remove</button>
            </form>
          </div>
        ))}
        <div style={{ borderTop: '1.5px solid #000000' }} />
      </section>
      <section style={{ padding: '28px 20px 0' }}>
        {sp?.delete === 'cashout' ? <p role="alert" style={{ margin: '0 0 12px', padding: '10px 12px', border: '2px solid #E2452B', color: '#E2452B', fontWeight: 700, fontSize: 14 }}>There's money on this list you haven't cashed out. Cash it out first, then delete.</p> : null}
        <details className="del-list">
          <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 15, color: '#E2452B', textDecoration: 'underline', textUnderlineOffset: 3, padding: '10px 0', listStyle: 'none' }}>Delete this list</summary>
          <form action={deleteList} style={{ marginTop: 10, border: '2px solid #E2452B', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="hidden" name="slug" value={slug} /><input type="hidden" name="confirm" value="delete" />
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.35 }}>Delete "{list.title}" for good? Friends' links stop working and it can't be undone. Gifts already given stay in your history.</p>
            <button style={{ height: 50, border: 0, borderRadius: 999, background: '#E2452B', color: '#FFFFFF', fontFamily: 'inherit', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>Yes, delete it</button>
          </form>
        </details>
      </section>
      <div style={{ height: 40 }} />
    </main>
  );
}
