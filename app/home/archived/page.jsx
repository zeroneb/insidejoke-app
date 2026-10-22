import Link from 'next/link';
import { deleteList } from '@/lib/actions-a2';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { all } from '@/lib/db';
import { ago } from '@/lib/time';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Archived · insidejoke' };

// a1: lists you archived, from the Home "Archived" row.
export default async function Archived() {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/home/archived');
  const lists = await all("SELECT * FROM lists WHERE owner_id = ? AND status = 'archived' ORDER BY COALESCE(archived_at, created_at) DESC", me.id);
  return (
    <>
      <main className="withnav">
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 0 8px' }}>
          <Link href="/home" aria-label="Back" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></Link>
          <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em' }}>Archived</span>
          <span style={{ width: 44 }} />
        </header>
        <section style={{ padding: '22px 20px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h1 style={{ margin: 0, fontWeight: 400, fontSize: 44, letterSpacing: '-0.03em', lineHeight: 0.95 }}>Put <span className="it">away</span></h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45 }}>Archived lists stay here with their notes. Friends cannot give to them.</p>
        </section>
        <section style={{ padding: '24px 20px 0', display: 'flex', flexDirection: 'column' }}>
          {lists.map((l) => (
            <div key={l.id} style={{ borderTop: '1px solid #000000' }}>
            <Link href={`/l/${l.slug}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', minHeight: 56, fontWeight: 700, fontSize: 15 }}>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span>{l.title}</span><span style={{ fontWeight: 400, fontSize: 13, color: '#4A4A4A' }}>Archived {ago(l.archived_at || l.created_at)}</span></span>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
            </Link>
            <details style={{ paddingBottom: 10 }}>
              <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#E2452B', listStyle: 'none', width: 'fit-content', padding: '4px 0' }}>Delete</summary>
              <form action={deleteList} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingTop: 6 }}>
                <input type="hidden" name="slug" value={l.slug} /><input type="hidden" name="confirm" value="delete" /><input type="hidden" name="back" value="/home/archived" />
                <span style={{ fontSize: 14 }}>Delete for good? This can't be undone.</span>
                <button style={{ height: 40, padding: '0 16px', border: 0, borderRadius: 999, background: '#E2452B', color: '#FFFFFF', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Yes, delete</button>
              </form>
            </details>
            </div>
          ))}
          {lists.length === 0 ? <p style={{ margin: 0, padding: '16px 0', borderTop: '1px solid #000000', fontSize: 15, color: '#4A4A4A' }}>Nothing archived.</p> : null}
          <div style={{ borderTop: '1px solid #000000' }} />
        </section>
      </main>
    </>
  );
}
