import { get, run, id, pickColor, itemColor } from './db';
import { appUrl } from './texts';

// Demo data: Maya's birthday list with friends chipping in.
// Idempotent: does nothing if Maya already exists. Loaded from /dev/login in test mode.
export const MAYA_PHONE = '+15550000001';

export async function seedDemo() {
  if (await get('SELECT 1 FROM users WHERE phone = ?', MAYA_PHONE)) return false;

  const DAY = 24 * 60 * 60 * 1000;
  let clock = Date.now() - 9 * DAY;
  const tick = (hours = 7) => (clock += hours * 60 * 60 * 1000);

  const users = {};
  for (const [name, phone] of [['Maya', MAYA_PHONE], ['Sam', '+15550000002'], ['Priya', '+15550000003'], ['Lina', '+15550000004'], ['Dev', '+15550000005'], ['Kofi', '+15550000006']]) {
    const u = { id: id(), phone, name, ...pickColor(phone) };
    await run('INSERT INTO users (id, phone, name, color, seed, created_at) VALUES (?, ?, ?, ?, ?, ?)', u.id, u.phone, u.name, u.color, u.seed, tick(1));
    users[name] = u;
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

  // A couple of texts in the outbox so test mode has something to show.
  const tx = (to, body, kind) => run('INSERT INTO texts (id, to_phone, body, kind, status, created_at) VALUES (?, ?, ?, ?, ?, ?)', id(), to, body, kind, 'test', tick(1));
  await tx(users.Sam.phone, `Maya shared Maya's list with you: ${appUrl()}/l/maya-birthday`, 'share');
  await tx(MAYA_PHONE, `Wheel-throwing class for two on "For my birthday" is all covered 🎉 Say thanks: ${appUrl()}/l/maya-birthday/i/${items.wheel.id}`, 'covered');
  return true;
}
