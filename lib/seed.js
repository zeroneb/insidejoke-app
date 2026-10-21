import { get, all, run, id, pickColor, itemColor } from './db';
import { appUrl } from './texts';
import { scheduleReminders } from './reminders'; // a4

// Demo data: Maya's birthday list with friends chipping in.
// Idempotent: does nothing if Maya already exists. Loaded from /dev/login in test mode.
export const MAYA_PHONE = '+15550000001';

export async function seedDemo() {
  if (await get('SELECT 1 FROM users WHERE phone = ?', MAYA_PHONE)) { await seedWalletDemo(); await seedCollabDemo(); return false; }

  const DAY = 24 * 60 * 60 * 1000;
  let clock = Date.now() - 9 * DAY;
  const tick = (hours = 7) => (clock += hours * 60 * 60 * 1000);

  const users = {};
  // a1: bios for everyone (shown on Home, You, friend profiles)
  const BIOS = {
    Maya: 'ceramics, natural wine, long walks',
    Sam: 'bagels, bikes, bad puns',
    Priya: 'plants, pilates, late brunch',
    Lina: 'film photography, spicy food, cold swims',
    Dev: 'records, running, ramen',
    Kofi: 'candles, chess, coastal drives'
  };
  for (const [name, phone] of [['Maya', MAYA_PHONE], ['Sam', '+15550000002'], ['Priya', '+15550000003'], ['Lina', '+15550000004'], ['Dev', '+15550000005'], ['Kofi', '+15550000006']]) {
    // Fixed demo colors from the design roster (Maya purple, Sam sky, Priya purple, Lina orange, Dev green, Kofi teal).
    const ROSTER = { Maya: ['#B36EE0', 8], Sam: ['#A9CDF5', 13], Priya: ['#B36EE0', 21], Lina: ['#F0895A', 33], Dev: ['#93EC75', 47], Kofi: ['#5FC3D9', 71] };
    const u = { id: id(), phone, name, ...(ROSTER[name] ? { color: ROSTER[name][0], seed: ROSTER[name][1] } : pickColor(phone)) };
    await run('INSERT INTO users (id, phone, name, color, seed, bio, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)', u.id, u.phone, u.name, u.color, u.seed, BIOS[name], tick(1));
    users[name] = u;
  }
  // a1: friends both ways (Maya <-> Sam, Priya, Lina, Dev, Kofi)
  for (const name of ['Sam', 'Priya', 'Lina', 'Dev', 'Kofi']) {
    const t = tick(1);
    await run('INSERT INTO friends (user_id, friend_id, status, created_at) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING', users.Maya.id, users[name].id, 'friends', t);
    await run('INSERT INTO friends (user_id, friend_id, status, created_at) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING', users[name].id, users.Maya.id, 'friends', t);
  }

  // Sam has paid before.
  await run('INSERT INTO payment_methods (user_id, kind, label, created_at) VALUES (?, ?, ?, ?)', users.Sam.id, 'card', 'Card ••4242', tick(1));

  // Maya's list
  const listId = id();
  await run(`INSERT INTO lists (id, slug, owner_id, title, for_who, recipient_name, occasion, surprise, date, visibility, status, nudge_dismissed, shared_at, created_at)
    VALUES (?, 'maya-birthday', ?, 'For my birthday', 'me', NULL, 'Birthday', 0, NULL, 'public', 'open', 1, ?, ?)`, listId, users.Maya.id, clock + 3 * 60 * 60 * 1000, tick(2));

  const items = {};
  const addItem = async (key, name, priceCents, quantity, store, url, note) => {
    const n = Object.keys(items).length;
    const it = { id: id(), name, price_cents: priceCents, quantity };
    await run(`INSERT INTO items (id, list_id, name, price_cents, quantity, store, url, note, photo, color, removed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 0, ?)`,
      it.id, listId, name, priceCents, quantity, store, url, note, itemColor(n), tick(1));
    items[key] = it;
  };
  await addItem('boots', 'Ganni Western leather boots', 48000, 1, 'Ganni', 'https://www.ganni.com', 'Size 38, black. The ones with the embroidery.');
  await addItem('santal', 'Le Labo Santal 33', 22000, 1, 'Le Labo', 'https://www.lelabofragrances.com', '50ml is plenty.');
  await addItem('glasses', 'Wine glasses', 2400, 4, 'Hay', 'https://www.hay.com', 'The tinted ones.');
  await addItem('wheel', 'Wheel-throwing class for two', 15000, 1, 'Clay Club', null, 'Any Saturday works.');
  await addItem('bagel', 'Lox bagel', 1700, 0, 'Russ & Daughters', null, 'Everything bagel, extra capers.');
  await addItem('latte', 'Oat latte', 700, 0, 'The corner café', null, null);
  await addItem('bouquet', 'Bouquet', 2500, 0, 'The flower stand', null, 'Anything orange.');

  const give = (key, giverName, cents, units, note) =>
    run('INSERT INTO contributions (id, item_id, list_id, giver_id, amount_cents, units, note, visibility, payment_ref, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      id(), items[key].id, listId, users[giverName].id, cents, units, note, 'public', `test_${id()}`, tick(5));

  // Boots: 82% of $480
  await give('boots', 'Sam', 12000, 0, 'you deserve these for winter');
  await give('boots', 'Priya', 10000, 0, 'for every winter walk');
  await give('boots', 'Lina', 9360, 0, 'happy birthday, cowgirl');
  await give('boots', 'Dev', 8000, 0, 'stomp on all of 32');
  // Santal 33: 45% of $220
  await give('santal', 'Kofi', 6000, 0, 'smell expensive');
  await give('santal', 'Priya', 3900, 0, null);
  // Wine glasses ×4 ($96 total): 60%
  await give('glasses', 'Lina', 4800, 0, 'two for us, two for you');
  await give('glasses', 'Sam', 960, 0, null);
  // Wheel-throwing class: fully covered
  await give('wheel', 'Dev', 10000, 0, 'take me?');
  await give('wheel', 'Kofi', 5000, 0, 'make me a mug');
  // Treats (unlimited): units × price
  const treats = [
    ['bagel', 1700, [['Sam', 10, 'brunch is on me'], ['Priya', 8, null], ['Dev', 5, 'extra capers']]],
    ['latte', 700, [['Lina', 15, 'morning fuel'], ['Kofi', 12, null], ['Sam', 10, 'one a day'], ['Priya', 4, null]]],
    ['bouquet', 2500, [['Priya', 3, 'for the kitchen table'], ['Lina', 2, null], ['Dev', 1, 'orange, obviously']]]
  ];
  for (const [key, price, gifts] of treats) for (const [who, units, note] of gifts) await give(key, who, units * price, units, note);

  // a1: a second list for Maya, treats only (unlimited), so Home shows the grid.
  const treatsId = id();
  await run(`INSERT INTO lists (id, slug, owner_id, title, for_who, recipient_name, occasion, surprise, date, visibility, status, nudge_dismissed, shared_at, created_at)
    VALUES (?, 'maya-treats', ?, 'Treats, anytime', 'me', NULL, NULL, 0, NULL, 'public', 'open', 1, ?, ?)`, treatsId, users.Maya.id, clock + 60 * 60 * 1000, tick(2));
  const tItems = {};
  let tn = 0;
  const addTreat = async (key, name, priceCents, store, note) => {
    const it = { id: id(), name, price_cents: priceCents, quantity: 0 };
    await run(`INSERT INTO items (id, list_id, name, price_cents, quantity, store, url, note, photo, color, removed, created_at) VALUES (?, ?, ?, ?, 0, ?, NULL, ?, NULL, ?, 0, ?)`,
      it.id, treatsId, name, priceCents, store, note, itemColor(tn++ + 3), tick(1));
    tItems[key] = it;
  };
  await addTreat('pizza', 'Slice of pizza', 450, "Joe's Pizza", 'Plain, folded.');
  await addTreat('cortado', 'Cortado', 500, 'Devoción', null);
  await addTreat('book', 'A paperback', 1800, 'Books Are Magic', 'Surprise me.');
  const treatGive = (key, who, units, note) =>
    run('INSERT INTO contributions (id, item_id, list_id, giver_id, amount_cents, units, note, visibility, payment_ref, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      id(), tItems[key].id, treatsId, users[who].id, units * tItems[key].price_cents, units, note, 'public', `test_${id()}`, tick(6));
  await treatGive('pizza', 'Sam', 2, 'rough monday, eat this');
  await treatGive('cortado', 'Lina', 3, 'morning fuel');
  await treatGive('book', 'Kofi', 1, 'just because');
  await treatGive('pizza', 'Dev', 1, null);

  // A couple of texts in the outbox so test mode has something to show.
  const tx = (to, body, kind) => run('INSERT INTO texts (id, to_phone, body, kind, status, created_at) VALUES (?, ?, ?, ?, ?, ?)', id(), to, body, kind, 'test', tick(1));
  await tx(users.Sam.phone, `Maya shared Maya's list with you: ${appUrl()}/l/maya-birthday`, 'share');
  await tx(MAYA_PHONE, `Wheel-throwing class for two on "For my birthday" is all covered 🎉 Say thanks: ${appUrl()}/l/maya-birthday/i/${items.wheel.id}/thanks`, 'covered');
  await seedWalletDemo(); await seedCollabDemo();
  return true;
}

// ---- a3 (wallet / history / give): payout method for Maya, one historical payout,
// Lina's list with two items and a couple of gifts Maya gave there. Idempotent.
export async function seedWalletDemo() {
  const maya = await get('SELECT * FROM users WHERE phone = ?', MAYA_PHONE);
  const lina = await get('SELECT * FROM users WHERE phone = ?', '+15550000004');
  if (!maya || !lina) return;
  const DAY = 24 * 60 * 60 * 1000;
  const t = Date.now();

  if (!(await get('SELECT 1 FROM payout_methods WHERE user_id = ?', maya.id))) {
    await run('INSERT INTO payout_methods (user_id, kind, label, created_at) VALUES (?, ?, ?, ?)', maya.id, 'bank', 'Chase checking ••42', t - 30 * DAY);
    await run('UPDATE users SET weekly_thanks = 1 WHERE id = ?', maya.id); // so "Run Sunday digest" has someone to text
  }
  if (!(await get('SELECT 1 FROM payment_methods WHERE user_id = ?', maya.id)))
    await run('INSERT INTO payment_methods (user_id, kind, label, created_at) VALUES (?, ?, ?, ?)', maya.id, 'card', 'Visa ·· 4421', t - 40 * DAY);

  const mList = await get("SELECT * FROM lists WHERE slug = 'maya-birthday'");
  if (mList && !(await get('SELECT 1 FROM payouts WHERE user_id = ?', maya.id))) {
    await run('INSERT INTO payouts (id, list_id, user_id, gross_cents, fee_cents, net_cents, method_label, payout_ref, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      id(), mList.id, maya.id, 86500, 4325, 82175, 'Chase checking ••42', 'test_po_seed', t - 18 * DAY);
  }

  let lList = await get("SELECT * FROM lists WHERE slug = 'lina-birthday'");
  if (!lList) {
    const lid = id();
    await run(`INSERT INTO lists (id, slug, owner_id, title, for_who, recipient_name, occasion, surprise, date, visibility, status, nudge_dismissed, shared_at, created_at)
      VALUES (?, 'lina-birthday', ?, 'For my birthday', 'me', NULL, 'Birthday', 0, NULL, 'public', 'open', 1, ?, ?)`, lid, lina.id, t - 35 * DAY, t - 36 * DAY);
    lList = await get('SELECT * FROM lists WHERE id = ?', lid);
  }
  const have = await all('SELECT * FROM items WHERE list_id = ? AND removed = 0', lList.id);
  if (have.length === 0) {
    await run(`INSERT INTO items (id, list_id, name, price_cents, quantity, store, url, note, photo, color, removed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 0, ?)`,
      id(), lList.id, 'Le Labo candle', 8000, 1, 'Le Labo', 'https://www.lelabofragrances.com', 'Santal 26, the big one.', itemColor(1), t - 35 * DAY);
    await run(`INSERT INTO items (id, list_id, name, price_cents, quantity, store, url, note, photo, color, removed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 0, ?)`,
      id(), lList.id, 'Spicy noodle lunch', 1400, 0, "Xi'an Famous Foods", null, 'Cumin lamb, always.', itemColor(2), t - 35 * DAY);
  }
  if (!(await get('SELECT 1 FROM contributions WHERE list_id = ? AND giver_id = ?', lList.id, maya.id))) {
    const candle = await get('SELECT * FROM items WHERE list_id = ? AND quantity = 1 ORDER BY created_at ASC', lList.id);
    const noodle = await get('SELECT * FROM items WHERE list_id = ? AND quantity = 0 ORDER BY created_at ASC', lList.id);
    if (candle) await run('INSERT INTO contributions (id, item_id, list_id, giver_id, amount_cents, units, note, visibility, payment_ref, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      id(), candle.id, lList.id, maya.id, 4000, 0, 'light it on a slow sunday', 'public', 'test_seed_c', t - 28 * DAY);
    if (noodle) await run('INSERT INTO contributions (id, item_id, list_id, giver_id, amount_cents, units, note, visibility, payment_ref, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      id(), noodle.id, lList.id, maya.id, 1400, 1, 'lunch is on me', 'private', 'test_seed_n', t - 20 * DAY);
  }
}

// ---- a4 (collab + surprise): "For Mom" organised by Sam with Maya as member,
// "Leila's 30th" surprise organised by Maya with Priya, Lina and Dev, sending in 3 days. Idempotent.
export async function seedCollabDemo() {
  const by = async (phone) => get('SELECT * FROM users WHERE phone = ?', phone);
  const maya = await by(MAYA_PHONE), sam = await by('+15550000002'), priya = await by('+15550000003'),
    lina = await by('+15550000004'), dev = await by('+15550000005'), kofi = await by('+15550000006');
  if (!maya || !sam || !priya || !lina || !dev || !kofi) return;
  const DAY = 24 * 60 * 60 * 1000;
  const t = Date.now();
  const member = (listId, uid, at) => run('INSERT INTO list_members (list_id, user_id, role, created_at) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING', listId, uid, 'collaborator', at);
  const item = async (listId, n, name, cents, qty, store, note, addedBy, at) => {
    const iid = id();
    await run(`INSERT INTO items (id, list_id, name, price_cents, quantity, store, url, note, photo, color, removed, created_at, added_by) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, NULL, ?, 0, ?, ?)`,
      iid, listId, name, cents, qty, store, note, itemColor(n), at, addedBy);
    return iid;
  };
  const give = (listId, itemId, uid, cents, units, note, at) =>
    run('INSERT INTO contributions (id, item_id, list_id, giver_id, amount_cents, units, note, visibility, payment_ref, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      id(), itemId, listId, uid, cents, units, note, 'public', `test_${id()}`, at);

  // For Mom: Sam organises, Maya is in.
  if (!(await get("SELECT 1 FROM lists WHERE slug = 'for-mom'"))) {
    const lid = id();
    await run(`INSERT INTO lists (id, slug, owner_id, title, for_who, recipient_name, occasion, surprise, date, visibility, status, nudge_dismissed, shared_at, created_at)
      VALUES (?, 'for-mom', ?, 'For Mom', 'other', 'Mom', 'Mother''s Day', 0, '2027-05-09', 'private', 'open', 1, ?, ?)`, lid, sam.id, t - 4 * DAY, t - 6 * DAY);
    await member(lid, maya.id, t - 5 * DAY);
    const oven = await item(lid, 0, 'Le Creuset dutch oven, sage', 42000, 1, 'Le Creuset', '5.5 qt, the sage green one.', sam.id, t - 5 * DAY);
    const spa = await item(lid, 1, 'Spa day at Aire Ancient Baths', 20000, 1, 'Aire Ancient Baths', 'The thermal bath ritual.', maya.id, t - 5 * DAY);
    const peony = await item(lid, 2, 'Peonies every week', 3000, 0, 'The flower stand', 'Pink ones, if they have them.', sam.id, t - 5 * DAY);
    await item(lid, 3, 'Framed print of the garden', 9000, 1, 'Etsy', null, maya.id, t - 4 * DAY);
    await give(lid, oven, priya.id, 15000, 0, 'for all the sunday stews', t - 3 * DAY);
    await give(lid, oven, maya.id, 10200, 0, null, t - 3 * DAY);
    await give(lid, spa, lina.id, 7000, 0, 'she deserves a whole day', t - 2 * DAY);
    await give(lid, peony, kofi.id, 6000, 2, null, t - 2 * DAY);
    await give(lid, peony, dev.id, 6000, 2, 'pink ones', t - DAY);
    for (const p of [priya.phone, lina.phone, kofi.phone, dev.phone, '+15550000193'])
      await run('INSERT INTO list_shares (id, list_id, phone, created_at) VALUES (?, ?, ?, ?) ON CONFLICT (list_id, phone) DO NOTHING', id(), lid, p, t - 4 * DAY);
    await run('INSERT INTO blasts (id, list_id, from_id, body, recipients, pinned, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)',
      id(), lid, sam.id, "Mom's day is coming! The spa day is 35% there, every bit helps 💐", 6, t - DAY);
    await scheduleReminders({ id: lid });
  }

  // Leila's 30th: Maya organises a surprise with Priya, Lina, Dev. Goes out in 3 days.
  if (!(await get("SELECT 1 FROM lists WHERE slug = 'leila-30th'"))) {
    const lid = id();
    const sendAt = new Date(t + 3 * DAY); sendAt.setHours(0, 0, 0, 0);
    await run(`INSERT INTO lists (id, slug, owner_id, title, for_who, recipient_name, occasion, surprise, date, visibility, status, nudge_dismissed, shared_at, created_at,
      send_at, recipient_phone, handoff, reveal_token)
      VALUES (?, 'leila-30th', ?, 'Leila''s 30th', 'other', 'Leila', 'Birthday', 1, NULL, 'private', 'open', 1, ?, ?, ?, ?, 'surprise', 'leila30-demo')`,
      lid, maya.id, t - 8 * DAY, t - 9 * DAY, sendAt.getTime(), '+15550000007');
    for (const [u, d] of [[priya, 8], [lina, 7], [dev, 7]]) await member(lid, u.id, t - d * DAY);
    const boots = await item(lid, 0, 'Ganni Western leather boots', 42000, 1, 'Ganni', 'Black, EU 38.', maya.id, t - 8 * DAY);
    const candles = await item(lid, 1, 'Beeswax taper candles', 6000, 1, 'Brooklyn Candle Studio', 'Terracotta, set of 6.', priya.id, t - 8 * DAY);
    const cls = await item(lid, 2, 'Wheel-throwing class for two', 14000, 1, 'BKLYN Clay', null, lina.id, t - 7 * DAY);
    await give(lid, boots, maya.id, 12000, 0, null, t - 6 * DAY);
    await give(lid, boots, priya.id, 10000, 0, null, t - 6 * DAY);
    await give(lid, boots, sam.id, 10000, 0, 'wear them everywhere', t - 5 * DAY);
    await give(lid, boots, kofi.id, 10000, 0, null, t - 5 * DAY);
    await give(lid, candles, lina.id, 4200, 0, null, t - 4 * DAY);
    await give(lid, candles, dev.id, 1800, 0, null, t - 4 * DAY);
    await give(lid, cls, dev.id, 5000, 0, null, t - 3 * DAY);
    await give(lid, cls, priya.id, 2700, 0, null, t - 2 * DAY);
    const note = (uid, body, d) => run('INSERT INTO messages (id, list_id, from_id, kind, body, media, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?)', id(), lid, uid, 'card', body, t - d * DAY);
    await note(maya.id, 'Thirty looks so good on you. Wear the boots everywhere.', 5);
    await note(priya.id, "I'm booking us the pottery class. I call the wonky bowl.", 4);
    await note(lina.id, 'Light the candles, put on a record, and think of us.', 3);
    await scheduleReminders({ id: lid });
  }
}
