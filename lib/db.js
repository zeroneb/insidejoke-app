import crypto from 'node:crypto';

// One small async query layer over Postgres.
//  - Production: DATABASE_URL (Neon, Supabase, Vercel Postgres… any Postgres).
//  - Local / no URL: PGlite, a real Postgres that runs in-process and keeps
//    its files in data/pglite. Same SQL, nothing to install.
// Queries use `?` placeholders; they are rewritten to $1, $2… below.

const URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || '';
export const dbMode = () => (URL ? 'postgres' : 'local');
export const dbIsEphemeral = () => !URL && !!process.env.VERCEL;

const SCHEMA = [
`CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL,
  seed INTEGER NOT NULL,
  weekly_thanks INTEGER NOT NULL DEFAULT 0,
  bio TEXT,
  created_at BIGINT NOT NULL
)`,
`CREATE TABLE IF NOT EXISTS codes (
  phone TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  tries INTEGER NOT NULL DEFAULT 0
)`,
`CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at BIGINT NOT NULL
)`,
`CREATE TABLE IF NOT EXISTS lists (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  for_who TEXT NOT NULL DEFAULT 'me',
  recipient_name TEXT,
  occasion TEXT,
  surprise INTEGER NOT NULL DEFAULT 0,
  date TEXT,
  visibility TEXT NOT NULL DEFAULT 'public',
  status TEXT NOT NULL DEFAULT 'open',
  nudge_dismissed INTEGER NOT NULL DEFAULT 0,
  shared_at BIGINT,
  archived_at BIGINT,
  created_at BIGINT NOT NULL
)`,
`CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL REFERENCES lists(id),
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  store TEXT,
  url TEXT,
  note TEXT,
  photo TEXT,
  color TEXT NOT NULL,
  removed INTEGER NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL
)`,
`CREATE TABLE IF NOT EXISTS contributions (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id),
  list_id TEXT NOT NULL REFERENCES lists(id),
  giver_id TEXT NOT NULL REFERENCES users(id),
  amount_cents INTEGER NOT NULL,
  units INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  visibility TEXT NOT NULL DEFAULT 'public',
  payment_ref TEXT,
  thanked_at BIGINT,
  created_at BIGINT NOT NULL
)`,
`CREATE TABLE IF NOT EXISTS payment_methods (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  kind TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at BIGINT NOT NULL
)`,
`CREATE TABLE IF NOT EXISTS texts (
  id TEXT PRIMARY KEY,
  to_phone TEXT NOT NULL,
  body TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at BIGINT NOT NULL
)`,
`CREATE TABLE IF NOT EXISTS reactions (
  contribution_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  PRIMARY KEY (contribution_id, user_id)
)`,
`CREATE TABLE IF NOT EXISTS thanks (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL REFERENCES lists(id),
  item_id TEXT REFERENCES items(id),
  from_id TEXT NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL,
  message TEXT NOT NULL,
  recipients INTEGER NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL
)`,
`CREATE TABLE IF NOT EXISTS payout_methods (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  kind TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at BIGINT NOT NULL
)`,
`CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL REFERENCES lists(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  gross_cents INTEGER NOT NULL,
  fee_cents INTEGER NOT NULL,
  net_cents INTEGER NOT NULL,
  method_label TEXT NOT NULL,
  payout_ref TEXT,
  created_at BIGINT NOT NULL
)`,
`CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL REFERENCES lists(id),
  kind TEXT NOT NULL,
  due_at BIGINT NOT NULL,
  sent_at BIGINT,
  created_at BIGINT NOT NULL
)`,
`CREATE TABLE IF NOT EXISTS list_shares (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL REFERENCES lists(id),
  phone TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  UNIQUE(list_id, phone)
)`,
`ALTER TABLE users ADD COLUMN IF NOT EXISTS photo TEXT`,
`ALTER TABLE items ADD COLUMN IF NOT EXISTS image TEXT`,
`ALTER TABLE users ADD COLUMN IF NOT EXISTS photo TEXT`,
`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_public INTEGER NOT NULL DEFAULT 1`,
`ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_covered INTEGER NOT NULL DEFAULT 1`,
`ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_share INTEGER NOT NULL DEFAULT 1`,
`ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_reminders INTEGER NOT NULL DEFAULT 1`,
`CREATE TABLE IF NOT EXISTS friends (
  user_id TEXT NOT NULL REFERENCES users(id),
  friend_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'friends',
  created_at BIGINT NOT NULL,
  PRIMARY KEY (user_id, friend_id)
)`,
`CREATE TABLE IF NOT EXISTS list_members (
  list_id TEXT NOT NULL REFERENCES lists(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL DEFAULT 'collaborator',
  created_at BIGINT NOT NULL,
  PRIMARY KEY (list_id, user_id)
)`,
`CREATE TABLE IF NOT EXISTS blasts (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL REFERENCES lists(id),
  from_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  recipients INTEGER NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL
)`,
`CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL REFERENCES lists(id),
  from_id TEXT NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL,
  body TEXT,
  media TEXT,
  created_at BIGINT NOT NULL
)`,
`ALTER TABLE lists ADD COLUMN IF NOT EXISTS send_at BIGINT`,
`ALTER TABLE lists ADD COLUMN IF NOT EXISTS sent_at BIGINT`,
`ALTER TABLE lists ADD COLUMN IF NOT EXISTS opened_at BIGINT`,
`ALTER TABLE lists ADD COLUMN IF NOT EXISTS recipient_phone TEXT`,
`ALTER TABLE lists ADD COLUMN IF NOT EXISTS recipient_id TEXT`,
`ALTER TABLE lists ADD COLUMN IF NOT EXISTS handoff TEXT`,
`ALTER TABLE lists ADD COLUMN IF NOT EXISTS timezone TEXT`,
// a4: collab, surprises, reminders
`ALTER TABLE items ADD COLUMN IF NOT EXISTS added_by TEXT`,
`ALTER TABLE blasts ADD COLUMN IF NOT EXISTS pinned INTEGER NOT NULL DEFAULT 1`,
`ALTER TABLE lists ADD COLUMN IF NOT EXISTS reveal_token TEXT`,
`ALTER TABLE lists ADD COLUMN IF NOT EXISTS cashout_user_id TEXT`,
`ALTER TABLE lists ADD COLUMN IF NOT EXISTS claimed_at BIGINT`,
`ALTER TABLE lists ADD COLUMN IF NOT EXISTS partly TEXT`,
`ALTER TABLE reminders ADD COLUMN IF NOT EXISTS to_phone TEXT`,
`CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(due_at)`,
`ALTER TABLE users ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'light'`,
`ALTER TABLE users ADD COLUMN IF NOT EXISTS notif_seen_at BIGINT NOT NULL DEFAULT 0`,
`ALTER TABLE messages ADD COLUMN IF NOT EXISTS ref_key TEXT`,
`ALTER TABLE items ADD COLUMN IF NOT EXISTS orig_price_cents INTEGER`,
`ALTER TABLE items ADD COLUMN IF NOT EXISTS orig_currency TEXT`,
`ALTER TABLE contributions ADD COLUMN IF NOT EXISTS paid_out_id TEXT`,
`ALTER TABLE contributions ADD COLUMN IF NOT EXISTS released INTEGER NOT NULL DEFAULT 0`,
`ALTER TABLE contributions ADD COLUMN IF NOT EXISTS moved_from_name TEXT`,
`CREATE TABLE IF NOT EXISTS gift_moves (
  id TEXT PRIMARY KEY,
  contribution_id TEXT NOT NULL,
  giver_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  from_name TEXT NOT NULL,
  to_item_id TEXT,
  to_name TEXT,
  kind TEXT NOT NULL,
  slug TEXT,
  created_at BIGINT NOT NULL
)`,
`ALTER TABLE reactions ADD COLUMN IF NOT EXISTS created_at BIGINT NOT NULL DEFAULT 0`,
// Several emojis per person per gift: the key includes the emoji.
`DO $$ BEGIN
  IF (SELECT COUNT(*) FROM information_schema.key_column_usage WHERE table_name = 'reactions' AND constraint_name = 'reactions_pkey') = 2 THEN
    ALTER TABLE reactions DROP CONSTRAINT reactions_pkey;
    ALTER TABLE reactions ADD PRIMARY KEY (contribution_id, user_id, emoji);
  END IF;
END $$`,
`ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`,
`ALTER TABLE items ADD COLUMN IF NOT EXISTS photo_tried INTEGER NOT NULL DEFAULT 0`,
`CREATE INDEX IF NOT EXISTS idx_items_list ON items(list_id)`,
`CREATE INDEX IF NOT EXISTS idx_contrib_item ON contributions(item_id)`,
`CREATE INDEX IF NOT EXISTS idx_contrib_list ON contributions(list_id)`,
// a3: optional photo on a thank-you (item or weekly)
`ALTER TABLE thanks ADD COLUMN IF NOT EXISTS photo TEXT`,
// stripe: ids for live money (empty in test mode)
`ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`, // stripe
`ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT`, // stripe
`ALTER TABLE payout_methods ADD COLUMN IF NOT EXISTS stripe_account_id TEXT`, // stripe
`ALTER TABLE payout_methods ADD COLUMN IF NOT EXISTS stripe_ready INTEGER NOT NULL DEFAULT 0`, // stripe
`ALTER TABLE payout_methods ADD COLUMN IF NOT EXISTS transfer_try INTEGER NOT NULL DEFAULT 0`, // stripe: bumps after a refused transfer so a retry isn't answered from Stripe's idempotency cache
`ALTER TABLE payout_methods ADD COLUMN IF NOT EXISTS stripe_status TEXT`,
`ALTER TABLE payouts ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT`, // stripe
`ALTER TABLE contributions ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT`, // stripe
// r4: SharedList "Looks like a match": a collaborator chose to keep a similar item
`ALTER TABLE items ADD COLUMN IF NOT EXISTS keep_both INTEGER NOT NULL DEFAULT 0` // r4
];

