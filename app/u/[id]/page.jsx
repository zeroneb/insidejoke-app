import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { publicListsOf, between, profileLately, friendCounts } from '@/lib/lists';
import { ListTile, tileData } from '@/components/list-tile';
import { PhotoBlob } from '@/components/ui';
import { addFriend, unfriend } from '@/lib/actions-a1';
import TextFriendForm from '@/components/text-friend-form';
import ShareProfile from '@/components/share-profile';
import { appUrl } from '@/lib/texts';
import { handleFor } from '@/lib/handles';
import { isAdmin } from '@/lib/admin';
import { get, all } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const u = await get('SELECT name FROM users WHERE id = ?', id);
  return { title: `${u?.name || 'Profile'} · insidejoke` };
}

const first = (n) => (n || '').trim().split(/\s+/)[0] || 'them';
const possessive = (n) => (n.endsWith('s') ? `${n}’` : `${n}’s`);
const shortDate = (ts) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const Check = () => <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>;
const Plus = () => <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="2.07" strokeLinecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>;
const PILL = { marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, border: '1.5px solid var(--edge, #000000)', fontFamily: 'inherit', fontWeight: 800, fontSize: 15, height: 44, padding: '0 18px', borderRadius: 999, cursor: 'pointer', color: 'var(--ink, #000)', textDecoration: 'none', boxSizing: 'border-box' };

