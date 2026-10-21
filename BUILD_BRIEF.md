# insidejoke app: build brief (internal, for the build pass)

Goal: a fully working mobile web app that matches the Option 13 designs pixel for pixel, with Option 10 designs for screens Option 13 did not redo. Stack: Next.js 15 App Router, React 19, .jsx, server actions, Postgres via `lib/db.js` (`get/all/run` with `?` placeholders, all async). No client state libraries. CSS in `app/globals.css` (tokens there) plus inline styles copied from the designs.

## Where the designs are
- Option 13 boards (the source of truth): `/tmp/claude-0/-home-claude/d5f30d94-2486-5350-a57a-ec7beb45913a/scratchpad/o13/project/ij13/<Name>.dc.html` (ignore the `-o10` copies).
- Option 10 boards for everything else: `/tmp/claude-0/-home-claude/d5f30d94-2486-5350-a57a-ec7beb45913a/scratchpad/o10root/project/ij10/<Name>.dc.html`, plus Option 12 updates in `.../o10root/project/ij12/` (NewList, AddItem, Item, SentTreat, WeeklyThanks, TextBlast, CashOut) and the landing in `.../o10root/project/ij11/Landing.dc.html` (already built at `/`).
- To SEE a design: `node /tmp/claude-0/-home-claude/d5f30d94-2486-5350-a57a-ec7beb45913a/scratchpad/render/render.mjs <outdir> <file.dc.html>` writes a PNG; Read it. Do this for every screen you build, before and after, and compare side by side with a screenshot of your page.
- The design files are x-dc templates: markup with inline styles, `{{holes}}`, `<sc-for>` loops, `<sc-if>` branches, and a `renderVals()` script at the bottom holding the sample data and the `blob()` math. Port the markup and inline styles literally into JSX (style objects), replace holes with real data, loops with `.map`, branches with conditionals.

## Rules that are product decisions (do not reinterpret)
- Copy is genderless everywhere (no her/his/she/he).
- Avatars: `Avatar` from `components/ui.jsx` (blob + bold initial, the person's own color/seed from the users table; the owner/viewer variant is purple blob + lime Garamond initial, `owner` prop). Profile photos, when set, render as a duotone halftone inside the blob (see You.dc.html lines 40–46: `.duo` filter + dot pattern).
- Money: givers never see a fee. Amounts never appear on lists, tiles, Lately, profiles or item pages; only on `/wallet` and `/wallet/history` for the owner, and the giver's own amount on the give screen and their own Sent screen. Progress = "% covered" for wishes, "×N" for treats (quantity 0 = unlimited treat).
- Items say where they are from (`store`), never "linked".
- Bottom bar (`components/nav.jsx`, `<Nav me={me} active="home|friends|add|wallet|you" />`) on every signed-in page except: sign up / phone confirm, make a list, add item, edit item, give (contribute/treat), sent, covered/thank-you, share sheet, surprise reveal. Pages with the bar wrap content in `<main className="withnav">` so the bar never covers content.
- Hand sketches (`ItemSketch`): one white wobbly line, no fills, hatching; text never over a sketch. Add sketches for the item kinds the designs show (boots, bottle/perfume, vase, class/ticket, bagel, latte, bouquet, camera, gift) in `components/ui.jsx`.
- Texts carry key moments and go through `sendText()` (test mode → outbox at /dev/texts, shown in the test bar). Respect the user's `notify_*` columns.
- Test mode: no Twilio/Stripe keys. The 6-digit code is shown on screen (already done), payments and payouts are simulated (`lib/payments.js`, `lib/wallet.js`).

## Conventions
- Server components for pages (`export const dynamic = 'force-dynamic'`), client components only for forms needing local state (`'use client'`, `useActionState`). Server actions live in `lib/actions.js` (add yours there, or a new `lib/actions-<area>.js` with `'use server'` at the top).
- `currentUser()` from `lib/auth.js`; redirect to `/signup?next=…` when needed.
- Data helpers: `lib/lists.js` (listBySlug, owner, itemsFor, itemById, withProgress, label, notesFor, listsOwnedBy, lately, money), `lib/wallet.js`, `lib/payments.js`, `lib/seed.js` (demo data; extend it when your screens need data, keep it idempotent), `lib/fetchlink.js` (link reader), `lib/time.js` (ago).
- Tables: see `lib/db.js` SCHEMA (users, codes, sessions, lists, items, contributions, payment_methods, texts, reactions, thanks, payout_methods, payouts, reminders, list_shares, friends, list_members, blasts, messages). Add columns with `ALTER TABLE … ADD COLUMN IF NOT EXISTS` in the SCHEMA array if you need more.
- Ids: `id()`; times: `now()` (ms). Counts/sums from SQL come back as numbers.
- Every page works at 390px wide with 20px gutters; `.app` is max 430px.

## Running your own dev server (several people build in parallel, so isolate yours)
```
cd /home/claude/insidejoke-app
NEXT_DIST_DIR=.next-<yourname> PGLITE_DIR=/tmp/pg-<yourname> APP_URL=http://localhost:<port> npx next dev -p <port> > /tmp/dev-<yourname>.log 2>&1 &
```
Then open `http://localhost:<port>/dev/login`, press "Load the demo", log in as Maya (owner) or Sam (friend). Screenshot pages with Playwright (import from `/opt/node-tools/node_modules/playwright/index.mjs`, viewport 390×844, deviceScaleFactor 2, fullPage) and compare against the rendered design PNG. Fix until they match. Before finishing, run `NEXT_DIST_DIR=.next-<yourname> npx next build` and make sure it passes with no errors. Kill your dev server when done.

## Ownership (do not edit files outside your area except `lib/db.js` SCHEMA additions, `lib/seed.js` additions, `components/ui.jsx` additions, and `app/globals.css` additions at the END of the file, each clearly commented with your area name)
See the task you were given.
