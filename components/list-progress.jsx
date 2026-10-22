// How much of a list's wishes are covered (treats are unlimited, so they don't count). Never amounts.
export function wishProgress(items) {
  const w = items.filter((i) => !i.unlimited && !i.archived);
  const target = w.reduce((t, i) => t + (i.target || 0), 0);
  const raised = w.reduce((t, i) => t + Math.min(i.target || 0, i.raised || 0), 0);
  return { pct: target ? Math.floor((raised / target) * 100) : 0, done: w.filter((i) => i.covered).length, total: w.length };
}

export default function ListProgress({ items, pad = '18px 20px 0' }) {
  const { pct, done, total } = wishProgress(items);
  if (!total) return null;
  const all = done === total;
  return (
    <section aria-label={`${pct}% of wishes covered, ${done} of ${total} done`} style={{ padding: pad, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
        <span className="dot" style={{ fontSize: 17 }}>{all ? 'ALL WISHES COVERED' : `${pct}% OF WISHES COVERED`}</span>
        <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{done} of {total} done</span>
      </div>
      <div style={{ height: 12, borderRadius: 999, background: '#D7D7DC', overflow: 'hidden' }}>
        <div className="grow" style={{ width: `${all ? 100 : pct}%`, height: '100%', borderRadius: 999, background: all ? '#2E9B47' : '#5546A0' }} />
      </div>
    </section>
  );
}
