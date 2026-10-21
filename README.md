# insidejoke

Let's celebrate you, and life.

insidejoke is a wishlist app where friends chip in. You make a list of things you'd love (exact brand, size, colour, the one you actually want), share one link, and friends pay toward a wish or buy you a treat (a bagel, a latte, a bouquet). Wishes stop at covered. Treats never run out. The amount a wish has collected is yours to cash out.

## Run it

```
npm i
npm run dev      # http://localhost:3000
```

Then open `/dev/login`, press **Load the demo**, and act as any demo user (Maya owns the list; Sam, Priya, Lina, Dev and Kofi are friends).

## Test mode vs live

With no keys set, the app runs in **test mode**: texts are not sent (they land in `/dev/texts`, the Outbox) and payments are simulated. A bar at the top of every page says so.

Copy `.env.example` to `.env.local` and fill in Twilio (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`) to really send texts, and `STRIPE_SECRET_KEY` to really charge. `APP_URL` is the public base URL used in text links. The database is Postgres: set `DATABASE_URL` (Neon, Supabase, Vercel Postgres all work). With no URL the app runs a local Postgres in-process (PGlite) under `data/pglite`, so nothing needs installing to try it. On Vercel without `DATABASE_URL` the data lives in `/tmp` and resets on every deploy.

## Phases

1. **Core loop** ✓ — phone sign-up, make a list, add wishes and treats, share by link or text, chip in / get it / treat, owner hears when a wish is covered.
2. **Thank-yous, cash out, history** — say thanks per gift, cash out collected amounts (5% fee), past lists and gifts.
3. **Collab** — make a list together for someone else.
4. **Surprises** — private lists with a date; the recipient only finds out on the day.

## Product rules

- A **phone number is the account**. No passwords; we text a code.
- The **5% fee** is taken at cash-out, from the owner's side. Givers never see it and are never charged it.
- An item has a **quantity**. Quantity **unlimited** makes it a **treat**: friends buy as many as they like, it never shows as covered. A quantity of one or more is a **wish**: giving stops at covered.
- **Dates only remind.** A date on a list never closes it, never hides it, never changes what a friend can do.
- **Amounts never appear on a list.** Friends see a bar (how far along a wish is), never dollars collected or who gave what. Dollars are only on the give screen and in the owner's own view.
- Copy is genderless. Avatars are blobs with initials, never photos of people.

## Layout

```
app/            routes (App Router): landing, signup, home, lists, l/[slug], menu, dev/*
components/     Blob, Logo, Header, Avatar and friends
lib/            db (Postgres), auth, lists, texts, payments, wallet, seed (demo data), actions (server actions), blob
```