const toInt = (x) => (x == null ? null : Number(x));

// Hold the client on globalThis so Next's dev reloads reuse one connection.
const g = globalThis;
async function client() {
  if (g.__ij_db) return g.__ij_db;
  if (!g.__ij_db_p) {
    g.__ij_db_p = (async () => {
      let exec;
      if (URL) {
        const { default: postgres } = await import('postgres');
        const sql = postgres(URL, {
          max: 5,
          idle_timeout: 20,
          connect_timeout: 20,
          ssl: /localhost|127\.0\.0\.1/.test(URL) ? false : 'require',
          // Counts, sums and millisecond timestamps come back as JS numbers.
          types: { bigint: { to: 20, from: [20, 1700], serialize: (x) => String(x), parse: toInt } }
        });
        exec = (text, params) => sql.unsafe(text, params);
      } else {
        const { PGlite } = await import('@electric-sql/pglite');
        const path = await import('node:path');
        const fs = await import('node:fs');
        const dir = process.env.PGLITE_DIR || (process.env.VERCEL ? '/tmp/insidejoke-pglite' : path.join(process.cwd(), 'data', 'pglite'));
        fs.mkdirSync(dir, { recursive: true });
        const pg = new PGlite(dir, { parsers: { 20: toInt, 1700: toInt } });
        await pg.waitReady;
        exec = async (text, params) => (await pg.query(text, params)).rows;
      }
      for (const s of SCHEMA) await exec(s, []);
      g.__ij_db = exec;
      return exec;
    })().catch((e) => { g.__ij_db_p = null; throw e; });
  }
  return g.__ij_db_p;
}

