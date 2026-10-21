import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { all } from '@/lib/db';
import Nav from '@/components/nav';
import { Boil, Hdr } from '@/components/a4';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your texts · insidejoke' };

// a4: the owner's own text history: every text insidejoke sent to their number, grouped by moment.
const GROUPS = [
  ['share', 'A list is shared', '#13286B', 'When a friend shares a list with you'],
  ['covered', 'Covered', '#E8642C', 'When something on your list is all covered'],
  ['thanks', 'Thank-yous', '#E8642C', 'From friends you gave to'],
  ['invite', 'Collab invites', '#E2452B', 'When someone asks you to build a list together'],
  ['joined', 'Collab updates', '#E2452B', 'Who joined, who picked what'],
  ['handoff', 'Collab updates', '#E2452B', null],
  ['blast', 'Text blasts', '#E2452B', 'Notes from organisers of lists you are on'],
  ['reminder', 'Reminders', '#B36EE0', 'Never singling anyone out'],
  ['digest', 'Weekly thank-yous', '#2E9B47', 'One text a week, if you chose it'],
  ['surprise', 'Surprises', '#C8743A', 'When friends have a surprise for you'],
  ['claimed', 'Surprises', '#C8743A', null]
];
const stamp = (t) => {
  const d = new Date(t), today = new Date();
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return d.toDateString() === today.toDateString() ? `Today ${time}` : `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${time}`;
};

export default async function TextsPage() {
  const me = await currentUser();
  if (!me) redirect('/signup?next=/you/texts');
  const rows = await all("SELECT * FROM texts WHERE to_phone = ? AND kind <> 'code' ORDER BY created_at ASC LIMIT 300", me.phone);
  const byTitle = new Map();
  for (const r of rows) {
    const g = GROUPS.find((x) => x[0] === r.kind) || [r.kind, 'Other texts', '#4A4A4A', null];
    const key = g[1];
    if (!byTitle.has(key)) byTitle.set(key, { title: key, ink: g[2], when: g[3] || GROUPS.find((x) => x[1] === key && x[3])?.[3] || '', msgs: [], last: 0 });
    const grp = byTitle.get(key);
    grp.msgs.push(r);
    grp.last = r.created_at;
  }
  const groups = [...byTitle.values()].sort((a, b) => b.last - a.last);
  return (
    <main className="withnav" style={{ background: '#ECECEF', color: '#000', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Hdr back="/you" ink="#000" />
      <section style={{ position: 'relative', padding: '0 20px', height: 200, boxSizing: 'border-box' }}>
        <Boil seed={9} fill="#D8F75A" left={-10} top={0} width={270} height={170} />
        <span className="wide" style={{ position: 'relative', fontSize: 11, letterSpacing: '0.18em' }}>Text messages</span>
        <h1 style={{ position: 'relative', margin: '18px 0 0 6px', fontWeight: 400, fontSize: 44, lineHeight: 0.96, letterSpacing: '-0.04em' }}>Texts that carry the <span className="serif" style={{ fontStyle: 'italic' }}>moments</span></h1>
      </section>
      <p style={{ margin: '6px 20px 0', fontSize: 15, lineHeight: 1.4 }}>Every text insidejoke sent to <span style={{ fontWeight: 800 }}>your number</span>. Each one says who and what, and links back here. Reply STOP to any of them to opt out.</p>

      <section style={{ padding: '20px 16px 0', display: 'flex', flexDirection: 'column', gap: 26 }}>
        {groups.length === 0 ? <p style={{ margin: 0, padding: '14px 4px', borderTop: '1.5px solid #000', fontSize: 15 }}>No texts yet. When a friend shares a list or something gets covered, it shows up here.</p> : null}
        {groups.map((g, gi) => (
          <div key={g.title} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, borderTop: '1.5px solid #000', padding: '12px 4px 0' }}>
              <span className="dot" style={{ fontSize: 18, color: g.ink }}>{String(gi + 1).padStart(2, '0')}</span>
              <h2 className="wide" style={{ margin: 0, fontSize: 13, letterSpacing: '0.14em' }}>{g.title}</h2>
            </div>
            {g.when ? <span style={{ padding: '0 4px', fontSize: 13, color: '#4A4A4A' }}>{g.when}</span> : null}
            <div style={{ background: '#fff', borderRadius: 22, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, paddingBottom: 6 }}>
                <span style={{ width: 38, height: 38, borderRadius: '50%', background: '#000', color: '#D8F75A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>ij</span>
                <span style={{ fontSize: 11, color: '#6A6A6A' }}>insidejoke</span>
              </div>
              {g.msgs.slice(-6).map((m) => (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ alignSelf: 'center', fontSize: 11, color: '#8A8A8A', textAlign: 'center' }}>{stamp(m.created_at)}{m.status === 'failed' ? ' · not delivered' : ''}</span>
                  <div style={{ alignSelf: 'flex-start', maxWidth: '86%', background: '#E9E9EB', borderRadius: '18px 18px 18px 4px', padding: '10px 13px', fontSize: 15, lineHeight: 1.38, wordBreak: 'break-word' }}>
                    {m.body.split(/(https?:\/\/\S+)/g).map((part, i) => (/^https?:\/\//.test(part) ? <a key={i} href={part.replace(/^https?:\/\/[^/]+/, '') || '/'} style={{ color: '#13286B', fontWeight: 700 }}>{part.replace(/^https?:\/\//, '')}</a> : <span key={i}>{part}</span>))}
                  </div>
                </div>
              ))}
              {g.msgs.length > 6 ? <span style={{ alignSelf: 'center', fontSize: 11, color: '#8A8A8A' }}>and {g.msgs.length - 6} earlier</span> : null}
            </div>
          </div>
        ))}
      </section>
      <div style={{ height: 40 }} />
      <Nav me={me} active="you" />
    </main>
  );
}
