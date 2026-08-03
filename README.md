# Moving sale

A public one-page moving sale, built with Next.js and Tailwind and deployed on Vercel.

Anyone can browse the page. Adding, editing and deleting items is unlocked with a single
shared password, so you can manage the sale from your phone without any accounts or login
screens for buyers.

## Features

- Item cards with photos, price, optional retail price and an automatic "% off retail" badge
- Statuses: available / reserved / sold, with filter chips and live counts in the header
- Featured items get a highlighted border and are pinned above the rest; sold items sink to the bottom
- "Available from" badge for things you can only hand over after a certain date
- WhatsApp button in the header, plus a per-item "Claim on WhatsApp" link that pre-fills the item name
- Payment links (Revolut, BLIK, Venmo — whatever you configure)
- Owner login → edit mode: add / edit / delete items and a one-tap status cycle
- Photo upload straight from the phone camera roll, downscaled in the browser before upload

## Configuration

All settings are environment variables — see [.env.example](.env.example).

| Variable | Purpose |
| --- | --- |
| `EDIT_PASSWORD` | Unlocks edit mode. Editing is disabled entirely when unset. |
| `DATABASE_URL` | Postgres connection string (Neon / Vercel Postgres). |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for photo uploads. |
| `WHATSAPP_NUMBER` | Digits only, including country code, e.g. `48123456789`. |
| `PAYMENT_LINKS` | Comma-separated `Label\|url` pairs. |
| `SALE_TITLE` / `SALE_INTRO` / `SALE_CURRENCY` | Page copy. |

## Running locally

```bash
npm install
cp .env.example .env.local   # set EDIT_PASSWORD, leave DATABASE_URL empty
npm run dev
```

With `DATABASE_URL` empty, items are stored in `.data/items.json` and uploaded photos in
`public/uploads/` — no database needed to try it out. Both are gitignored.

## Deploying to Vercel

1. Push this repository to GitHub.
2. In Vercel, **Add New → Project** and import the repository (the Next.js preset is detected automatically).
3. In the project's **Storage** tab, create a **Neon Postgres** database and a **Blob** store, and
   connect both to the project. This sets `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN` for you.
4. In **Settings → Environment Variables**, add `EDIT_PASSWORD`, `WHATSAPP_NUMBER`,
   `PAYMENT_LINKS`, `SALE_TITLE`, `SALE_INTRO` and `SALE_CURRENCY`.
5. Deploy. The `items` table is created automatically on the first request.

## Editing from your phone

Open the page, scroll to the bottom, tap **Owner login** and enter `EDIT_PASSWORD`. The unlock is
stored in a cookie for a year, so you only do this once per device. Tap **Lock** in the edit bar to
sign out.

just a new deployment