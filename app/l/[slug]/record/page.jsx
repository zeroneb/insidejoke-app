import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { listBySlug } from '@/lib/lists';
import { canEdit, firstName, whoFor } from '@/lib/collab';
import { messagesFor, countKinds } from '@/lib/surprise';
import Nav from '@/components/nav';
import { Boil, Hdr, BROWN, RUST } from '@/components/a4';
import Recorder from '@/components/a4-record';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Add to the card · insidejoke' };

export default async function RecordPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const list = await listBySlug(slug);
  if (!list) notFound();
  const me = await currentUser();
  if (!me) redirect(`/signup?next=/l/${slug}/record`);
  if (!(await canEdit(list, me))) redirect(`/l/${slug}`);
  const name = whoFor(list);
  const k = countKinds(await messagesFor(list.id));
  const mode = ['card', 'voice', 'video'].includes(sp?.mode) ? sp.mode : 'voice';
  const parts = [k.card && `${k.card} ${k.card === 1 ? 'note' : 'notes'}`, k.voice && `${k.voice} ${k.voice === 1 ? 'voice note' : 'voice notes'}`, k.video && `${k.video} ${k.video === 1 ? 'video' : 'videos'}`].filter(Boolean);
  const already = parts.length ? `${parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0]} ${parts.length === 1 && (k.card + k.voice + k.video) === 1 ? 'is' : 'are'} already on ${name}'s card. Yours plays in the order it was added.` : `Nothing on ${name}'s card yet. Yours goes first.`;
  return (
    <main className="a4 a4-blue withnav">
      <Hdr back={`/l/${slug}/surprise`} ink="#000" wide>{list.title} · {list.surprise ? 'secret' : 'card'}</Hdr>
      <section style={{ position: 'relative', padding: '18px 20px 0', height: 190 }}>
        <Boil seed={44} fill="#F4D3EE" left={-20} top={4} width={300} height={180} />
        <h1 style={{ position: 'relative', margin: '34px 0 0 10px', fontWeight: 400, fontSize: 44, lineHeight: 0.95, letterSpacing: '-0.03em', color: '#000' }}>Say it<br /><span className="serif" style={{ fontStyle: 'italic' }}>out loud</span></h1>
      </section>
      <p style={{ margin: '6px 20px 0', fontSize: 15, lineHeight: 1.45, color: '#000' }}>Add a note, a voice note or a short video to {name}'s card. Only {name} sees it, when the surprise opens.</p>
      <Recorder slug={slug} name={name} initialMode={mode} me={firstName(me)} />
      <p style={{ margin: '22px 20px 0', paddingTop: 14, borderTop: `2px solid ${RUST}`, fontFamily: "'EB Garamond', serif", fontSize: 19, lineHeight: 1.3, color: '#000' }}>{already}</p>
      <div style={{ height: 40 }} />
      <Nav me={me} active="home" addHref={`/l/${slug}/add`} />
    </main>
  );
}
