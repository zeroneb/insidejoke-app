import Link from 'next/link';
import { commentsFor } from '@/lib/lists';
import { reactionsFor } from '@/lib/feed';
import { ago } from '@/lib/time';
import { Avatar, FaceSm } from '@/components/ui';
import LatelyActions from '@/components/lately-actions';
import CoverDesign from '@/components/cover-design';
import { parse as parseDesign } from '@/lib/cover-designs';

const first = (n) => (n || '').trim().split(/\s+/)[0] || 'A friend';
const possessive = (n) => (n.endsWith('s') ? `${n}’` : `${n}’s`);

function Who({ g, meId }) {
  if (g.id === meId) return <span style={{ fontWeight: 700 }}>You</span>;
  return <Link href={`/u/${g.id}`} style={{ fontWeight: 700, textDecoration: 'none' }}>{first(g.name)}</Link>;
}

const Line = ({ m, meId }) => <span style={{ fontSize: 14, lineHeight: 1.35 }}><b>{m.uid === meId ? 'You' : (m.name || 'Someone').split(' ')[0]}</b> {m.body}</span>;

function Comments({ list, meId }) {
  if (!list.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4, paddingLeft: 10, borderLeft: '2px solid #D4FA4F' }}>
      {list.length > 3 ? (
        <details>
          <summary style={{ fontSize: 12, color: 'var(--muted, #4A4A4A)', cursor: 'pointer' }}>{list.length - 3} earlier</summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
            {list.slice(0, -3).map((m, i) => <Line key={i} m={m} meId={meId} />)}
          </div>
        </details>
      ) : null}
      {list.slice(-3).map((m, i) => <Line key={i} m={m} meId={meId} />)}
    </div>
  );
}

// The picture for a row: a new list shows its cover; an added or covered item shows its photo.
function Visual({ f, href }) {
  if (f.kind === 'list') {
    const design = parseDesign(f.design);
    if (!design) return null;
    return (
      <Link href={href} aria-label={`Open ${f.title}`} style={{ display: 'block', marginTop: 6, borderRadius: 12, overflow: 'hidden', maxWidth: 320, textDecoration: 'none' }}>
        <CoverDesign design={design} title={f.title} fluid height={240} label={f.title} ctx={{ visibility: f.visibility, recipient: f.recipient_name, people: [first(f.givers[0]?.name)], photo: f.cover_photo }} />
      </Link>
    );
  }
  if ((f.kind === 'added' || f.kind === 'fcovered') && f.item_photo) {
    return (
      <Link href={href} aria-label={`See ${f.item_name}`} style={{ display: 'block', marginTop: 6, width: 140, height: 140, borderRadius: 12, overflow: 'hidden', background: 'var(--surface, #FFFFFF)' }}>
        <img src={f.item_photo} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </Link>
    );
  }
  return null;
}

