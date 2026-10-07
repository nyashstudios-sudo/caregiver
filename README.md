# Caregiver

A home-care marketplace built for Kenya. Clients find verified nannies, elder-care workers, house managers and wellness therapists, check their real certificates and KES rates, book them, pay through M-Pesa and leave reviews. Caretakers run their own page, take bookings, rate clients back and withdraw earnings to M-Pesa.

The stack is Next.js 15 (App Router) on TypeScript, Prisma against Postgres (Supabase), NextAuth v5 for sessions, Supabase Storage for files and Tailwind v4 for styling. Payments run on Safaricom's Daraja API (STK Push in, B2C out).

---

## What's in the box

**For clients**
- Search the directory by location, keyword, max hourly rate, category and verified skills (first aid, massage).
- Every caretaker page shows their uploaded credentials as openable documents — not badges you have to trust.
- Book with a date, hours and notes. The agreed KES amount is calculated server-side from the caretaker's current rate.
- Pay the booking with M-Pesa STK Push. Money sits in escrow until the job completes.
- Rate the caretaker after the job. Message them directly if questions come up first.

**For caretakers**
- Worker portal to manage the public profile: rates, experience, skills, bio, avatar, certifications.
- Accept, complete or cancel requests; the wallet is credited automatically when a paid job completes.
- Rate the client back — punctuality, communication, how the payment went. The review system works both ways.
- Withdraw wallet balance to any Safaricom number (KES 100–70,000 per request).

**For admins** (`/admin`)
- Overview with live platform stats: active users, pending bookings, new signups, open messages.
- User management: search, filter by role/status, suspend or restore accounts, promote to admin.
- Booking monitor: every booking on the platform with filters and force-cancel.
- Payments monitor: collections, withdrawals, refunds, wallet liability, per-transaction M-Pesa references.
- Contact inbox with open/resolved triage, plus a blog composer with drafts, publishing and cover images.

**Messaging** — a two-sided inbox between any signed-in users. Unread counts, day separators, Enter-to-send. Entry points everywhere you'd expect: caretaker profiles, booking cards, profile pages.

**Account settings** (`/account`) — edit name/location/phone/bio/avatar, change password, notification preference, delete account (with password + typed confirmation). Admins can't delete themselves from here.

**Pages** — landing, directory, profiles, public `/profile/[userId]` for every user, blog with full articles, about, FAQ, contact (stored in the database), privacy, terms, wallet.

---

## Accounts after seeding

```
admin     caregiver@info.com / Mtemi@254#
clients   jane@client.app, brian@client.app  / Client123!
workers   amina@caretaker.app + 7 more       / Worker123!
```

Workers all share `Worker123!`. Emails follow the pattern `<name>@caretaker.app`.

---

## Running it locally

```bash
npm install
cp .env.example .env       # then fill in the values
npx prisma migrate deploy  # apply committed migrations
npm run db:seed            # demo data: users, profiles, bookings, DMs, reviews, posts
npm run dev                # http://localhost:3000
```

Other scripts: `build`, `start`, `lint`, `typecheck`, `db:migrate` (creates migrations), `db:deploy`, `db:seed`, `db:studio`.

---

## Environment variables

Set these in `.env` locally and in Vercel → Settings → Environment Variables for every environment.

| Variable | What it does |
| --- | --- |
| `DATABASE_URL` | Postgres connection string. Use the Supabase **pooler** host on port 5432 with `sslmode=require`. |
| `AUTH_SECRET` | NextAuth JWT signing key. `openssl rand -base64 32` to generate. |
| `AUTH_TRUST_HOST` | `true` behind Vercel/proxies. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only. Used by `/api/upload` to write to the storage bucket. |
| `STORAGE_BUCKET` | Upload bucket name (public, 5 MB, pdf/png/jpeg/webp). |
| `NEXT_PUBLIC_SITE_URL` | Production URL. Drives canonicals, sitemap, robots and OG images — must match the real domain. |

Optional — Google sign-in appears on login/signup only when both are set:

| Variable | Notes |
| --- | --- |
| `AUTH_GOOGLE_ID` | From Google Cloud Console → Credentials → OAuth client (Web). |
| `AUTH_GOOGLE_SECRET` | Authorized redirect URI: `https://YOUR-DOMAIN/api/auth/callback/google` |

Optional — M-Pesa rails. Leave empty and the app runs normally; the pay/withdraw forms explain that payments aren't configured yet.

