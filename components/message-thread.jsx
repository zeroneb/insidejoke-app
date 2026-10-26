'use client';

import { FaceSm } from '@/components/ui';

// The bubbles of a message thread, oldest first. Client-side so days and times read in the viewer's own time zone.
const first = (n) => (n || '').trim().split(/\s+/)[0] || 'them';
const dayLabel = (ts) => {
  const d = new Date(ts), t = new Date(), y = new Date();
  y.setDate(t.getDate() - 1);
  if (d.toDateString() === t.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};
const clock = (ts) => new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const BUBBLE = { margin: 0, maxWidth: '76%', padding: '9px 14px', fontSize: 15, lineHeight: 1.38, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' };

export default function MessageThread({ them, msgs }) {
  const name = first(them.name);
  let lastDay = '';
  return (
    <section aria-label={`Messages with ${name}`} style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 4, flexGrow: 1 }}>
      {msgs.length === 0 ? (
        <div style={{ margin: 'auto 0', padding: '40px 8px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <FaceSm user={them} size={72} uid="dmempty" />
          <p className="serif" style={{ margin: 0, fontSize: 26, lineHeight: 1.1 }}>Say hi to <span className="it">{name}</span></p>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--muted, #4A4A4A)' }}>Messages stay here in insidejoke. Only you two see them.</p>
        </div>
      ) : msgs.map((m, i) => {
        const next = msgs[i + 1];
        const endOfRun = !next || next.mine !== m.mine || next.at - m.at > 10 * 60 * 1000;
        const day = dayLabel(m.at);
        const showDay = day !== lastDay;
        lastDay = day;
        return (
          <div key={m.id} style={{ display: 'flex', flexDirection: 'column' }}>
            {showDay ? <span className="wide" suppressHydrationWarning style={{ alignSelf: 'center', fontSize: 10, letterSpacing: '0.16em', color: 'var(--muted, #4A4A4A)', margin: '14px 0 8px' }}>{day}</span> : null}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, justifyContent: m.mine ? 'flex-end' : 'flex-start' }}>
              {!m.mine ? (endOfRun ? <FaceSm user={them} size={28} uid={`dm${i}`} /> : <span style={{ width: 28, flexShrink: 0 }} />) : null}
              <p style={m.mine
                ? { ...BUBBLE, background: 'var(--inv-bg, #000000)', color: 'var(--inv-fg, #FFFFFF)', borderRadius: endOfRun ? '18px 18px 4px 18px' : 18 }
                : { ...BUBBLE, background: 'var(--surface, #FFFFFF)', color: 'var(--ink, #000000)', border: '1px solid var(--line, #000000)', borderRadius: endOfRun ? '18px 18px 18px 4px' : 18 }}>{m.body}</p>
            </div>
            {endOfRun ? <span suppressHydrationWarning style={{ alignSelf: m.mine ? 'flex-end' : 'flex-start', margin: m.mine ? '3px 4px 8px 0' : '3px 0 8px 40px', fontSize: 11, color: 'var(--muted, #4A4A4A)' }}>{clock(m.at)}{m.mine && !next && m.read ? ' · Seen' : ''}</span> : null}
          </div>
        );
      })}
    </section>
  );
}
