import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { setSetting, logOut, deleteAccount, switchAccount } from '@/lib/actions';
import { paymentMethod } from '@/lib/payments';
import { payoutMethod } from '@/lib/wallet';
import { spacedPhone, Chevron } from '@/components/profile-hero';
import { ProfileForm, PhoneChange } from '@/components/settings-forms';
import { handleFor } from '@/lib/handles';
import Nav from '@/components/nav';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Settings · insidejoke' };

// A switch is a one-button form: it posts the opposite of its current value.
function Switch({ k, on, label }) {
  return (
    <form action={setSetting}>
      <input type="hidden" name="key" value={k} />
      <input type="hidden" name="value" value={on ? '0' : '1'} />
      <button className="a1-sw" role="switch" aria-checked={on ? 'true' : 'false'} aria-label={label}><span /></button>
    </form>
  );
}

const TEXTS = [
  ['notify_covered', 'When a wish is covered', 'The moment something on a list is fully paid for.'],
  ['notify_share', 'When a friend shares a list', 'A new list from one of your friends.'],
  ['notify_reminders', 'Reminders before dates', 'A nudge a week before birthdays and dates you saved.']
];

// "Card ••4242" -> ["Card", "••4242"] so the digits sit in Doto.
const splitLabel = (s) => { const m = /^(.*?)\s*([•·]+\s?\d+)$/.exec(s || ''); return m ? [m[1], '••' + m[2].replace(/[^\d]/g, '')] : [s, '']; };

