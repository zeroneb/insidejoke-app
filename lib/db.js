import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'insidejoke.db');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL,
  seed INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS codes (
  phone TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  tries INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS lists (
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
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS items (
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
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS contributions (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id),
  list_id TEXT NOT NULL REFERENCES lists(id),
  giver_id TEXT NOT NULL REFERENCES users(id),
  amount_cents INTEGER NOT NULL,
  units INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  visibility TEXT NOT NULL DEFAULT 'public',
  payment_ref TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS payment_methods (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  kind TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS texts (
  id TEXT PRIMARY KEY,
  to_phone TEXT NOT NULL,
  body TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS reactions (contribution_id TEXT NOT NULL, user_id TEXT NOT NULL, emoji TEXT NOT NULL, PRIMARY KEY (contribution_id, user_id));
CREATE TABLE IF NOT EXISTS thanks (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL REFERENCES lists(id),
  item_id TEXT REFERENCES items(id),
  from_id TEXT NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL,            -- 'item' (per wish, to its givers) | 'weekly' (treats digest)
  message TEXT NOT NULL,
  recipients INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS payout_methods (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  kind TEXT NOT NULL,            -- 'bank' | 'debit'
  label TEXT NOT NULL,           -- e.g. 'Chase ••1234'
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL REFERENCES lists(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  gross_cents INTEGER NOT NULL,
  fee_cents INTEGER NOT NULL,
  net_cents INTEGER NOT NULL,
  method_label TEXT NOT NULL,
  payout_ref TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL REFERENCES lists(id),
  kind TEXT NOT NULL,            -- 'week_after' | 'before_date'
  due_at INTEGER NOT NULL,
  sent_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS list_shares (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL REFERENCES lists(id),
  phone TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(list_id, phone)
);
CREATE INDEX IF NOT EXISTS idx_items_list ON items(list_id);
CREATE INDEX IF NOT EXISTS idx_contrib_item ON contributions(item_id);
CREATE INDEX IF NOT EXISTS idx_contrib_list ON contributions(list_id);
`;

let _db;
export function db() {
  if (_db) return _db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.exec(SCHEMA);
  migrate(_db);
  return _db;
}

function migrate(d) {
  const cols = (t) => d.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);
  const add = (t, c, def) => { if (!cols(t).includes(c)) d.exec(`ALTER TABLE ${t} ADD COLUMN ${c} ${def}`); };
  add('users', 'weekly_thanks', 'INTEGER NOT NULL DEFAULT 0');   // opt-in weekly thank-you digest for treats
  add('users', 'bio', 'TEXT');
  add('contributions', 'thanked_at', 'INTEGER');
  add('lists', 'shared_at', 'INTEGER');                           // first share → starts the week-after reminder
  add('lists', 'archived_at', 'INTEGER');
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
