# Caregiver

A home-care marketplace built for Kenya. Clients find verified nannies, elder-care workers, house managers and wellness therapists, check their real certificates and KES rates, book them, pay through M-Pesa and leave reviews. Caretakers run their own page, take bookings, rate clients back and withdraw earnings to M-Pesa.

The stack is Next.js 15 (App Router) on TypeScript, Prisma against Postgres (Supabase), NextAuth v5 for sessions, Supabase Storage for files and Tailwind v4 for styling. Payments run on Safaricom's Daraja API (STK Push in, B2C out).

---

## What's in the box

**For clients**
- Search the directory by location, keyword, max hourly rate, category and verified skills (first aid, massage).
- Every caretaker page shows their uploaded credentials as openable documents — not badges you have to trust.
- Book with a date, hours and notes. The agreed KES amount is calculated server-side from the caretaker's current rate.
- Fund your **wallet once with an M-Pesa deposit** and pay bookings instantly from balance — or pay any booking directly by STK Push. Money sits in escrow until the job completes.
- Rate the caretaker after the job. Message them directly if questions come up first.

**For caretakers**
- Worker portal to manage the public profile: rates, experience, skills, bio, avatar, certifications.
- Publish a **portfolio** of past work (photos, clients, outcomes) that shows on the public profile.
- Publish fixed-price **services** in the marketplace — clients book them in one tap without negotiating.
- Accept, complete or cancel requests; earnings land in the wallet automatically when a paid job completes — net of the platform fee and KRA withholding tax, each recorded on a statement.
- Track every earning in an **append-only wallet ledger** and a yearly **KRA withholding-tax statement** (`/wallet/tax`) with a downloadable CSV; add your KRA PIN for the records.
- Rate the client back — punctuality, communication, how the payment went. The review system works both ways.
- Withdraw wallet balance to any Safaricom number (KES 100–70,000 per request) — workers stay responsible for filing their own KRA returns; the platform withholds at source and hands them the paper trail.

**Onboarding & trust**
- Detailed, role-aware signup: clients get the essentials, workers add bio, experience, rate and skills up front (with a password strength meter and terms gate).
- Email verification through Supabase: a code lands in your inbox and `/welcome` confirms it; the emailed link path works too. Google sign-ins skip it (Google already proved the address).
- Admin **vetting**: new credential uploads sit in `/admin/verifications` as PENDING until approved; vetted workers get the public ✓ badge, unvetted ones show "Vetting in progress".

**Marketplace** (`/services`)
- Browse ready-to-book offers with category filters and search; each listing has its own SEO-ready page at `/services/[slug]` with Schema.org `Service` markup.
- Booking from a listing locks in the listed price server-side — no client-side amount anywhere.

**PWA** — installable on mobile: service worker with an offline fallback page, branded install prompt, and opt-in Web Push alerts for new messages and booking changes (permission is only ever requested on a tap).

**For admins** (`/admin`) — an operator surface, deliberately separate from client/worker UI (admins are bounced away from `/dashboard`, `/worker` and `/wallet`):
- Command-center overview: users, bookings funnel, escrow collected, commission earned, wallet liability, vetting backlog.
- **Verifications** queue: approve/reject credential documents with notes, vet workers for the public badge.
- User management: search, filter by role/status, suspend or restore, promote to admin, email-verified and vetting badges.
- Booking monitor with filters and force-cancel; payments monitor with M-Pesa references, editable **commission rate** and **KRA withholding-tax rate** (monetization + compliance), plus deposit totals, escrow, tax held to remit and wallet liability.
- **Integrations** board: live status of the database, storage, email verification, Daraja, Google OAuth and the site URL — env var names only, never values.
- **Audit trail**: every privileged action (suspensions, vetting, payouts, settings) logged with actor, target and timestamp.
- Contact inbox with open/resolved triage, plus a blog composer with drafts, publishing and cover images.

**Messaging** — a two-sided inbox between any signed-in users. Unread counts, day separators, Enter-to-send. Entry points everywhere you'd expect: caretaker profiles, booking cards, profile pages.

**Account settings** (`/account`) — edit name/location/phone/bio/avatar, change password, notification preference, delete account (with password + typed confirmation). Admins can't delete themselves from here.

**Pages** — landing, directory, profiles, public `/profile/[userId]` for every user, blog with full articles, about, FAQ, contact (stored in the database), privacy, terms, wallet with deposits and ledger, `/wallet/tax` withholding-tax statements.

---

## Accounts after seeding

```
admin     caregiver@info.com / Mtemi@254#
clients   jane@client.app, brian@client.app  / Client123!
workers   amina@caretaker.app + 7 more       / Worker123!
```

