# Caregiver 🇰🇪 — Home Care & Management Platform

Kenya's marketplace for hiring **verified nannies, home managers, elder-care workers and wellness/massage professionals** — with a full worker portal, booking workflow, admin dashboard and marketing blog.

Built with **Next.js 15 (App Router) · Prisma/PostgreSQL · NextAuth v5 · Supabase Storage · Tailwind CSS v4**.

---

## ✨ Features

| Area | What's included |
| --- | --- |
| **Landing page** | Teal/navy Kenya-focused hero, live search, category chips, featured caretakers, how-it-works, testimonials, FAQ preview, blog preview, CTA |
| **Directory** | `/caretakers` with location, max-rate (KES), first-aid/massage and category filters |
| **Profiles** | `/caretakers/[id]` — navy hero band, badges, services & rates, certifications with PDF/image previews, booking form |
| **Auth** | Email+password (bcrypt) and phone OTP, NextAuth v5 JWT sessions, role-based middleware (CLIENT / WORKER / ADMIN), login & OTP throttling |
| **Worker portal** | `/worker` — profile & KES rates editor, avatar upload, certification upload/delete |
| **Bookings** | Create → accept / complete / cancel with server-side role checks |
| **Dashboard** | `/dashboard` role-aware stat cards, booking cards, "Karibu" greeting |
| **Admin** | `/admin` overview stats, `/admin/posts` composer with draft/publish, `/admin/messages` inbox |
| **Blog** | SEO'd public blog with safe markdown renderer + BlogPosting JSON-LD |
| **Standard pages** | About, FAQ (FAQPage JSON-LD), Contact (DB-backed + honeypot), Privacy, Terms |
| **SEO** | `robots.ts`, `sitemap.ts`, `opengraph-image.tsx` (OG card), Organization/WebSite JSON-LD, per-page metadata + canonicals |
| **Theming** | Light & dark modes, no-flash inline theme script, `ThemeToggle` |
| **Mobile-first** | Fixed bottom nav with safe-area padding, KES formatting, responsive components throughout |
| **i18n feel** | Kenya-market copy (Karibu, Asante sana), KES rates, Nairobi locations |

Seeded content includes real avatar photos, sample certification PDFs and six SEO blog posts.

---

## 🧑‍💼 Seeded admin account

```
email:    caregiver@info.com
password: Mtemi@254#
```

Other seeded accounts:

| Role | Email | Password |
| --- | --- | --- |
| Client | `jane@client.app` / `brian@client.app` | `Client123!` |
| Worker | `amina@caretaker.app` (+ 7 more) | `Worker123!` |

---

## 🛠 Local setup

```bash
npm install
cp .env.example .env      # fill in the values (see table below)
npx prisma migrate deploy # apply migrations
npm run db:seed           # seed Kenya demo data
npm run dev               # http://localhost:3000
```

Scripts: `dev` · `build` · `start` · `lint` · `typecheck` · `db:migrate` · `db:deploy` · `db:seed` · `db:studio`.

---

## 🔐 Environment variables

Set these in `.env` locally and in **Vercel → Project → Settings → Environment Variables** (Production, Preview, Development):

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (Supabase pooler, port **5432**, `sslmode=require`) |
| `AUTH_SECRET` | NextAuth JWT signing secret (`openssl rand -base64 32`) |
| `AUTH_TRUST_HOST` | `true` behind Vercel/proxies |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key used by `/api/upload` |
| `STORAGE_BUCKET` | e.g. `caregiver-uploads` (public bucket, 5 MB, pdf/png/jpeg/webp) |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL — drives metadata, sitemap, robots, OG images |

> `.env` is gitignored; `.env.example` lists every key with a placeholder.

If Supabase Storage env vars are missing, the app falls back to a local `.uploads/` directory served by `/api/files/[...path]` — handy for local dev without keys.

---

## ☁️ Deploying to Vercel