function toPg(text) {
  let n = 0;
  return text.replace(/\?/g, () => `$${++n}`);
}

export async function all(text, ...params) {
  const exec = await client();
  return exec(toPg(text), params);
}
export async function get(text, ...params) {
  const rows = await all(text, ...params);
  return rows[0] ?? null;
}
export async function run(text, ...params) {
  await all(text, ...params);
}

export const id = () => crypto.randomBytes(10).toString('base64url');
export const now = () => Date.now();

const PALETTE = ['#B36EE0', '#F0895A', '#93EC75', '#E3C552', '#5FC3D9', '#A9CDF5', '#E8642C', '#C8743A', '#D8F75A', '#F4D3EE', '#AAB4EC'];
export function pickColor(seedStr) {
  let h = 0;
  for (const ch of seedStr) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { color: PALETTE[h % PALETTE.length], seed: (h % 97) + 3 };
}

const ITEM_COLORS = ['#E8642C', '#F4D3EE', '#A9CDF5', '#96E084', '#E3C552', '#B36EE0', '#5FC3D9', '#D8F75A'];
export const itemColor = (n) => ITEM_COLORS[n % ITEM_COLORS.length];

export function slugify(s) {
  const base = (s || 'list').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'list';
  return base + '-' + crypto.randomBytes(3).toString('hex');
}
