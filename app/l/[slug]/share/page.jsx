import { smsEnabled, isTestMode } from '@/lib/texts';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { listBySlug, owner as ownerOf } from '@/lib/lists';
import { appUrl } from '@/lib/texts';
import { firstName } from '@/components/friend-list';
import ShareSheet from '@/components/share-sheet';

export const dynamic = 'force-dynamic';

const fmtDate = (d) => {
  if (!d) return null;
  const t = new Date(d + 'T12:00:00');
  return isNaN(t) ? null : t.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

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
  const base = appUrl();
  const link = `${base}/l/${slug}`;
  const forName = list.for_who === 'other' && list.recipient_name ? list.recipient_name : firstName(owner);
  const occ = (list.occasion || '').trim();
  const kind = occ ? occ.toLowerCase() : '';
  const headline = occ ? (/birthday/i.test(occ) ? `${forName}'s birthday` : `${forName}'s ${occ.toLowerCase()}`) : list.title;
  const handle = (owner?.name || 'you').trim().toLowerCase().replace(/\s+/g, '.');

  return (
    <main style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px 0 8px' }}>
        <Link href={`/l/${slug}`} aria-label="Back" className="iconbtn"><svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="1.73" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></Link>
        <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em' }}>Share</span>
      </header>
      <section style={{ padding: '14px 20px 0' }}>
        <h1 className="serif" style={{ margin: 0, fontWeight: 400, fontSize: 42, lineHeight: 0.98 }}>Where should <span style={{ fontWeight: 600 }}>it go?</span></h1>
        <p style={{ margin: '10px 0 0', fontSize: 15, lineHeight: 1.4 }}>Here's exactly how it'll look to friends.</p>
      </section>
      <ShareSheet
        canText={smsEnabled() || isTestMode()}
        slug={slug}
        title={list.title}
        url={link}
        profileUrl={owner ? `${base}/u/${owner.id}` : link}
        ownerFirst={forName}
        kind={kind}
        sharer={firstName(me)}
        invite={{ headline, when: fmtDate(list.date), isPrivate: list.visibility === 'private' }}
        profile={{ handle, bio: isOwner ? owner?.bio || '' : '' }}
        canProfile={isOwner && list.for_who === 'me' && !list.surprise && list.visibility !== 'private'}
      />
    </main>
  );
}
