// Demo seed: Maya's birthday list with friends chipping in.
// Idempotent: skips if Maya already exists. Run with `npm run seed`.
// Self-contained (does not import lib/db.js, which is bundled by Next, not plain node).
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'insidejoke.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Same schema as lib/db.js so seeding works on a fresh checkout.
db.exec(`
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, phone TEXT UNIQUE NOT NULL, name TEXT NOT NULL DEFAULT '', color TEXT NOT NULL, seed INTEGER NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS codes (phone TEXT PRIMARY KEY, code TEXT NOT NULL, expires_at INTEGER NOT NULL, tries INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS lists (id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, owner_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL, for_who TEXT NOT NULL DEFAULT 'me', recipient_name TEXT, occasion TEXT, surprise INTEGER NOT NULL DEFAULT 0, date TEXT, visibility TEXT NOT NULL DEFAULT 'public', status TEXT NOT NULL DEFAULT 'open', nudge_dismissed INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY, list_id TEXT NOT NULL REFERENCES lists(id), name TEXT NOT NULL, price_cents INTEGER NOT NULL, quantity INTEGER NOT NULL DEFAULT 1, store TEXT, url TEXT, note TEXT, photo TEXT, color TEXT NOT NULL, removed INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS contributions (id TEXT PRIMARY KEY, item_id TEXT NOT NULL REFERENCES items(id), list_id TEXT NOT NULL REFERENCES lists(id), giver_id TEXT NOT NULL REFERENCES users(id), amount_cents INTEGER NOT NULL, units INTEGER NOT NULL DEFAULT 0, note TEXT, visibility TEXT NOT NULL DEFAULT 'public', payment_ref TEXT, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS payment_methods (user_id TEXT PRIMARY KEY REFERENCES users(id), kind TEXT NOT NULL, label TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS texts (id TEXT PRIMARY KEY, to_phone TEXT NOT NULL, body TEXT NOT NULL, kind TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL);
`);

const id = () => crypto.randomBytes(10).toString('base64url');
const USER_COLORS = ['#B36EE0', '#F0895A', '#93EC75', '#E3C552', '#5FC3D9', '#A9CDF5', '#E8642C', '#C8743A', '#D8F75A', '#F4D3EE', '#AAB4EC'];
const ITEM_COLORS = ['#E8642C', '#F4D3EE', '#A9CDF5', '#96E084', '#E3C552', '#B36EE0', '#5FC3D9', '#D8F75A'];
function pickColor(str) {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return { color: USER_COLORS[h % USER_COLORS.length], seed: (h % 97) + 3 };
}

const MAYA_PHONE = '+15550000001';
if (db.prepare('SELECT 1 FROM users WHERE phone = ?').get(MAYA_PHONE)) {
  console.log('Seed already present (Maya exists). Nothing to do.');
  process.exit(0);
}

const DAY = 24 * 60 * 60 * 1000;
const base = Date.now() - 9 * DAY;
let clock = base;
const tick = (hours = 7) => (clock += hours * 60 * 60 * 1000);