Workers all share `Worker123!`. Emails follow the pattern `<name>@caretaker.app`. Seeded accounts arrive email-verified and (for workers) pre-vetted; fresh signups walk through `/welcome` and land in the vetting queue.

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
| `DATABASE_URL` | Postgres connection string for the app: Supabase **transaction pooler** (port 6543, `pgbouncer=true`) so serverless instances multiplex instead of exhausting session slots. |
| `DIRECT_URL` | Session-pooler connection (port 5432) used by `prisma migrate` — migrations need real advisory locks. |
| `AUTH_SECRET` | NextAuth JWT signing key. `openssl rand -base64 32` to generate. |
| `AUTH_TRUST_HOST` | `true` behind Vercel/proxies. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only. Uploads, admin user provisioning for verification emails. |
| `STORAGE_BUCKET` | Upload bucket name (public, 5 MB, pdf/png/jpeg/webp). |
| `NEXT_PUBLIC_SITE_URL` | Production URL — currently `https://caregiver254.vercel.app`. Drives canonicals, sitemap, robots, OG images and manifest shortcuts. |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push keys (`npx web-push generate-vapid-keys --json`). Without them the PWA still installs; only push alerts stay off. |
| `VAPID_SUBJECT` | Contact for push, e.g. `mailto:info@caregiver.co.ke`. |

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
| `WHT_RATE_PCT` | KRA withholding tax on worker earnings, in %. Defaults to 5 (ITA s.35 resident rate); admins can override it from `/admin/payments`. |

`.env` is gitignored; `.env.example` carries every key with a blank or placeholder value. If the Supabase variables are missing, uploads fall back to a local `.uploads/` directory served through `/api/files`.

---

## How money moves

1. A client books a caretaker. Hours × hourly rate = agreed amount, stored on the booking.
2. The client funds the wallet with an **STK deposit** (or pays the booking directly by STK, or from balance). Safaricom callbacks are matched by `checkoutRequestId`, the amount is re-verified against what we charged, and only then does the payment flip `PENDING → SUCCESS` — duplicates can never double-apply, and wallet credits happen in the same transaction as the flip.
3. Paying from balance is a conditional debit inside the same transaction as the booking's paid marker, so two tabs racing to pay can't overdraw or double-charge.
4. Funds sit in escrow. On completion the platform fee and the KRA withholding tax (default 5%, snapshotted per job) come off the gross, the net hits the worker's wallet, and the split is written to `TaxWithholding` — all in one idempotent transaction.
5. Cancellations after payment refund the client's wallet instead.
6. Withdrawals hold the balance, open a PENDING payment and stamp the ledger atomically, fire the B2C transfer, and restore everything with a reversal entry if Safaricom rejects it.
7. Every wallet movement appends a `LedgerEntry` carrying the resulting balance — replaying the ledger always reproduces the wallet exactly.

Workers download their withholding-tax statement as CSV from `/wallet/tax`; Caregiver withholds and remits, they file their own return and claim the credit. Wallet balances plus tax held are the platform's liabilities — `/admin/payments` shows all of them next to collections and payouts.

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
                    Review, Wallet, Payment, Message, BlogPost, ContactMessage,
                    PortfolioItem, Service, PlatformSetting, AdminAuditLog,
                    PushSubscription
  migrations/       committed; applied by `migrate deploy`
  seed.ts           demo dataset (idempotent — resets its own tables)
src/
  app/              routes: public pages, /services, /welcome, /dashboard, /worker,
                    /admin (overview, users, verifications, bookings, payments,
                    posts, messages, audit, integrations), /messages, /wallet,
                    /account, /profile/[userId], API routes (push, upload, payments)
  components/       UI built from token classes in app/globals.css + PWA controller
  lib/
    auth.ts         NextAuth config + providers (credentials, phone, Google)
    daraja.ts       M-Pesa OAuth, STK Push, B2C — server-only
    payments.ts     escrow release/refund, wallet credit/debit
    verify.ts       Supabase email verification (code + link paths)
    audit.ts        append-only admin audit trail
    settings.ts     DB-backed platform settings (commission rate)
    notify.ts       Web Push sender
    actions/        server actions (auth, bookings, messages, payments, reviews,
                    account, admin, contact, blog, portfolio, services, verify)
  middleware.ts     role gating; admins are kept off /dashboard, /worker, /wallet
public/
  sw.js             service worker: offline fallback, static cache, push display
  offline.html      branded offline page
```

Security headers (CSP in production, HSTS, frame/COOP, permissions policy) live in `next.config.ts`. Login, OTP, password-change and withdrawal attempts are throttled in `src/lib/throttle.ts`.

---

## Verification

`npx tsc --noEmit` and `npm run lint` are kept clean; `npm run build` compiles all routes. The flows above were exercised end to end in a browser against the Supabase database: signup/login in all three roles, profile edits, certification uploads, booking lifecycle, contact form → admin inbox, blog compose → publish → live article, messaging, wallet views, and the admin user/booking/payment screens. The M-Pesa callbacks follow the documented Daraja contract but need sandbox credentials to run live.
