import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { profileStats, publicListsOf } from '@/lib/lists';
import { ListTile, tileData } from '@/components/list-tile';
import { ProfileHero, Stats, Chevron, monthYear, spacedPhone } from '@/components/profile-hero';
import Nav from '@/components/nav';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'You · insidejoke' };

const STEPS = [
  { n: 1, title: 'Add a wish or a treat', text: 'Paste where it’s from, or snap a photo of the thing.' },
  { n: 2, title: 'Share your list', text: 'One link by text. Friends don’t need an account to give.' },
  { n: 3, title: 'Friends cover it, you cash out', text: 'Each one leaves a note. You thank them in one go.' }
];

const Gear = () => <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.7a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.7a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.5c.07-.4.1-.8.1-1.2z" /></svg>;

export default async function YouPage() {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/you');
  const stats = await profileStats(me.id);
  const lists = (await publicListsOf(me.id, null)).filter((l) => l.visibility === 'public');
  const tiles = await Promise.all(lists.map((l) => tileData(l, me.id)));
  const seen = {};
  const idx = (k) => (seen[k] = (seen[k] ?? -1) + 1);

  return (
    <>
      <main className="withnav" style={{ display: 'flex', flexDirection: 'column' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 0 12px' }}>
          <span style={{ width: 44 }} />
          <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em' }}>Your profile</span>
          <Link href={`/u/${me.id}`} aria-label="Share your profile" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v13" /><path d="M7 8l5-5 5 5" /><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></svg></Link>
        </header>

        <ProfileHero user={me} owner ring={`insidejoke since ${monthYear(me.created_at)}`} uid="you">
          <span className="dot" style={{ fontSize: 16, letterSpacing: '0.04em' }}>{spacedPhone(me.phone)}</span>
          <Link href="/you/settings" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, border: '1.5px solid #000000', background: 'transparent', textDecoration: 'none', fontWeight: 800, fontSize: 15, height: 44, padding: '0 18px', boxSizing: 'border-box', borderRadius: 999 }}><Gear />Edit profile &amp; settings</Link>
          <span style={{ fontSize: 12, color: '#4A4A4A' }}>Friends see your name, bio and public lists. Only you see your number.</span>
        </ProfileHero>

        <Stats label="Your numbers" cells={[[stats.lists, stats.lists === 1 ? 'list' : 'lists'], [stats.friends, stats.friends === 1 ? 'friend' : 'friends'], [stats.covered, stats.covered === 1 ? 'thing covered' : 'things covered']]} />

        <section style={{ padding: '28px 20px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '6px 10px' }}>
            <h2 className="serif" style={{ margin: 0, fontWeight: 400, fontSize: 30, lineHeight: 1, whiteSpace: 'nowrap' }}>Your <span style={{ fontWeight: 600 }}>public lists</span></h2>
            <span className="wide" style={{ fontSize: 11, letterSpacing: '0.14em', color: '#13286B', flexShrink: 0 }}>What friends see</span>
          </div>
          {tiles.length ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                {tiles.map((t) => <ListTile key={t.id} t={t} i={idx(t.kind)} big={false} />)}
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#4A4A4A', lineHeight: 1.4 }}>Surprise lists and collabs never show here. Change who sees a list from its page.</p>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <span className="wide" aria-hidden="true" style={{ fontSize: 44, lineHeight: 0.9, letterSpacing: '0.02em', color: '#13286B' }}>Nothing<br />on it<br />yet</span>
              <ol aria-label="How it works" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
                {STEPS.map((s, k) => (
                  <li key={s.n} style={{ display: 'flex', gap: 14, alignItems: 'stretch' }}>
                    <span aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, flexShrink: 0 }}>
                      <span className="dot" style={{ width: 28, height: 28, borderRadius: '50%', background: '#13286B', color: '#D4FA4F', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{s.n}</span>
                      {k < STEPS.length - 1 ? <span style={{ flexGrow: 1, width: 0, borderLeft: '2px dotted #13286B', margin: '4px 0' }} /> : null}
                    </span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 22 }}><span style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.2 }}>{s.title}</span><span style={{ fontSize: 14, lineHeight: 1.4, color: '#4A4A4A' }}>{s.text}</span></span>
                  </li>
                ))}
              </ol>
              <Link href="/lists/new" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 52, borderRadius: 999, background: '#000000', color: '#FFFFFF', textDecoration: 'none', fontWeight: 800, fontSize: 16 }}>Make your first list</Link>
            </div>
          )}
        </section>

        <section style={{ margin: '32px 20px 0', display: 'flex', flexDirection: 'column' }}>
          <Link href="/you/settings" className="a1-link" style={{ borderTop: '1.5px solid #000000', minHeight: 56 }}><span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span>Settings</span><span style={{ fontWeight: 400, fontSize: 13, color: '#4A4A4A' }}>Name, bio, photo, dark mode, payouts, texts</span></span><Chevron /></Link>
          <Link href="/wallet/history" className="a1-link" style={{ borderTop: '1px solid #000000', borderBottom: '1.5px solid #000000', minHeight: 56 }}><span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span>History</span><span style={{ fontWeight: 400, fontSize: 13, color: '#4A4A4A' }}>Given, received, cash-outs. Only you see this.</span></span><Chevron /></Link>
        </section>
        <div style={{ height: 24 }} />
      </main>
      <Nav me={me} active="you" />
    </>
  );
}
