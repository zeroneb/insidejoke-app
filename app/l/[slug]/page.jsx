import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { get } from '@/lib/db';
import { listBySlug, itemsFor, owner } from '@/lib/lists';
import OwnerList from '@/components/owner-list';
import FriendList from '@/components/friend-list';
import { Blob } from '@/components/ui';
import { isMember, latestBlast, teamOf } from '@/lib/collab';
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
        <Link2 href={`/l/${slug}`} aria-label="Close" className="iconbtn"><svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="1.73" strokeLinecap="round"><path d="M6 6l12 12" /><path d="M18 6L6 18" /></svg></Link2>
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
export const maxDuration = 60; // reading a store link can take a while

// Who may see a list that is not the owner's own:
// public + open: anyone with the link. Private: members (list_members) or numbers it was texted to.
// Surprise: never the person it is for, until it is sent. Archived: nobody.
const canSee = async (list, me) => (await import('@/lib/access')).canSeeList(list, me);

export default async function ListPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const list = await listBySlug(slug);
  if (!list) notFound();
  const me = await currentUser();
  if (me && (me.id === list.owner_id || (await isMember(list.id, me.id)))) return withPanel(slug, sp, <OwnerList list={list} items={await itemsFor(list.id)} me={me} blast={await latestBlast(list.id)} team={await teamOf(list)} />, true);
  const visible = await canSee(list, me);
  if (visible && list.for_who === 'other' && !list.surprise) redirect(`/l/${slug}/shared`);
  if (!visible) {
    return (
      <main style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <section className="bleed-top" style={{ position: 'relative', background: 'var(--dk, #13286B)', height: 'calc(300px + var(--sat, 0px))', overflow: 'hidden' }}>
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
  if (!(await import('@/lib/admin')).isAdmin(me)) (await import('@/lib/events')).logEvent('list_view', { userId: me?.id || null, ref: list.id, detail: me ? 'signed_in' : 'visitor' });
  return withPanel(slug, sp, <FriendList list={list} owner={await owner(list)} items={await itemsFor(list.id)} me={me} team={await teamOf(list)} />, false);
}