| Variable | Notes |
| --- | --- |
| `DARAJA_ENV` | `sandbox` or `production`. |
| `DARAJA_CONSUMER_KEY` / `DARAJA_CONSUMER_SECRET` | From the Daraja developer portal. |
| `DARAJA_SHORTCODE` | Paybill/till number. |
| `DARAJA_PASSKEY` | Lipa Na M-Pesa online passkey. |
| `DARAJA_CALLBACK_URL` | Public HTTPS URL pointing at `/api/payments/daraja`. |
| `DARAJA_B2C_INITIATOR` | API initiator user name. |
| `DARAJA_B2C_SECURITY_CREDENTIAL` | Password encrypted with Safaricom's certificate, as issued per shortcode. |
| `PLATFORM_FEE_PCT` | Commission taken from worker earnings on release. Defaults to 10. |

`.env` is gitignored; `.env.example` carries every key with a blank or placeholder value. If the Supabase variables are missing, uploads fall back to a local `.uploads/` directory served through `/api/files`.

---

## How money moves

1. A client books a caretaker. Hours × hourly rate = agreed amount, stored on the booking.
2. The client pays with STK Push. The callback from Safaricom is matched against the stored payment by `checkoutRequestId`, the amount is re-verified against what we charged, and only then does the booking flip to paid. Duplicate callbacks can't double-apply — every settlement is a conditional `PENDING → SUCCESS/FAILED` update.
3. Funds stay in escrow. When the worker marks the job completed, the platform fee comes off and the rest lands in their wallet in one transaction with an idempotency guard on the booking.
4. Cancellations after payment refund the client's wallet instead.
5. Withdrawals debit the wallet first (so two concurrent requests can't overdraw), fire a B2C transfer, and restore the balance automatically if Safaricom rejects it.

Wallet balances are the platform's liability — `/admin/payments` shows that number next to collections and payouts.

---

## Deploying to Vercel

1. Push the repository to GitHub.
2. Import it at vercel.com/new. `vercel.json` runs `prisma generate && prisma migrate deploy && next build`, so migrations apply on each deploy without a manual step.
3. Add the environment variables above. Set `NEXT_PUBLIC_SITE_URL` to the final domain.
4. Deploy, then seed once against the production database:
   ```bash
   DATABASE_URL="<production-url>" npm run db:seed
   ```
5. After the custom domain is attached, update `NEXT_PUBLIC_SITE_URL` to match it — sitemaps and canonical tags read it.

Post-deploy checks: `/robots.txt` and `/sitemap.xml` render, `/opengraph-image` returns a PNG, `/admin` bounces anonymous visitors to `/login`, and an M-Pesa sandbox payment round-trips if you've wired Daraja.

**Google sign-in**: create an OAuth Web client, add `https://<your-domain>/api/auth/callback/google` as an authorized redirect URI, put the ID/secret into the Vercel env vars, redeploy.

**Cloudflare**: for DNS-only fronting, CNAME the domain to `<project>.vercel.app` with proxying off. For an orange-cloud Worker proxy, fetch through to Vercel preserving the original host, and turn off Rocket Loader and Auto Minify — both break Next.js hydration.

---

## Project layout

```
prisma/
  schema.prisma     User, Profile, CaretakerDetails, Certification, Booking,
                    Review, Wallet, Payment, Message, BlogPost, ContactMessage
  migrations/       committed; applied by `migrate deploy`
  seed.ts           demo dataset (idempotent — resets its own tables)
src/
  app/              routes: public pages, /dashboard, /worker, /admin, /messages,
                    /wallet, /account, /profile/[userId], API routes
  components/       UI built from token classes in app/globals.css
  lib/
    auth.ts         NextAuth config + providers (credentials, phone, Google)
    daraja.ts       M-Pesa OAuth, STK Push, B2C — server-only
    payments.ts     escrow release/refund, wallet credit/debit
    actions/        server actions (auth, bookings, messages, payments, reviews,
                    account, admin, contact, blog)
  middleware.ts     role gating for /dashboard, /worker, /admin, /messages,
                    /account, /wallet
```

Security headers (CSP in production, HSTS, frame/COOP, permissions policy) live in `next.config.ts`. Login, OTP, password-change and withdrawal attempts are throttled in `src/lib/throttle.ts`.

---

## Verification

`npx tsc --noEmit` and `npm run lint` are kept clean; `npm run build` compiles all routes. The flows above were exercised end to end in a browser against the Supabase database: signup/login in all three roles, profile edits, certification uploads, booking lifecycle, contact form → admin inbox, blog compose → publish → live article, messaging, wallet views, and the admin user/booking/payment screens. The M-Pesa callbacks follow the documented Daraja contract but need sandbox credentials to run live.
