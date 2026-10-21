import Link from 'next/link';
import { all } from '@/lib/db';
import { isTestMode } from '@/lib/texts';
import { Header } from '@/components/ui';
import { clearTexts } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Outbox · insidejoke' };

function linkify(body) {
  const parts = body.split(/(https?:\/\/\S+)/g);
  return parts.map((p, i) => (/^https?:\/\//.test(p) ? <a key={i} href={p}>{p}</a> : <span key={i}>{p}</span>));
}

const when = (t) => new Date(t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default async function Outbox() {
  const rows = await all('SELECT * FROM texts ORDER BY created_at DESC LIMIT 200');
  const test = isTestMode();
  return (
    <main>
      <Header back="/home" title={test ? 'Outbox · test mode' : 'Outbox · live'} />
      <div className="page">
        <h1>Texts</h1>
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          {test ? 'Nothing is really sent in test mode. Every text the app would send lands here instead.' : 'Live: texts are really sent through Twilio, and recorded here.'}
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <form action={clearTexts}><button className="pill" type="submit">Clear</button></form>
          <Link href="/dev/login" className="pill">Switch user</Link>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 6 }}>
          {rows.length === 0 ? <p className="muted">No texts yet.</p> : null}
          {rows.map((r) => (
            <div key={r.id} className="dev-row">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span><span className="dev-chip">{r.kind}</span> <span style={{ marginLeft: 6 }}>to {r.to_phone}</span></span>
                <span className="muted">{r.status} · {when(r.created_at)}</span>
              </div>
              <div className="dev-body">{linkify(r.body)}</div>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #000' }} />
        </div>
      </div>
    </main>
  );
}