1. Push this repo to GitHub.
2. In [Vercel](https://vercel.com/new), **Import** the repo — the included [`vercel.json`](./vercel.json) runs `prisma generate && prisma migrate deploy && next build`, so migrations apply automatically on each deploy.
3. Add the eight env vars above. For `NEXT_PUBLIC_SITE_URL` use your production domain (e.g. `https://caregiver.vercel.app`).
4. Deploy. First deploy creates/updates the schema; then seed once from your machine:
   ```bash
   DATABASE_URL="<production-url>" npm run db:seed
   ```
   (Seeding is idempotent-ish but safe to run once per environment.)
5. Set the **Production** domain and confirm `NEXT_PUBLIC_SITE_URL` matches it — OG images, sitemap and canonicals depend on it.

**Post-deploy checklist**

- `/` renders with meta description + Organization/WebSite JSON-LD
- `/sitemap.xml` lists all URLs, `/robots.txt` points at it
- `/opengraph-image` returns `image/png`
- `/admin` redirects anonymous users to `/login`
- Sign in as `caregiver@info.com` → admin overview
- Upload a certification as a worker (hits Supabase Storage)

---

## 🌩 Cloudflare (Workers / DNS) assistance

**Option A — DNS only (simplest):** keep the app on Vercel, put Cloudflare in front as the DNS provider:

1. Add your domain to Cloudflare, point the nameservers at it.
2. Create a CNAME `caregiver` → `<project>.vercel.app` (Proxy: **DNS only / grey cloud** — Vercel's TLS and `www` handling don't work behind an orange-cloud proxy without extra config).
3. Add the domain in Vercel → Project → Domains and issue the certificate.

**Option B — Cloudflare Worker reverse proxy** (orange cloud, keeps Cloudflare features like WAF, caching, Turnstile):

```js
// wrangler.toml → name = "caregiver-proxy"
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // preserve the original host so Vercel routing/SSL matches
    return fetch(new URL(`https://<project>.vercel.app${url.pathname}${url.search}`), {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: "manual",
    });
  },
};
```

```bash
npm i -g wrangler
wrangler login
wrangler deploy
```

Then create a route in the Cloudflare dashboard: `caregiver.co.ke/*` → the Worker, and set the Worker secret `VERCEL_HOST` if you parameterize the target.

**Gotchas**

- Pass through the `Host` header (or use Vercel's [skew protection / trusted hosts](https://vercel.com/docs/concepts/edge-network/headers)) so Vercel picks the right deployment.
- Turn off Cloudflare's "Rocket Loader" and "Auto Minify" for Next.js — they break hydration scripts.
- `NEXT_PUBLIC_SITE_URL` should stay your public Cloudflare-proxied domain.

---

## 📂 Project structure

```
prisma/
  schema.prisma        # User, Profile, CaretakerDetails, Certification, Booking, BlogPost, ContactMessage
  seed.ts              # Kenya seed: admin, clients, 8 workers, bookings, 6 blog posts
src/
  app/
    page.tsx           # landing
    caretakers/        # directory + [id] profile
    dashboard/ worker/ # role-aware dashboards
    admin/             # overview, posts composer, messages inbox
    blog/ about/ faq/ contact/ privacy/ terms/
    api/               # auth, upload, local file fallback
  components/          # Header, Footer, BottomNav, ThemeToggle, forms, cards…
  lib/
    auth.ts auth.config.ts session.ts otp.ts throttle.ts
    prisma.ts storage.ts markdown.ts format.ts categories.ts
    actions/           # server actions (auth, bookings, profile, contact, blog)
  middleware.ts        # role-based route guarding
  app/globals.css      # Tailwind v4 tokens + component classes (light/dark)
```

---

## ✅ Verification performed

- `npx tsc --noEmit` — clean
- `npm run lint` — 0 errors / 0 warnings
- `npm run build` — 24 routes, production build passes
- Route smoke test on `next start`: all public pages 200; `/admin`, `/dashboard` 307 for anonymous
- E2E in browser: signup → login (client/worker/admin), worker profile + certification upload, booking create/accept/complete/cancel, contact form → DB → admin inbox, admin blog compose → publish → live article, light/dark toggle, mobile 390×844 layout
