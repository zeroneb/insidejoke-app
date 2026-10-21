import { db } from '@/lib/db';
import { isTestMode } from '@/lib/texts';
import { Header, Avatar } from '@/components/ui';
import { devLogin } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Switch user · insidejoke' };

export default function DevLogin() {
  const test = isTestMode();
  const users = test ? db().prepare('SELECT * FROM users ORDER BY created_at ASC LIMIT 50').all() : [];
  return (
    <main>
      <Header back="/home" title="Switch user · test mode" />
      <div className="page">
        <h1>Log in as</h1>
        {!test ? <p className="muted">Only available in test mode.</p> : null}
        {test && users.length === 0 ? <p className="muted">No users yet. Run <code>npm run seed</code>.</p> : null}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {users.map((u) => (
            <form key={u.id} action={devLogin} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: '1px solid #000' }}>
              <input type="hidden" name="userId" value={u.id} />
              <Avatar user={u} size={36} />
              <span style={{ flexGrow: 1, fontSize: 15 }}>{u.name || '(no name)'} <span className="muted" style={{ fontSize: 12 }}>{u.phone}</span></span>
              <button className="pill" type="submit">Log in</button>
            </form>
          ))}
        </div>
      </div>
    </main>
  );
}
