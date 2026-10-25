import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { get } from '@/lib/db';
import { listBySlug } from '@/lib/lists';
import { canEdit, listProgress, whoFor } from '@/lib/collab';
import { remindersFor, giftByAt } from '@/lib/reminders';
import { setGiftDate } from '@/lib/actions-a4';
import Nav from '@/components/nav';
import { Boil, Hdr, RED, DEEP } from '@/components/a4';
import { earliestToday, PAST_DATE_ERROR } from '@/lib/time';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Gift-by date · insidejoke' };

const DAY = 86400000, HOUR = 3600000;
const short = (t) => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default async function RemindersPage({ params, searchParams }) {
  const { slug } = await params;
  const past = (await searchParams)?.past === '1';
  const list = await listBySlug(slug);
  if (!list) notFound();
  const me = await currentUser();
  if (!me) redirect(`/signup?next=/l/${slug}/reminders`);
  if (!(await canEdit(list, me))) redirect(`/l/${slug}`);
  const name = list.for_who === 'other' ? whoFor(list) : 'your';
  const whose = list.for_who === 'other' ? `${name}'s` : 'your';
  const at = giftByAt(list);
  const p = await listProgress(list.id);
  const rows = await remindersFor(list.id);
  const lastBlast = await get('SELECT * FROM blasts WHERE list_id = ? ORDER BY created_at DESC LIMIT 1', list.id);
  const left = at ? Math.max(0, at - Date.now()) : 0;
  const count = [[String(Math.floor(left / DAY)).padStart(2, '0'), 'days'], [String(Math.floor((left % DAY) / HOUR)).padStart(2, '0'), 'hours'], [String(Math.floor((left % HOUR) / 60000)).padStart(2, '0'), 'min']];
  const status = (kind) => {
    const r = rows.filter((x) => x.kind === kind);
    if (!r.length) return list.shared_at ? '' : 'Starts once the list is shared';
    return r.map((x) => (x.sent_at ? `Sent ${short(x.sent_at)}` : `Due ${short(x.due_at)}`)).join(' · ');
  };
  const rem = [
    { when: 'WEEK 1', title: 'A week after sharing', sub: `A friendly nudge with how close ${whose} list is.`, st: status('week_after') },
    ...(at ? [{ when: '−2 HRS', title: 'Two hours before the date', sub: `Last call: “${list.for_who === 'other' ? `${name}'s` : 'The'} gift-by date is in 2 hours. ${p.pct}% covered.”`, st: status('before_date') }] : []),
    ...(list.surprise ? [{ when: '+1 DAY', title: 'If the surprise stays wrapped', sub: `${list.for_who === 'other' ? name : 'They'} get a light nudge 1 day and 3 days after it's sent.`, st: status('surprise_unopened') }] : []),
    { when: 'ANYTIME', title: 'Your own text blast', sub: 'Organizers can send one whenever they like.', st: '' }
  ];
  const dateLabel = at ? new Date(at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' · 6 pm' : '';
  return (
    <main className="a4 r4-pink withnav">
      <Hdr back={list.for_who === 'other' ? `/l/${slug}/collab` : `/l/${slug}`}>{list.title} · settings</Hdr>
      <section style={{ position: 'relative', padding: '10px 20px 0', height: 150 }}>
        <Boil seed={17} left={10} top={0} width={260} height={150} />
        <h1 style={{ position: 'relative', margin: '30px 0 0 14px', fontWeight: 400, fontSize: 42, lineHeight: 0.95, letterSpacing: '-0.03em', color: '#000' }}>Gift-by <span className="serif" style={{ fontStyle: 'italic' }}>date</span></h1>
      </section>

      <form action={setGiftDate} style={{ display: 'flex', flexDirection: 'column' }}>
        <input type="hidden" name="slug" value={slug} />
        <label htmlFor="dateOn" style={{ margin: '16px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderTop: `1.5px solid ${RED}`, borderBottom: `1.5px solid ${RED}`, padding: '14px 0', cursor: 'pointer' }}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontWeight: 800, fontSize: 16, color: '#000' }}>Set a gift-by date</span><span style={{ fontSize: 12, color: DEEP }}>Optional. A nudge, not a cutoff.</span></span>
          <span className="a4-sw"><input id="dateOn" name="on" type="checkbox" role="switch" defaultChecked={!!list.date} /><span /></span>
        </label>
        <div className="a4-if a4-if-dateon" style={{ margin: '12px 20px 0', gap: 8, alignItems: 'center' }}>
          <label htmlFor="gdate" className="sr">Gift-by date</label>
          <input id="gdate" type="date" name="date" min={list.date && list.date < earliestToday() ? list.date : earliestToday()} defaultValue={list.date || ''} style={{ flexGrow: 1, minWidth: 0, height: 48, border: '2px solid #000', background: '#fff', fontFamily: 'inherit', fontSize: 16, padding: '0 12px', color: '#000', borderRadius: 0 }} />
        </div>
        {past ? <div className="err" role="alert" style={{ margin: '10px 20px 0' }}>{PAST_DATE_ERROR}</div> : null}
        <button style={{ alignSelf: 'flex-end', margin: '10px 20px 0', height: 40, border: 0, background: RED, color: '#fff', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, padding: '0 18px', borderRadius: 999, cursor: 'pointer' }}>Save</button>
      </form>

      {at ? (
        <section className="pop" style={{ margin: '16px 16px 0', background: RED, color: '#fff', padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span className="wide" style={{ fontSize: 12, letterSpacing: '0.16em' }}>{dateLabel}</span>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
            {count.map(([v, u]) => <span key={u} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span className="dot" style={{ fontSize: 52, lineHeight: 0.9, color: '#F4D3EE' }}>{v}</span><span style={{ fontSize: 12, fontWeight: 700 }}>{u}</span></span>)}
          </div>
          <span style={{ fontSize: 13, lineHeight: 1.4 }}>Everyone sees this countdown on the list. People can keep giving after it, right up until you cash out or archive.</span>
        </section>
      ) : null}

      <section style={{ padding: '26px 20px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 8 }}>
          <h2 className="wide" style={{ margin: 0, fontSize: 14, letterSpacing: '0.14em' }}>Reminders</h2>
          <span style={{ fontSize: 12, fontWeight: 700 }}>{me.notify_reminders === 0 ? 'Off in your settings' : list.for_who === 'other' ? 'Always on for collab lists' : 'On'}</span>
        </div>
        {rem.map((r) => (
          <div key={r.when} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 0', borderTop: `1.5px solid ${RED}` }}>
            <span className="dot" style={{ flexShrink: 0, width: 64, fontSize: 15, lineHeight: 1.2 }}>{r.when}</span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 4, color: '#000' }}>
              <span style={{ fontWeight: 800, fontSize: 15 }}>{r.title}</span>
              <span style={{ fontSize: 13, lineHeight: 1.4, color: '#6A2A20' }}>{r.sub}</span>
              {r.st ? <span style={{ fontSize: 12, fontWeight: 700, color: RED }}>{r.st}</span> : null}
            </span>
          </div>
        ))}
        <p style={{ margin: '4px 0 0', paddingTop: 12, borderTop: `1.5px solid ${RED}`, fontSize: 12, lineHeight: 1.45, color: DEEP }}>Reminders never single anyone out. People who already gave get a progress update instead, and anyone can opt out.</p>
      </section>

      <section style={{ margin: '22px 16px 0', background: '#fff', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, color: '#000' }}>
        <span className="wide" style={{ fontSize: 12, letterSpacing: '0.16em', color: RED }}>Text blast</span>
        <span style={{ fontSize: 14, lineHeight: 1.4 }}>Send your own note to everyone the list was shared with.</span>
        {lastBlast ? <span style={{ fontSize: 13, fontWeight: 700, color: '#2E9B47' }}>Last one went to {lastBlast.recipients} {lastBlast.recipients === 1 ? 'person' : 'people'} · {short(lastBlast.created_at)}</span> : null}
        <Link href={`/l/${slug}/blast`} className="a4-btn" style={{ fontSize: 16, padding: '15px 0' }}>{lastBlast ? 'Send another' : 'Write a text blast'}</Link>
      </section>
      <div style={{ height: 30 }} />
      <Nav me={me} active="home" addHref={`/l/${slug}/add`} />
    </main>
  );
}
