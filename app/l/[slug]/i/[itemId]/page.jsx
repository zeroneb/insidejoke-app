import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Blob, Avatar, Header, ItemSketch } from '@/components/ui';
import { tileInk, hostOf } from '@/components/friend-list';
import { listBySlug, itemById, owner as ownerOf, notesFor, money } from '@/lib/lists';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

function firstName(u) { return ((u?.name || 'a friend').trim().split(/\s+/)[0]) || 'a friend'; }

export default async function ItemPage({ params }) {
  const { slug, itemId } = await params;
  const list = listBySlug(slug);
  if (!list) notFound();
  const it = itemById(itemId);
  if (!it || it.list_id !== list.id) notFound();
  const owner = ownerOf(list);
  const me = await currentUser();
  const forName = list.for_who === 'other' && list.recipient_name ? list.recipient_name : firstName(owner);
  const isOwner = me && me.id === owner.id;
  const notes = notesFor(it.id, !!isOwner);
  const privateCount = db().prepare("SELECT COUNT(*) AS n FROM contributions WHERE item_id = ? AND visibility = 'private'").get(it.id).n;
  const ink = tileInk(it.color);
  const r = 58, C = 2 * Math.PI * r;
  const dash = (C * Math.min(100, it.pct) / 100).toFixed(1);
  const headline = it.covered ? ['All', 'covered'] : it.pct >= 75 ? ['Almost', 'there'] : it.pct >= 50 ? ['More than', 'halfway'] : ['Just getting', 'started'];
  const givePath = `/l/${slug}/i/${it.id}/give`;

  return (
    <div className="ip">
      <section className="ip-hero" style={{ background: it.color }}>
        <Header back={`/l/${slug}`} light={ink === '#FFFFFF'} right={<span style={{ width: 44 }} />} />
        <span className="ip-herolbl" style={{ color: ink }}>{it.photo ? `${forName}'s photo` : 'Item'}</span>
        <div className="ip-art bob">
          {it.photo ? <img src={it.photo} alt="" className="ip-photo" /> : <ItemSketch name={it.name} size={240} ink={ink} unlimited={it.unlimited} />}
        </div>
        <span className="ip-for" style={{ color: ink }}>For {forName}</span>
      </section>

      <section className="sec" style={{ gap: 6, paddingTop: 20 }}>
        <h1 style={{ margin: 0, fontWeight: 400, fontSize: 32, lineHeight: 1.02, letterSpacing: '-0.035em' }}>
          {it.name}{it.quantity > 1 ? <> <span className="dot" style={{ fontSize: 30 }}>×{it.quantity}</span></> : null}
        </h1>
        <span style={{ fontWeight: 500, fontSize: 13 }}>
          {it.quantity > 1 ? `A set of ${it.quantity} · ` : ''}{it.unlimited ? `${money(it.price_cents)} each` : money(it.price_cents * Math.max(1, it.quantity))}{it.store ? ` · ${it.store}` : ''}
        </span>
        {it.url ? (
          <a href={it.url.startsWith('http') ? it.url : 'https://' + it.url} target="_blank" rel="noopener" className="pill" style={{ alignSelf: 'flex-start', marginTop: 8, fontSize: 15, padding: '10px 16px' }}>
            See it on {hostOf(it.url)} <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7" /><path d="M8 7h9v9" /></svg>
          </a>
        ) : null}
      </section>

      {it.note ? (
        <section style={{ padding: '22px 20px 0' }}>
          <p style={{ margin: 0, fontWeight: 500, fontSize: 14, lineHeight: 1.7, color: '#3C5A1E' }}><span className="ip-hl">{forName}: “{it.note}”</span></p>
        </section>
      ) : null}

      <section className="ip-panel" aria-label={it.unlimited ? `Treated ${it.timesTreated} times` : `${it.pct} percent covered`}>
        {it.unlimited ? (
          <>
            <div className="ip-dial">
              <Blob seed={6} color="#D8F75A" style={{ left: 10, top: 10 }} width={112} height={112} />
              <span className="dot ip-dialnum">×{it.timesTreated}</span>
            </div>
            <div className="ip-paneltext">
              <span className="serif" style={{ fontSize: 28, lineHeight: 1 }}>Treated <span style={{ fontWeight: 600 }}>again and again</span></span>
              <span style={{ fontSize: 14, lineHeight: 1.4, color: '#E4DEFA' }}>{it.givers} {it.givers === 1 ? 'friend has' : 'friends have'} sent one. Amounts stay private.</span>
            </div>
          </>
        ) : (
          <>
            <div className="ip-dial">
              <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }} width="132" height="132" viewBox="0 0 132 132">
                <circle cx="66" cy="66" r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="12" />
                <circle cx="66" cy="66" r={r} fill="none" stroke="#D8F75A" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${dash} 1000`} className="ip-dialarc" />
              </svg>
              <Blob seed={6} color="#D8F75A" style={{ left: 22, top: 22 }} width={88} height={88} />
              <span className="dot ip-dialnum">{it.pct}%</span>
            </div>
            <div className="ip-paneltext">
              <span className="serif" style={{ fontSize: 28, lineHeight: 1 }}>{headline[0]} <span style={{ fontWeight: 600 }}>{headline[1]}</span></span>
              <span style={{ fontSize: 14, lineHeight: 1.4, color: '#E4DEFA' }}>{it.givers} {it.givers === 1 ? 'friend has' : 'friends have'} contributed. Amounts stay private.</span>
            </div>
          </>
        )}
      </section>

      <section style={{ padding: '26px 20px 0', display: 'flex', flexDirection: 'column' }}>
        <h2 className="serif" style={{ margin: '0 0 6px', fontWeight: 400, fontSize: 30 }}>Notes for <span style={{ fontWeight: 600 }}>{forName}</span></h2>
        {notes.length === 0 && !privateCount ? (
          <p className="muted" style={{ margin: 0, padding: '14px 0', borderTop: '1px solid #000', fontSize: 14 }}>Be the first to leave one.</p>
        ) : null}
        {notes.map((n) => (
          <div key={n.id} className="ip-note">
            <Avatar user={n} size={40} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexGrow: 1 }}>
              <span style={{ fontSize: 14 }}>{n.name || 'A friend'} <span style={{ color: '#3A3A3A' }}>{it.unlimited ? 'sent a treat' : 'contributed'} · {when(n.created_at)}</span>{n.visibility === 'private' ? <span className="muted"> · private</span> : null}</span>
              {n.note ? <span className="it" style={{ fontSize: 18, lineHeight: 1.2 }}>“{n.note}”</span> : null}
            </div>
          </div>
        ))}
        {!isOwner && privateCount ? (
          <div className="ip-note" style={{ alignItems: 'center' }}>
            <div className="ip-lock"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round"><path d="M5 11h14v9H5z" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg></div>
            <span style={{ fontSize: 14 }}>{privateCount} private {privateCount === 1 ? 'contribution' : 'contributions'}</span>
          </div>
        ) : null}
      </section>

      <div style={{ height: 120 }} />

      <div className="ip-actions">
        {it.unlimited ? (
          <Link href={givePath} className="btn">Send a treat</Link>
        ) : it.covered ? (
          <span className="btn" aria-disabled="true" style={{ opacity: 0.45 }}>All covered</span>
        ) : (
          <>
            <Link href={`${givePath}?mode=rest`} className="btn ghost" style={{ fontSize: 16, padding: '15px 0' }}>Cover the rest</Link>
            <Link href={givePath} className="btn" style={{ fontSize: 16, padding: '16px 0' }}>Contribute</Link>
          </>
        )}
      </div>
    </div>
  );
}

function when(ts) {
  const d = Date.now() - ts;
  if (d < 3600e3) return `${Math.max(1, Math.round(d / 60e3))}m`;
  if (d < 86400e3) return `${Math.round(d / 3600e3)}h`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