// a1/r1: a friend's profile, Option 10 FriendProfile.
export default async function FriendProfile({ params }) {
  const { id } = await params;
  const them = (await get('SELECT * FROM users WHERE id = ?', id)) || (await get('SELECT * FROM users WHERE handle = ?', String(id).toLowerCase()));
  if (!them || them.phone.startsWith('deleted:')) notFound();
  const me = await currentUser();
  const self = me?.id === them.id;
  const fr = me && !self ? await get("SELECT * FROM friends WHERE user_id = ? AND friend_id = ? AND status = 'friends'", me.id, them.id) : null;
  const friend = !!fr;
  const name = first(them.name);
  // Friends-only profiles: non-friends see the hero and nothing else.
  const locked = !self && !friend && them.profile_public === 0;
  const lists = locked ? [] : await publicListsOf(them.id, friend || self ? me.id : null);
  // The founder (ADMIN_PHONES) also sees this person's private lists, tagged Private. Nobody else does.
  const admin = !self && isAdmin(me);
  if (admin) {
    const shown = new Set(lists.map((l) => l.id));
    const extra = await all("SELECT * FROM lists WHERE owner_id = ? AND status = 'open' AND surprise = 0 AND for_who = 'me' AND visibility = 'private' ORDER BY created_at DESC", them.id);
    lists.push(...extra.filter((l) => !shown.has(l.id)));
  }
  const tiles = await Promise.all(lists.map((l) => tileData(l, me?.id)));
  tiles.sort((x, y) => (x.kind === 'treat') - (y.kind === 'treat')); // r1: wish lists first, as on the board
  const seen = {};
  const idx = (k) => (seen[k] = (seen[k] ?? -1) + 1);
  const fc = await friendCounts(them.id, me?.id);
  const recent = friend ? await profileLately(lists) : [];
  const gifts = me && !self ? await between(me.id, them.id) : [];
  const fromThem = gifts.filter((g) => g.giver_id === them.id).length;
  const toThem = gifts.length - fromThem;
  const timeline = gifts.slice(0, 6).map((g) => {
    const mine = g.giver_id === me.id;
    const from = g.store ? ` from ${g.store}` : '';
    const treat = g.quantity === 0;
    const text = mine
      ? (treat ? `You treated ${name} to ${g.item_name}${from}` : `You put money toward ${possessive(name)} ${g.item_name}`)
      : (treat ? `${name} treated you to ${g.item_name}${from}` : `${name} put money toward your ${g.item_name}`);
    return { id: g.id, text, when: shortDate(g.created_at), color: mine ? '#B36EE0' : them.color };
  });

  return (
    <>
      <main className={me ? 'withnav' : ''} style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 0 8px' }}>
          <Link href={me ? '/friends' : '/'} aria-label="Back" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="1.73" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></Link>
          <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em' }}>Profile</span>
          {friend ? (
            <a href="#text" aria-label={`Text ${name}`} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="1.62" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16v11H9l-5 4z" /></svg></a>
          ) : <span style={{ width: 44 }} />}
        </header>

        <section style={{ position: 'relative', padding: '18px 20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10 }}>
          <PhotoBlob user={them} owner={self} size={150} pad={22} uid="them" fontSize={74} />
          <h1 style={{ margin: '6px 0 0', fontWeight: 400, fontSize: 34, letterSpacing: '-0.02em', lineHeight: 1 }}>{(them.name || 'Someone').trim().split(/\s+/)[0]}{(them.name || '').trim().split(/\s+/).length > 1 ? <> <span className="serif" style={{ fontStyle: 'italic' }}>{them.name.trim().split(/\s+/).slice(1).join(' ')}</span></> : null}</h1>
          {them.bio ? <span style={{ fontSize: 15 }}>{them.bio}</span> : null}
          {self ? (
            <Link href="/friends" style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink, #000000)' }}>{fc.n} {fc.n === 1 ? 'friend' : 'friends'}</Link>
          ) : (
            me && fc.n && (!locked || isAdmin(me)) ? (
              <Link href={`/u/${them.id}/friends`} style={{ fontSize: 14, color: 'var(--ink, #000000)' }}><b>{fc.n} {fc.n === 1 ? 'friend' : 'friends'}</b>{fc.mutual ? ` · ${fc.mutual} in common` : ''}</Link>
            ) : <span style={{ fontSize: 14 }}><b>{fc.n} {fc.n === 1 ? 'friend' : 'friends'}</b>{fc.mutual ? ` · ${fc.mutual} in common` : ''}</span>
          )}
          {self ? (
            <>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link href="/you/settings" style={{ ...PILL, background: 'transparent' }}>Edit</Link>
                <ShareProfile iconOnly url={`${appUrl()}/${(await handleFor(them)) || 'u/' + them.id}`} name={them.name} style={{ ...PILL, width: 44, padding: 0, justifyContent: 'center', background: 'transparent' }} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--muted, #4A4A4A)' }}>This is how others see your profile.</span>
            </>
          ) : friend ? (
            <>
              <a href="#friend-options" aria-haspopup="dialog" style={{ ...PILL, background: 'var(--lt, #D4FA4F)' }}><Check />Friends<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink, #000000)" strokeWidth="1.96" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg></a>
              <span style={{ fontSize: 12, color: 'var(--muted, #4A4A4A)' }}>On insidejoke together</span>
            </>
          ) : me ? (
            <>
              <form action={addFriend}><input type="hidden" name="userId" value={them.id} /><button style={{ ...PILL, background: 'transparent' }}><Plus />Add friend</button></form>
              <span style={{ fontSize: 12, color: 'var(--muted, #4A4A4A)' }}>Not friends right now. {name} wasn’t notified.</span>
            </>
          ) : (
            <>
              <Link href={`/signup?next=/u/${them.id}`} style={{ ...PILL, background: 'transparent' }}><Plus />Add friend</Link>
              <span style={{ fontSize: 12, color: 'var(--muted, #4A4A4A)' }}>Sign up with your number to be friends with {name}.</span>
            </>
          )}
        </section>

        {friend ? (
          <section id="text" className="a1-target" style={{ margin: '20px 20px 0' }}>
            <TextFriendForm userId={them.id} name={name} />
          </section>
        ) : null}

        {me && !self ? (
          <section aria-label={`${name} and you`} style={{ margin: '24px 20px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1.5px solid var(--line, #000000)', borderBottom: '1.5px solid var(--line, #000000)' }}>
            <div style={{ padding: '14px 0', display: 'flex', flexDirection: 'column', gap: 2, borderRight: '1.5px solid var(--line, #000000)' }}><span className="dot" style={{ fontSize: 30, color: '#E8642C' }}>{fromThem}</span><span style={{ fontSize: 13 }}>{fromThem === 1 ? 'gift' : 'gifts'} {possessive(name)} sent you</span></div>
            <div style={{ padding: '14px 0 14px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}><span className="dot" style={{ fontSize: 30, color: 'var(--navy-ink, #13286B)' }}>{toThem}</span><span style={{ fontSize: 13 }}>you’ve sent {name}</span></div>
          </section>
        ) : null}

        <section style={{ padding: '26px 20px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 className="serif" style={{ margin: 0, fontWeight: 400, fontSize: 30, lineHeight: 1 }}>{possessive(name)} <span style={{ fontWeight: 600 }}>lists</span></h2>
          {tiles.length ? (
            <div className="tile-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              {tiles.map((t) => admin && t.visibility === 'private' ? (
                <div key={t.id} style={{ position: 'relative' }}>
                  <ListTile t={t} i={idx(t.kind) + 1} variant="friend" />
                  <span style={{ position: 'absolute', right: 8, top: 8, background: 'var(--inv-bg, #000000)', color: 'var(--inv-fg, #FFFFFF)', fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', padding: '4px 9px', borderRadius: 999, pointerEvents: 'none' }}>Private · admin view</span>
                </div>
              ) : <ListTile key={t.id} t={t} i={idx(t.kind) + (self ? 0 : 1)} variant="friend" />)}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45 }}>{locked ? `${name} shares their profile with friends only.` : `${name} has no public lists right now.`}</p>
          )}
          {!friend && !self && tiles.length ? <p style={{ margin: 0, fontSize: 13, color: 'var(--muted, #4A4A4A)', lineHeight: 1.4 }}>You only see {possessive(name)} public lists now.</p> : null}
        </section>

        {recent.length ? (
          <section aria-label={`What ${name} has been up to`} style={{ padding: '26px 20px 0', display: 'flex', flexDirection: 'column' }}>
            <h2 className="wide" style={{ margin: '0 0 8px', fontSize: 15, letterSpacing: '0.12em' }}>Lately</h2>
            {recent.map((e) => (
              <Link key={e.key} href={e.href} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '12px 0', borderTop: '1px solid var(--line, #000000)', color: 'var(--ink, #000000)', textDecoration: 'none' }}>
                <span style={{ fontSize: 14, lineHeight: 1.35 }}>
                  {e.kind === 'list' ? <>Started a new list, <b>{e.title}</b></> : e.kind === 'added' ? <>Added <b>{e.item}</b> to {e.title}</> : <><b>{e.item}</b> is covered</>}
                </span>
                <span style={{ flexShrink: 0, fontSize: 12, color: 'var(--muted, #4A4A4A)' }}>{shortDate(e.at)}</span>
              </Link>
            ))}
          </section>
        ) : null}

        {timeline.length ? (
          <section style={{ padding: '26px 20px 0', display: 'flex', flexDirection: 'column' }}>
            <h2 className="wide" style={{ margin: '0 0 8px', fontSize: 15, letterSpacing: '0.12em' }}>Between you two</h2>
            {timeline.map((b) => (
              <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '12px 0', borderTop: '1px solid var(--line, #000000)' }}>
                <span style={{ fontSize: 14, lineHeight: 1.35 }}>{b.text}</span>
                <span style={{ flexShrink: 0, fontSize: 12, color: 'var(--muted, #4A4A4A)' }}>{b.when}</span>
              </div>
            ))}
          </section>
        ) : null}
        <div style={{ height: 24 }} />

        {friend ? (
          <div id="friend-options" className="a1-sheetwrap">
            <a href="#" aria-label="Close" style={{ position: 'absolute', inset: 0, background: 'rgba(19,40,107,0.45)' }} />
            <div className="a1sheet" role="dialog" aria-label="Friend options" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: 'var(--surface, #FFFFFF)', padding: '22px 20px 26px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span className="a1-cap">{them.name}</span>
              <p style={{ margin: 0, fontSize: 24, lineHeight: 1.15, letterSpacing: '-0.02em' }}>Unfriend <span className="it">{name}?</span></p>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: 'var(--sub, #2A2A2A)' }}>{name} won’t be notified. {name} leaves your Lately feed, and you only see their public lists. Add {name} back anytime from this profile.</p>
              <form action={unfriend} style={{ display: 'flex' }}><input type="hidden" name="userId" value={them.id} /><button style={{ flexGrow: 1, height: 52, border: 0, background: 'var(--dk, #E2452B)', color: 'var(--inv-fg, #FFFFFF)', fontFamily: 'inherit', fontWeight: 800, fontSize: 16, borderRadius: 999, cursor: 'pointer' }}>Unfriend</button></form>
              <a href="#" style={{ height: 50, border: '1.5px solid var(--edge, #000000)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, borderRadius: 999, textDecoration: 'none', color: 'var(--ink, #000)' }}>Keep as friend</a>
            </div>
          </div>
        ) : null}
      </main>
    </>
  );
}