// One Lately row, Option 10 Home.
function FeedRow({ f, r, c = [], meId, n }) {
  const g = f.givers;
  const one = g[0];
  const own = one.id === meId;
  const from = f.store ? ` from ${f.store}` : '';
  let text, badge, see = 'See item', href = `/l/${f.slug}/i/${f.item_id}`, when = ago(f.created_at);
  let lead;
  if (f.kind === 'treat' && g.length > 1) {
    const shown = g.slice(0, 2), rest = g.slice(2);
    lead = (
      <>
        <input type="checkbox" id={`o-${f.key}`} className="sr a1-chk" />
        <span style={{ fontSize: 15, lineHeight: 1.35 }}>
          {shown.map((x, k) => <span key={x.id}>{k ? (rest.length ? ', ' : ' and ') : ''}<Who g={x} meId={meId} /></span>)}
          {rest.length ? <> and <label htmlFor={`o-${f.key}`} style={{ fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}>{rest.length} {rest.length === 1 ? 'other' : 'others'}</label></> : null} treated you to {f.item_name}{from}
        </span>
        {rest.length ? (
          <div className="a1-others a1up" style={{ flexWrap: 'wrap', gap: 6, padding: '6px 0 2px' }}>
            {rest.map((o) => (
              <Link key={o.id} href={`/u/${o.id}`} style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', background: 'var(--surface, #FFFFFF)', borderRadius: 999, padding: '4px 10px 4px 4px', fontSize: 13, fontWeight: 700 }}><Avatar user={o} size={24} />{first(o.name)}</Link>
            ))}
          </div>
        ) : null}
      </>
    );
    badge = `×${f.units}`;
    when = f.note ? `This week · ${possessive(first(f.noteBy))} note, ${ago(f.noteAt)}` : `This week · ${ago(f.created_at)}`;
  } else if (f.kind === 'treat') {
    text = <>treated you to {f.item_name}{from}{f.private ? '. Private, so only you know who sent it' : ''}</>;
    badge = `×${f.units}`;
  } else if (f.kind === 'wish') {
    text = f.finished ? <>covered the rest of your {f.item_name}</> : <>contributed to your {f.item_name}{f.private ? '. Private, so only you know who sent it' : ''}</>;
    badge = `${f.pct}%`;
  } else if (f.kind === 'fcovered') {
    lead = <span style={{ fontSize: 15, lineHeight: 1.35 }}><Link href={`/u/${one.id}`} style={{ textDecoration: 'none' }}>{possessive(first(one.name))}</Link> {f.item_name} is all covered</span>;
    badge = '100%';
  } else if (f.kind === 'list') {
    text = f.for_name ? <>started {f.title} for {first(f.for_name)}</> : <>started a new list, {f.title}</>;
    badge = 'New';
    see = 'See list';
    href = `/l/${f.slug}`;
  } else {
    text = <>added {f.item_name} to {f.title}</>;
    badge = '+1';
  }
  const multi = g.length > 1;
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 0', borderTop: '1px solid var(--line, #000000)' }}>
      {multi ? (
        <Link href={`/u/${g[0].id}`} aria-label={`${first(g[0].name)}’s profile`} style={{ position: 'relative', width: 52, height: 40, flexShrink: 0, textDecoration: 'none' }}>
          <span style={{ position: 'absolute', left: 0, top: 0 }}><FaceSm user={g[0]} size={36} /></span>
          <span style={{ position: 'absolute', left: 16, top: 8 }}><FaceSm user={g[1]} size={36} /></span>
        </Link>
      ) : (
        <Link href={`/u/${one.id}`} aria-label={own ? 'Your profile' : `${first(one.name)}’s profile`} style={{ flexShrink: 0, textDecoration: 'none', color: 'var(--ink, #000000)' }}><FaceSm user={one} size={44} /></Link>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexGrow: 1, minWidth: 0 }}>
        {lead || <span style={{ fontSize: 15, lineHeight: 1.35 }}><Who g={one} meId={meId} /> {text}</span>}
        {f.note ? <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy-ink, #13286B)' }}>“{f.note}”</span> : null}
        <span style={{ fontSize: 12, color: 'var(--muted, #4A4A4A)' }}>{when}</span>
        <Visual f={f} href={href} />
        <Comments list={c} meId={meId} />
        <LatelyActions cid={f.key} chips={r?.list || []} mine={r?.mine || []} href={href} see={see} toName={own && !f.noteBy ? '' : first(f.noteBy || one.name)} delay={n} />
      </div>
      <span className="dot" style={{ fontSize: 18, color: '#E8642C', flexShrink: 0 }}>{badge}</span>
    </div>
  );
}

// Rows newest first; a fresh comment or reaction from someone else brings a row back up.
export default async function LatelyRows({ rows, meId, limit = 8 }) {
  const keys = rows.map((f) => f.key);
  const reacts = await reactionsFor(keys, meId);
  const comments = await commentsFor(keys);
  const at = (f) => Math.max(f.created_at, reacts[f.key]?.at || 0, ...(comments[f.key] || []).filter((m) => m.uid !== meId).map((m) => Number(m.created_at)));
  const shown = rows.map((f) => [at(f), f]).sort((x, y) => y[0] - x[0]).slice(0, limit).map(([, f]) => f);
  return shown.map((f, n) => <FeedRow key={f.key} f={f} r={reacts[f.key]} c={comments[f.key] || []} meId={meId} n={n} />);
}