const seedAll = db.transaction(() => {
  // Users
  const users = {};
  [['Maya', MAYA_PHONE], ['Sam', '+15550000002'], ['Priya', '+15550000003'], ['Lina', '+15550000004'], ['Dev', '+15550000005'], ['Kofi', '+15550000006']]
    .forEach(([name, phone]) => {
      const u = { id: id(), phone, name, ...pickColor(phone) };
      db.prepare('INSERT INTO users (id, phone, name, color, seed, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(u.id, u.phone, u.name, u.color, u.seed, tick(1));
      users[name] = u;
    });

  // Sam has paid before.
  db.prepare('INSERT INTO payment_methods (user_id, kind, label, created_at) VALUES (?, ?, ?, ?)').run(users.Sam.id, 'card', 'Card ••4242', tick(1));

  // Maya's list
  const listId = id();
  db.prepare(`INSERT INTO lists (id, slug, owner_id, title, for_who, recipient_name, occasion, surprise, date, visibility, status, nudge_dismissed, created_at)
    VALUES (?, 'maya-birthday', ?, 'For my birthday', 'me', NULL, 'Birthday', 0, NULL, 'public', 'open', 1, ?)`).run(listId, users.Maya.id, tick(2));

  const items = {};
  const addItem = (key, name, priceCents, quantity, store, url, note) => {
    const n = Object.keys(items).length;
    const it = { id: id(), name, price_cents: priceCents, quantity };
    db.prepare(`INSERT INTO items (id, list_id, name, price_cents, quantity, store, url, note, photo, color, removed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 0, ?)`)
      .run(it.id, listId, name, priceCents, quantity, store, url, note, ITEM_COLORS[n % ITEM_COLORS.length], tick(1));
    items[key] = it;
  };
  addItem('boots', 'Ganni Western leather boots', 48000, 1, 'Ganni', 'https://www.ganni.com', 'Size 38, black. The ones with the embroidery.');
  addItem('santal', 'Le Labo Santal 33', 22000, 1, 'Le Labo', 'https://www.lelabofragrances.com', '50ml is plenty.');
  addItem('glasses', 'Wine glasses', 2400, 4, 'Hay', 'https://www.hay.com', 'The tinted ones.');
  addItem('wheel', 'Wheel-throwing class for two', 15000, 1, 'Clay Club', null, 'Any Saturday works.');
  addItem('bagel', 'Lox bagel', 1700, 0, 'Russ & Daughters', null, 'Everything bagel, extra capers.');
  addItem('latte', 'Oat latte', 700, 0, 'The corner café', null, null);
  addItem('bouquet', 'Bouquet', 2500, 0, 'The flower stand', null, 'Anything orange.');

  const give = (key, giverName, cents, units, note) => {
    db.prepare('INSERT INTO contributions (id, item_id, list_id, giver_id, amount_cents, units, note, visibility, payment_ref, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id(), items[key].id, listId, users[giverName].id, cents, units, note, 'public', `test_${id()}`, tick(5));
  };

  // Boots: 82% of $480 = $393.60
  give('boots', 'Sam', 12000, 0, 'you deserve these for winter');
  give('boots', 'Priya', 10000, 0, 'for every winter walk');
  give('boots', 'Lina', 9360, 0, 'happy birthday, cowgirl');
  give('boots', 'Dev', 8000, 0, 'stomp on all of 32');
  // Santal 33: 45% of $220 = $99
  give('santal', 'Kofi', 6000, 0, 'smell expensive');
  give('santal', 'Priya', 3900, 0, null);
  // Wine glasses ×4 ($96 total): 60% = $57.60
  give('glasses', 'Lina', 4800, 0, 'two for us, two for you');
  give('glasses', 'Sam', 960, 0, null);
  // Wheel-throwing class: fully covered
  give('wheel', 'Dev', 10000, 0, 'take me?');
  give('wheel', 'Kofi', 5000, 0, 'make me a mug');
  // Treats (unlimited): units × price
  const treats = [
    ['bagel', 1700, [['Sam', 10, 'brunch is on me'], ['Priya', 8, null], ['Dev', 5, 'extra capers']]], // 23
    ['latte', 700, [['Lina', 15, 'morning fuel'], ['Kofi', 12, null], ['Sam', 10, 'one a day'], ['Priya', 4, null]]], // 41
    ['bouquet', 2500, [['Priya', 3, 'for the kitchen table'], ['Lina', 2, null], ['Dev', 1, 'orange, obviously']]] // 6
  ];
  for (const [key, price, gifts] of treats) for (const [who, units, note] of gifts) give(key, who, units * price, units, note);

  // A couple of texts in the outbox so test mode has something to show.
  const tx = db.prepare('INSERT INTO texts (id, to_phone, body, kind, status, created_at) VALUES (?, ?, ?, ?, ?, ?)');
  tx.run(id(), users.Sam.phone, `Maya shared Maya's list with you: ${process.env.APP_URL || 'http://localhost:3000'}/l/maya-birthday`, 'share', 'test', tick(1));
  tx.run(id(), MAYA_PHONE, `Wheel-throwing class for two on "For my birthday" is all covered 🎉 Say thanks: ${process.env.APP_URL || 'http://localhost:3000'}/l/maya-birthday/i/${items.wheel.id}`, 'covered', 'test', tick(1));
});

seedAll();
console.log('Seeded: 6 users, Maya\'s list /l/maya-birthday with 7 items and friends\' contributions.');
console.log('Log in as anyone at /dev/login (test mode).');
