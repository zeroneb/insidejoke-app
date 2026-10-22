import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { get } from '@/lib/db';
import { listBySlug, itemsFor, owner } from '@/lib/lists';
import OwnerList from '@/components/owner-list';
import FriendList from '@/components/friend-list';
import { Blob } from '@/components/ui';
import { isMember, latestBlast } from '@/lib/collab';
import { redirect } from 'next/navigation';
import Link2 from 'next/link';
import ItemView from '@/components/views/item-view';
import GiveView from '@/components/views/give-view';
import AddItemForm from '@/components/add-item-form';
import PanelLinks from '@/components/panel-links';

// Laptop: the list with a side panel (item, contribute, add). The panel only shows at ≥900px wide.
async function withPanel(slug, sp, view, canAdd) {
  let panel = null;
  if (sp?.item && sp?.give) panel = <GiveView slug={slug} itemId={String(sp.item)} mode={sp.mode} />;
  else if (sp?.item) panel = <ItemView slug={slug} itemId={String(sp.item)} />;
  else if (sp?.add && canAdd) panel = (
    <main style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 0 16px', gap: 8 }}>
        <span className="wide" style={{ fontSize: 12, letterSpacing: '0.16em' }}>Add an item</span>
        <Link2 href={`/l/${slug}`} aria-label="Close" className="iconbtn"><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg></Link2>
      </header>
      <AddItemForm slug={slug} initialTreat={sp?.treat === '1'} />
    </main>
  );
  return (
    <div className={panel ? 'split has-panel' : 'split'}>
      <PanelLinks slug={slug} />
      <div className="split-main">{view}</div>
      {panel ? <aside className="split-panel" aria-label="Details" key={JSON.stringify(sp)}>{panel}</aside> : null}
    </div>
  );
}

export const dynamic = 'force-dynamic';

// Who may see a list that is not the owner's own:
// public + open: anyone with the link. Private: members (list_members) or numbers it was texted to.
// Surprise: never the person it is for, until it is sent. Archived: nobody.
async function canSee(list, me) {
  if (list.status === 'archived') return false;
  if (list.surprise && !list.sent_at && me && list.recipient_id === me.id) return false;
  if (list.visibility !== 'private') return true;
  if (!me) return false;
  if (await get('SELECT 1 FROM list_members WHERE list_id = ? AND user_id = ?', list.id, me.id)) return true;
  return !!(await get('SELECT 1 FROM list_shares WHERE list_id = ? AND phone = ?', list.id, me.phone));
}

export default async function ListPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const list = await listBySlug(slug);
  if (!list) notFound();
  const me = await currentUser();
  if (me && (me.id === list.owner_id || (await isMember(list.id, me.id)))) return withPanel(slug, sp, <OwnerList list={list} items={await itemsFor(list.id)} me={me} blast={await latestBlast(list.id)} />, true);
  if (list.for_who === 'other' && !list.surprise) redirect(`/l/${slug}/shared`);
  if (!(await canSee(list, me))) {
    return (
      <main style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <section style={{ position: 'relative', background: '#13286B', height: 300, overflow: 'hidden' }}>
          <Blob seed={5} width={320} height={200} style={{ left: 35, top: 50 }} />
          <h1 className="serif" style={{ position: 'absolute', left: 40, right: 40, top: 112, margin: 0, textAlign: 'center', fontWeight: 400, fontSize: 40, lineHeight: 0.95 }}>Nothing to see <span style={{ fontStyle: 'italic' }}>here</span></h1>
        </section>
        <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.45 }}>{me ? 'This list is private, or it is not open anymore. Ask whoever sent it to share it with your number.' : 'This list is private. If someone shared it with you, sign in with that number.'}</p>
          <Link href={me ? '/home' : `/signup?next=/l/${slug}`} className="btn" style={{ height: 54, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{me ? 'Back home' : 'Sign in'}</Link>
        </div>
      </main>
    );
  }
  return withPanel(slug, sp, <FriendList list={list} owner={await owner(list)} items={await itemsFor(list.id)} me={me} />, false);
}