export default async function SettingsPage({ searchParams }) {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/you/settings');
  const sp = await searchParams;
  const pay = await paymentMethod(me.id);
  const out = await payoutMethod(me.id);
  const pub = me.profile_public !== 0;
  const radio = (on, left) => ({ flex: '1 1 0', height: 44, border: '1.5px solid #000000', borderLeft: left ? '1.5px solid #000000' : 0, borderRadius: left ? '999px 0 0 999px' : '0 999px 999px 0', background: on ? '#000000' : 'transparent', color: on ? '#FFFFFF' : '#000000', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, cursor: 'pointer', width: '100%' });

  return (
    <>
      <main className="withnav" style={{ display: 'flex', flexDirection: 'column' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 12px 0 8px' }}>
          <Link href="/you" aria-label="Back to your profile" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg></Link>
          <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em' }}>Settings</span>
          <span style={{ width: 44 }} />
        </header>

        <section style={{ padding: '22px 20px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h1 style={{ margin: 0, fontWeight: 400, fontSize: 44, letterSpacing: '-0.03em', lineHeight: 0.95 }}>Your <span className="it">settings</span></h1>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6 }}><span className="hi">Only you see this page.</span></p>
        </section>

        <section aria-labelledby="h-profile" style={{ padding: '32px 20px 0', display: 'flex', flexDirection: 'column' }}>
          <h2 id="h-profile" className="a1-cap" style={{ margin: '0 0 10px' }}>Profile</h2>
          <ProfileForm me={{ id: me.id, name: me.name, bio: me.bio, photo: me.photo, seed: me.seed, color: me.color, handle: await handleFor(me) }} />
        </section>

        <section aria-labelledby="h-phone" style={{ padding: '32px 20px 0', display: 'flex', flexDirection: 'column' }}>
          <h2 id="h-phone" className="a1-cap" style={{ margin: '0 0 10px' }}>Phone number</h2>
          <PhoneChange shown={spacedPhone(me.phone)} />
          <p className="a1-s" role={sp?.phone === 'changed' ? 'status' : undefined} style={{ margin: 0, padding: '10px 0 0', borderTop: '1px solid #000000' }}>
            {sp?.phone === 'changed' ? <span style={{ background: '#D4FA4F', color: '#000', padding: '2px 6px' }}>Number switched. Log in with it from now on.</span> : 'We text a code to the new number before anything switches.'}
          </p>
        </section>

        <section aria-labelledby="h-thanks" style={{ padding: '32px 20px 0', display: 'flex', flexDirection: 'column' }}>
          <h2 id="h-thanks" className="a1-cap" style={{ margin: '0 0 10px' }}>Thank-yous</h2>
          <div className="a1-row">
            <span className="a1-lab"><span className="a1-t">Weekly thank-you digest</span><span className="a1-s">One text on Sunday listing everyone who treated you that week, so you can thank them in one go.</span></span>
            <Switch k="weekly_thanks" on={!!me.weekly_thanks} label="Weekly thank-you digest" />
          </div>
          <Link href="/you/thanks" className="a1-link" style={{ borderTop: '1px solid #000000', fontSize: 14 }}><span>See last week’s digest</span><Chevron /></Link>
          <div style={{ borderTop: '1px solid #000000' }} />
        </section>

        <section aria-labelledby="h-money" style={{ padding: '32px 20px 0', display: 'flex', flexDirection: 'column' }}>
          <h2 id="h-money" className="a1-cap" style={{ margin: '0 0 10px' }}>Money</h2>
          <div className="a1-row">
            <span className="a1-lab"><span className="a1-t">Payouts go to</span>{out ? <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 15 }}>{splitLabel(out.label)[0]} <span className="dot" style={{ fontSize: 16 }}>{splitLabel(out.label)[1]}</span></span> : <span className="a1-s">Not set up yet. You add it the first time you cash out.</span>}</span>
            <Link href="/wallet/payout" className="a1-ghost">{out ? 'Change' : 'Set up'}</Link>
          </div>
          <div className="a1-row">
            <span className="a1-lab"><span className="a1-t">You give with</span>{pay ? <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 15 }}>{splitLabel(pay.label)[0]} <span className="dot" style={{ fontSize: 16 }}>{splitLabel(pay.label)[1]}</span></span> : <span className="a1-s">Added the first time you give.</span>}</span>
            <Link href="/you/payment" className="a1-ghost">{pay ? 'Change' : 'Add'}</Link>
          </div>
          <Link href="/wallet" className="a1-link" style={{ borderTop: '1px solid #000000', borderBottom: '1px solid #000000', fontSize: 14 }}><span>Balance and cash out</span><Chevron /></Link>
        </section>

        <section aria-labelledby="h-texts" style={{ padding: '32px 20px 0', display: 'flex', flexDirection: 'column' }}>
          <h2 id="h-texts" className="a1-cap" style={{ margin: '0 0 10px' }}>Texts from insidejoke</h2>
          {TEXTS.map(([k, t, s]) => (
            <div key={k} className="a1-row">
              <span className="a1-lab"><span className="a1-t">{t}</span><span className="a1-s">{s}</span></span>
              <Switch k={k} on={me[k] !== 0} label={t} />
            </div>
          ))}
          <p className="a1-s" style={{ margin: 0, padding: '10px 0 0', borderTop: '1px solid #000000' }}>We only text. No email, no push, never more than a few a week.</p>
        </section>

        <section aria-labelledby="h-look" style={{ padding: '32px 20px 0', display: 'flex', flexDirection: 'column' }}>
          <h2 id="h-look" className="a1-cap" style={{ margin: '0 0 10px' }}>Appearance</h2>
          <div style={{ borderTop: '1px solid #000000', padding: '14px 0 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span className="a1-t">Theme</span>
            <form action={setSetting} role="radiogroup" aria-label="Theme" style={{ display: 'flex' }}>
              <input type="hidden" name="key" value="theme" />
              {[['light', 'Light'], ['dark', 'Dark'], ['auto', 'Match phone']].map(([k, label], i) => {
                const on = (me.theme || 'light') === k;
                return <button key={k} name="value" value={k} role="radio" aria-checked={on ? 'true' : 'false'} className={on ? 'theme-on' : ''} style={{ flex: '1 1 0', height: 44, border: '1.5px solid #000000', marginLeft: i ? -1.5 : 0, borderRadius: i === 0 ? '999px 0 0 999px' : i === 2 ? '0 999px 999px 0' : 0, background: on ? '#000000' : 'transparent', color: on ? '#FFFFFF' : '#000000', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>{label}</button>;
              })}
            </form>
            <p className="a1-s" style={{ margin: '0 0 14px' }}>{me.theme === 'dark' ? 'Dark grounds, same colors on your lists. Easier on the eyes at night.' : me.theme === 'auto' ? 'Follows your phone: light by day, dark when your phone switches.' : 'The classic light gray ground.'}</p>
          </div>
        </section>

        <section aria-labelledby="h-privacy" style={{ padding: '32px 20px 0', display: 'flex', flexDirection: 'column' }}>
          <h2 id="h-privacy" className="a1-cap" style={{ margin: '0 0 10px' }}>Privacy</h2>
          <div style={{ borderTop: '1px solid #000000', padding: '14px 0 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span className="a1-t">Who can open your profile</span>
            <form action={setSetting} role="radiogroup" aria-label="Who can open your profile" style={{ display: 'flex' }}>
              <input type="hidden" name="key" value="profile_public" />
              <button name="value" value="1" role="radio" aria-checked={pub ? 'true' : 'false'} style={radio(pub, true)}>Anyone with the link</button>
              <button name="value" value="0" role="radio" aria-checked={pub ? 'false' : 'true'} style={radio(!pub, false)}>Friends only</button>
            </form>
            <p className="a1-s" style={{ margin: '0 0 14px' }}>{pub ? 'Anyone you send your link to can open your profile and give from your public lists, no account needed.' : 'Only your friends on insidejoke can open your profile. Shared links still work for the list you shared.'}</p>
          </div>
          <div style={{ borderTop: '1px solid #000000' }} />
        </section>

        <section style={{ padding: '40px 20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
          <form action={logOut} style={{ width: '100%' }}><button className="a1-ghost" style={{ width: '100%', height: 52, fontSize: 16 }}>Log out</button></form>
          <form action={switchAccount} style={{ width: '100%', marginTop: -10 }}><button style={{ width: '100%', height: 44, border: 0, background: 'transparent', fontFamily: 'inherit', fontWeight: 700, fontSize: 15, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer', color: 'inherit' }}>Log in with another number</button></form>
          <details className="a1-del" style={{ width: '100%' }}>
            <summary><span className="a1-del-closed">Delete account</span><span className="a1-del-open">Keep my account</span></summary>
            <form action={deleteAccount} className="a1up" role="group" aria-label="Delete account" style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #E2452B', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input type="hidden" name="confirm" value="delete" />
              <span className="wide" style={{ fontSize: 11, letterSpacing: '0.18em', color: '#E2452B' }}>Delete account</span>
              <p style={{ margin: 0, fontSize: 17, lineHeight: 1.3 }}>This removes your lists, your history and your friends’ notes. Anything not cashed out is lost.</p>
              <Link href="/wallet" style={{ fontSize: 14, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, minHeight: 44, display: 'inline-flex', alignItems: 'center' }}>Cash out first</Link>
              <button style={{ height: 52, border: 0, borderRadius: 999, background: '#E2452B', color: '#FFFFFF', fontFamily: 'inherit', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>Delete for good</button>
            </form>
          </details>
        </section>
        <div style={{ height: 24 }} />
      </main>
      <Nav me={me} active="you" />
    </>
  );
}
