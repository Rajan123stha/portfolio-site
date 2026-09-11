# Portfolio + CMS

Personal portfolio for Rajan Shrestha, backed by a self-hosted admin panel.
Every word, image, link and section on the public page is editable at `/admin` —
nothing is hardcoded in components any more.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind + shadcn/ui
· Neon Postgres · Drizzle ORM · Cloudinary

---

## Setup

### 1. Install

```bash
pnpm install
```

### 2. Create a database

Sign up at [neon.tech](https://neon.tech), create a project, and copy the
**pooled** connection string from the dashboard.

### 3. Configure

`.env.local` already exists with a generated `AUTH_SECRET`. Fill in the rest:

```ini
DATABASE_URL="postgresql://…@…neon.tech/…?sslmode=require"
ADMIN_EMAIL="you@example.com"
ADMIN_PASSWORD="a-passphrase-of-12-plus-characters"
```

Cloudinary is optional — uploads are disabled with an in-app notice until
`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and
`CLOUDINARY_API_SECRET` are set. Images already in `/public` work regardless.

### 4. Create the schema and load content

```bash
pnpm db:migrate   # apply migrations
pnpm db:seed      # load current content + create the admin account
```

The seed carries over everything the site previously hardcoded, including the
four projects that were commented out in the old `projects.tsx` — those are
seeded **hidden**, so you can restore them from the admin panel instead of
digging through git history.

### 5. Run

```bash
pnpm dev
```

Public site at `/`, admin at `/admin`.

---

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` | Production build (typechecks + lints — both fail the build) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm db:generate` | Generate a migration after editing `db/schema.ts` |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:seed` | Seed content (idempotent — skips tables that already have rows) |
| `pnpm db:reset` | Wipe content tables and reseed (keeps your admin account and messages) |
| `pnpm db:studio` | Drizzle Studio, a GUI over the database |

---

## Architecture

```
db/
  schema.ts          20 tables — the single source of truth
  migrations/        generated SQL, committed
  seed.ts            bootstraps content; safe to re-run
lib/
  queries/public.ts  cached reads for the public site
  queries/admin.ts   uncached reads for the admin panel
  actions/           server actions — every one auth-guarded + Zod-validated
  validators/        Zod schemas shared by client forms and server actions
  auth/              password hashing, JWT sessions, requireAdmin guard
  design-tokens.ts   icon + colour registries
app/
  (site)/            public page (server component)
  admin/login/       standalone, outside the authenticated shell
  admin/(dashboard)/ the CMS
components/
  sections/          public sections — presentational, props-driven
  layout/            header + footer
  admin/             admin shell and form primitives
```

### Decisions worth knowing

**Icons and colours are stored as token keys, not class names.** Tailwind only
emits classes it can find as literals in source, so a class assembled from a
database value (`` `bg-${row.color}-500` ``) would silently render unstyled in
production. `lib/design-tokens.ts` maps stored keys onto literal classes.

**The site never renders empty.** `lib/content/defaults.ts` holds the original
static copy as a typed fallback. Precedence is deliberate:

- **Singletons** (profile, settings) fall back only when the row is *absent*.
  Once it exists your values are used verbatim, blanks included — otherwise
  clearing a field would make the old copy reappear.
- **Collections** fall back only when *entirely empty*. A partially filled list
  is never topped up with starter entries.
- **Database unreachable?** The page serves defaults and logs the error rather
  than returning a 500. The fallback is applied outside `unstable_cache`, so a
  transient outage is never cached.

The trade-off: emptying a collection completely brings the defaults back. To
remove a section for good, switch it off under **Section headers** — visibility
always wins over the fallback. The admin dashboard flags which areas are still
showing bundled content.

**Analytics are first-party.** `/api/track` records page views into your own
Postgres; the dashboard reads them directly. Google Analytics can still run
alongside it (Settings & SEO), but reading GA's numbers back out needs the Data
API and a service account, and the data never reaches the admin panel.

Nothing identifying is stored — no IP, no cookie, no fingerprint. Unique
visitors are counted with an HMAC of IP + user-agent keyed with a salt that
**rotates daily**, so counts are accurate within a day and the same person is
unlinkable across days. Referrers are reduced to the bare host (`google.com`,
never the search query), obvious bots are dropped, `Do Not Track` is honoured,
and `/admin` traffic is excluded so your own sessions don't distort the figures.

**Two read layers.** The public site reads through `unstable_cache` and is
invalidated by tag when the admin saves, so a warm request never touches
Postgres. The admin reads directly — an editor must see hidden rows and their
own change immediately, so caching there would be actively wrong.

**The public page renders dynamically.** Static generation would require live
database credentials at build time, meaning a transient outage or a preview
deploy without secrets fails the build. Since `unstable_cache` already removes
the database round-trip, dynamic rendering costs effectively nothing and makes
`revalidateTag` the single invalidation mechanism.

**Sessions are stateless JWTs with a revocation counter.** `middleware.ts` runs
on the Edge and can only verify the signature — enough to keep anonymous
traffic out. `requireAdmin()` then re-checks `tokenVersion` against the
database, which is what makes "sign out everywhere" and post-password-change
invalidation actually work.

**Uploads go browser → Cloudinary directly**, using a short-lived signature
minted server-side. An 8MB image never passes through a serverless function.

---

## Deploying

Push to GitHub and import into Vercel. Set every variable from `.env.example`
in the Vercel project settings, and set `NEXT_PUBLIC_SITE_URL` to the real
domain so Open Graph URLs resolve correctly.

Run `pnpm db:migrate` against production once before the first deploy.
`ADMIN_EMAIL` / `ADMIN_PASSWORD` are only read by the seed script — leave them
out of the deployed environment once the account exists.

## AI assistant

The public "Ask about me" chat answers only from published content, cites a
source for every claim and flags details it can't verify. It stays hidden until
a provider key is set (`AI_PROVIDER`, `AI_API_KEY` — Gemini's free tier works)
and it's switched on under **Admin → AI assistant**.

Because it's a public endpoint that spends a quota, it sits behind layered
limits: per-visitor and site-wide rate limits, a daily token budget, cached
answers for suggested questions, and an optional Cloudflare Turnstile bot
check. **Before going live, read [`docs/ai-assistant-security.md`](docs/ai-assistant-security.md)**
— it has the production checklist and a command to test each safeguard.
