import Link from 'next/link';
import { notFound } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { get } from '@/lib/db';
import { publicListsOf, between } from '@/lib/lists';
import { ListTile, tileData } from '@/components/list-tile';
import { ProfileHero, Stats, monthYear } from '@/components/profile-hero';
import { addFriend, unfriend } from '@/lib/actions-a1';
import TextFriendForm from '@/components/text-friend-form';
import Nav from '@/components/nav';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const u = await get('SELECT name FROM users WHERE id = ?', id);
  return { title: `${u?.name || 'Profile'} · insidejoke` };
}

const first = (n) => (n || '').trim().split(/\s+/)[0] || 'them';
const possessive = (n) => (n.endsWith('s') ? `${n}’` : `${n}’s`);
const shortDate = (ts) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const Check = () => <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>;
const Plus = () => <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>;
const PILL = { marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, border: '1.5px solid #000000', fontFamily: 'inherit', fontWeight: 800, fontSize: 15, height: 44, padding: '0 18px', borderRadius: 999, cursor: 'pointer', color: '#000', textDecoration: 'none', boxSizing: 'border-box' };

// a1: a friend's profile, Option 13 FriendProfile.
export default async function FriendProfile({ params }) {
  const { id } = await params;
  const them = await get('SELECT * FROM users WHERE id = ?', id);
  if (!them || them.phone.startsWith('deleted:')) notFound();
  const me = await currentUser();
  const self = me?.id === them.id;
  const fr = me && !self ? await get("SELECT * FROM friends WHERE user_id = ? AND friend_id = ? AND status = 'friends'", me.id, them.id) : null;
  const friend = !!fr;
  const name = first(them.name);
  // Friends-only profiles: non-friends see the hero and nothing else.
  const locked = !self && !friend && them.profile_public === 0;
  const lists = locked ? [] : await publicListsOf(them.id, friend || self ? me.id : null);
  const tiles = await Promise.all(lists.map((l) => tileData(l, me?.id)));
  const seen = {};
  const idx = (k) => (seen[k] = (seen[k] ?? -1) + 1);
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
  const ring = friend ? `friends since ${monthYear(fr.created_at)}` : `insidejoke since ${monthYear(them.created_at)}`;

  return (
    <>
      <main className={me ? 'withnav' : ''} style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 0 8px' }}>
          <Link href={me ? '/friends' : '/'} aria-label="Back" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></Link>
          <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em' }}>Profile</span>
          {friend ? (
            <a href="#text" aria-label={`Text ${name}`} style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg aria-hidden="true" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16v11H9l-5 4z" /></svg></a>
          ) : <span style={{ width: 44 }} />}
        </header>

        <ProfileHero user={them} owner={self} ring={ring} uid="them">
          {self ? (
            <>
              <Link href="/you/settings" style={{ ...PILL, background: 'transparent' }}>Edit in settings</Link>
              <span style={{ fontSize: 12, color: '#4A4A4A' }}>This is how others see your profile. Copy the link to share it.</span>
            </>
          ) : friend ? (
            <>
              <a href="#friend-options" aria-haspopup="dialog" style={{ ...PILL, background: '#D4FA4F' }}><Check />Friends<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.2" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg></a>
              <span style={{ fontSize: 12, color: '#4A4A4A' }}>You see each other’s lists and show up in each other’s Lately.</span>
            </>
          ) : me ? (
            <>
              <form action={addFriend}><input type="hidden" name="userId" value={them.id} /><button style={{ ...PILL, background: 'transparent' }}><Plus />Add friend</button></form>
              <span style={{ fontSize: 12, color: '#4A4A4A' }}>Not friends right now. {name} wasn’t notified.</span>
            </>
          ) : (
            <>
              <Link href={`/signup?next=/u/${them.id}`} style={{ ...PILL, background: 'transparent' }}><Plus />Add friend</Link>
              <span style={{ fontSize: 12, color: '#4A4A4A' }}>Sign up with your number to be friends with {name}.</span>
            </>
          )}
        </ProfileHero>

        {friend ? (
          <section id="text" className="a1-target" style={{ margin: '20px 20px 0' }}>
            <TextFriendForm userId={them.id} name={name} />
          </section>
        ) : null}

        <Stats label={`${name} and you`} cells={me && !self
          ? [[tiles.length, tiles.length === 1 ? 'list' : 'lists'], [fromThem, `from ${name} to you`], [toThem, `from you to ${name}`]]
          : [[tiles.length, tiles.length === 1 ? 'list' : 'lists'], [0, 'from you'], [0, 'to you']]} />

        <section style={{ padding: '28px 20px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '6px 10px' }}>
            <h2 className="serif" style={{ margin: 0, fontWeight: 400, fontSize: 30, lineHeight: 1, whiteSpace: 'nowrap' }}>{possessive(name)} <span style={{ fontWeight: 600 }}>lists</span></h2>
            {tiles.length ? <span className="wide" style={{ fontSize: 11, letterSpacing: '0.14em', color: '#13286B' }}>Tap to give</span> : null}
          </div>
          {tiles.length ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              {tiles.map((t) => <ListTile key={t.id} t={t} i={idx(t.kind) + (self ? 0 : 1)} big={false} foot={t.kind === 'treat' ? ['treats', String(t.count)] : undefined} />)}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45 }}>{locked ? `${name} shares their profile with friends only.` : `${name} has no public lists right now.`}</p>
          )}
          {!friend && !self && tiles.length ? <p style={{ margin: 0, fontSize: 13, color: '#4A4A4A', lineHeight: 1.4 }}>You only see {possessive(name)} public lists now.</p> : null}
        </section>

        {timeline.length ? (
          <section style={{ padding: '32px 20px 0', display: 'flex', flexDirection: 'column' }}>
            <h2 className="wide" style={{ margin: '0 0 14px', fontSize: 11, letterSpacing: '0.18em', color: '#13286B' }}>Between you two</h2>
            <ol aria-label="Between you two" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' }}>
              {timeline.map((b, k) => (
                <li key={b.id} style={{ display: 'flex', gap: 14, alignItems: 'stretch' }}>
                  <span aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14, flexShrink: 0, paddingTop: 4 }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: b.color, flexShrink: 0 }} />
                    {k < timeline.length - 1 ? <span style={{ flexGrow: 1, width: 0, borderLeft: '2px dotted #13286B', margin: '4px 0' }} /> : null}
                  </span>
                  <span style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexGrow: 1, paddingBottom: 20, minWidth: 0 }}><span style={{ fontSize: 15, lineHeight: 1.35 }}>{b.text}</span><span className="dot" style={{ flexShrink: 0, fontSize: 13, color: '#4A4A4A' }}>{b.when}</span></span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
        <div style={{ height: 24 }} />

        {friend ? (
          <div id="friend-options" className="a1-sheetwrap">
            <a href="#" aria-label="Close" style={{ position: 'absolute', inset: 0, background: 'rgba(19,40,107,0.45)' }} />
            <div className="a1sheet" role="dialog" aria-label="Friend options" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: '#FFFFFF', padding: '22px 20px 26px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em', color: '#13286B' }}>{them.name}</span>
              <p style={{ margin: 0, fontSize: 24, lineHeight: 1.15, letterSpacing: '-0.02em' }}>Unfriend <span className="it">{name}?</span></p>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: '#2A2A2A' }}>{name} won’t be notified. {name} leaves your Lately feed, and you only see their public lists. Add {name} back anytime from this profile.</p>
              <form action={unfriend} style={{ display: 'flex' }}><input type="hidden" name="userId" value={them.id} /><button style={{ flexGrow: 1, height: 52, border: 0, background: '#E2452B', color: '#FFFFFF', fontFamily: 'inherit', fontWeight: 800, fontSize: 16, borderRadius: 999, cursor: 'pointer' }}>Unfriend</button></form>
              <a href="#" style={{ height: 50, border: '1.5px solid #000000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 16, borderRadius: 999, textDecoration: 'none', color: '#000' }}>Keep as friend</a>
            </div>
          </div>
        ) : null}
      </main>
      {me ? <Nav me={me} active="friends" /> : null}
    </>
  );
}
