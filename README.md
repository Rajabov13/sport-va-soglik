# QO‘LLAB — *Yaxshilikni birlashtiramiz.*

**QO‘LLAB** is a social help platform for Uzbekistan that connects people who need help, volunteers,
and social organizations — and turns every request into a delivered, measurable result.

> *Har bir yaxshilik oʻz manzilini topsin.* — Every act of kindness should find its address.

```
Request ─▶ automated checks ─▶ VERIFIED ─▶ smart matching ─▶ volunteer accepts ─▶ chat
        ─▶ IN_PROGRESS ─▶ volunteer marks done ─▶ requester confirms ─▶ COMPLETED
        ─▶ review ─▶ reputation / XP / achievements ─▶ live impact statistics
```

---

## Contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Architecture](#architecture)
4. [Getting started](#getting-started)
5. [Environment variables](#environment-variables)
6. [Database, migrations & seed](#database-migrations--seed)
7. [Demo accounts & demo scenario](#demo-accounts--demo-scenario)
8. [Testing](#testing)
9. [Build & deploy](#build--deploy)
10. [API reference](#api-reference)
11. [Security](#security)
12. [Troubleshooting](#troubleshooting)

---

## Features

| Area | What works |
|---|---|
| **Accounts** | Email/password registration & login (bcrypt), httpOnly DB-backed sessions, logout, password change (revokes other sessions), Google OAuth (code flow, enabled by env vars), one-click demo accounts |
| **Roles** | `USER`, `VOLUNTEER`, `ORGANIZATION`, `ADMIN` — every permission is enforced on the server |
| **Requests** | Create / edit / draft / publish / cancel, 9 categories, 4 urgency levels, map pin + city, preferred date, photos (up to 5), contact preferences, people helped, estimated hours |
| **Lifecycle** | Strict state machine `DRAFT → PENDING → VERIFIED → MATCHING → ACCEPTED → IN_PROGRESS → COMPLETED` (+ `CANCELLED`, `REJECTED`), full status history timeline |
| **Moderation** | Automated pre-moderation (suspicious content, link spam, flooding, duplicates, reported users) — clean requests are auto-verified, flagged ones wait for an admin |
| **Smart matching** | Transparent rule-based score 0–100: location 30 + skills 25 + availability 15 + urgency 10 + experience 10 + reputation 10, with per-factor breakdown. Pluggable `MatchingStrategy` interface for a future ML model |
| **Volunteers** | Profile with skills, categories, radius, base location, preferred cities, weekly availability, "available now" toggle, suggested requests with match %, task list, public profile with reviews and badges |
| **Chat** | Private conversation per accepted request: messages, image attachments, unread counts, read receipts, typing indicator, report conversation. Polling transport behind one hook (ready for SSE/WebSocket) |
| **Notifications** | In-app notification center (new match, accepted, status changed, new message, completion requested, completed, new review, achievement, moderation, organization & campaign updates) + email channel (console / Resend) |
| **Gamification** | XP, levels, 6 badges (First Help, 10 Helps, Community Hero, Fast Responder, Reliable Volunteer, 100 Hours), leaderboard |
| **Organizations** | Dashboard with own statistics & charts, social campaigns (create / complete), volunteer team management (approve / remove), organization profile, public page |
| **Map** | Leaflet map of requests, volunteers and organizations with distinct markers, preview popups, filters (category, urgency, status, distance, near me). Locations are coarsened to ≈1 km for privacy |
| **Impact dashboard** | Live numbers from the database (requests, completed, volunteers, people helped, organizations, avg. response, success rate, hours, impact points) + Recharts charts with accessible table view |
| **Admin** | Overview, users (suspend / activate / verify / change role / delete), requests (approve / reject / re-match / delete), organizations (verify / reject / suspend), reports (resolve with optional suspension & content removal / dismiss), analytics, categories CRUD, audit log |
| **i18n** | Uzbek (default), Russian, English — all UI strings in translation files, switch language without reload |
| **PWA** | Manifest, icons (incl. maskable), theme colours, install prompt, offline fallback page; the service worker never caches API/auth |
| **SEO** | Metadata, OpenGraph, Twitter cards, favicon, `robots.txt`, `sitemap.xml` |

## Tech stack

- **Next.js 15** (App Router, Route Handlers, Server Components) · **React 19** · **TypeScript**
- **Tailwind CSS** with shadcn/ui-style components on **Radix UI** primitives · **Framer Motion** · **Lucide** icons
- **TanStack Query** · **React Hook Form** + **Zod** (shared client/server schemas)
- **Recharts** (charts) · **Leaflet / react-leaflet** (maps, keyless tiles by default)
- **SQLite** (embedded file database — no database server or external service) + **Prisma ORM**
- **Vitest** (unit + API integration) · **Playwright** (end-to-end)

## Architecture

```
src/
├── app/                      # Routes (App Router)
│   ├── (public)/             # Landing, map, organizations, campaigns, impact, volunteer profiles
│   ├── auth/                 # Login, register
│   ├── dashboard/            # Role-aware user / volunteer / organization area
│   ├── admin/                # Admin panel
│   └── api/                  # REST API (thin Route Handlers)
├── server/                   # Server-only code
│   ├── auth/                 # Sessions, password hashing, RBAC permissions, Google OAuth
│   ├── http/                 # Route wrapper (auth, roles, CSRF, rate limit, error mapping)
│   ├── domain/               # Pure business rules: state machine, gamification, moderation, classifier
│   ├── services/             # Use cases: requests, matching, conversations, stats, admin, …
│   │   └── matching/         # MatchingStrategy interface + rule-based implementation
│   ├── storage/              # Upload validation + local disk storage
│   ├── email/                # Email channel abstraction
│   └── ai/                   # Optional Gemini classification with keyword fallback
├── schemas/                  # Zod schemas shared by forms and API
├── features/                 # Feature UI (requests, map, messages, admin, impact, …)
├── components/               # UI primitives (ui/), layout, shared building blocks
├── i18n/                     # Dictionaries (uz, ru, en), server + client translators
├── hooks/  lib/  config/  types/
prisma/                       # Schema, migrations, realistic seed data
tests/                        # unit/, api/, e2e/
```

**Request handling.** Every API route is wrapped by `authRoute` / `publicRoute`
(`src/server/http/api.ts`): it resolves the session from the httpOnly cookie, checks the role,
rejects cross-site writes, applies rate limits, validates input with Zod and maps errors to
`{ error: { code, fieldErrors } }` — codes are i18n keys, so internals never reach the user.
Business logic lives in services; permission checks on resources (ownership, assignment) happen there.

**Matching** (`src/server/services/matching`). On publish, the engine scores all active volunteers,
stores the top 10 as `RequestMatch` rows with their breakdown, and notifies the top 5. Accepting a
request is a single conditional `UPDATE … WHERE status IN (VERIFIED, MATCHING)` inside a transaction,
so only one volunteer can win a race.

**Data model** (`prisma/schema.prisma`): `User`, `Session`, `Account`, `Profile`, `VolunteerProfile`,
`VolunteerCategory`, `VolunteerAvailability`, `VolunteerPreferredLocation`, `Organization`,
`OrganizationMember`, `Campaign`, `CampaignParticipant`, `Category`, `Location`, `Request`,
`RequestImage`, `RequestMatch`, `RequestAssignment`, `RequestStatusHistory`, `Conversation`,
`ConversationParticipant`, `Message`, `MessageAttachment`, `Notification`, `Review`, `Achievement`,
`UserAchievement`, `Report`, `AuditLog` — with relations, indexes and `createdAt` / `updatedAt` /
`deletedAt` (soft delete) where it matters.

## Getting started

Requirements: **Node.js ≥ 20**. Nothing else — no database server, no Supabase, no external services.

```bash
git clone <repo> && cd <repo>
npm install
cp .env.example .env                  # optional locally; set SESSION_SECRET in production
npm run dev                           # creates prisma/qollab.db with demo data on first run → http://localhost:3000
```

## Environment variables

All variables are documented in [`.env.example`](.env.example). The essentials:

| Variable | Required | Purpose |
|---|---|---|
| `SESSION_SECRET` | ✅ prod | ≥ 32 random chars, signs session token digests and OAuth state |
| `APP_URL` | ✅ prod | Public URL (OAuth callback, emails, sitemap, origin checks) |
| `DEMO_MODE` | – | `true` enables one-click demo accounts |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | – | Google sign-in |
| `UPLOAD_DIR` | – | Folder for uploaded photos (default `./storage/uploads`, `/tmp` on Vercel) |
| `EMAIL_PROVIDER`, `RESEND_API_KEY`, `EMAIL_FROM` | – | Email notifications |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | – | Distributed rate limiting |
| `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL` | – | AI-assisted category/urgency suggestion — primary model, then a lighter fallback model on overload, then the keyword classifier |
| `NEXT_PUBLIC_MAP_TILE_URL` | – | Custom map tiles (e.g. MapTiler with key) |

Integrations without keys degrade gracefully: no Google button errors (a friendly message is shown),
uploads go to local disk, emails are logged, rate limiting is in-memory, classification uses keywords,
the map uses free CARTO/OSM tiles.

## Database, migrations & seed

The database is a single SQLite file, `prisma/qollab.db` (git-ignored). It is created automatically:
`npm run dev` and `npm run build` run `db:setup`, which applies the migrations and loads the demo data
when the database is empty. Existing data is never overwritten by these commands.

```bash
npm run db:setup       # apply migrations + load demo data if the database is empty
npm run db:seed        # WIPES the database and reloads fresh demo data
npm run db:migrate     # development: create a new migration after changing prisma/schema.prisma
```

The seed creates realistic, fictional data for Uzbekistan: 9 categories, 14 cities, 30 requesters,
15 volunteers (with skills, availability and reputation), 6 organizations (5 verified, 1 pending),
6 campaigns, 46 requests in every status, assignments, conversations with messages, reviews,
achievements, notifications, reports and audit entries. Matching is computed by the real engine.

## Demo accounts & demo scenario

All seeded accounts use the password from `DEMO_PASSWORD` (default **`Demo12345!`**).
With `DEMO_MODE=true` the login page also offers one-click buttons, and demo users can switch
persona from the avatar menu.

| Role | Email |
|---|---|
| Requester | `demo.user@example.com` |
| Volunteer | `demo.volunteer@example.com` |
| Organization | `demo.org@example.com` |
| Admin | `demo.admin@example.com` |

**Pitch flow (≈2 minutes)** — also shown as a checklist on the demo dashboards:

1. **Requester** → *New request* → Medicine, *Critical*, Tashkent, pin on map → **Publish**.
   The request is auto-verified and matched instantly.
2. The request page shows **Smart matching** with each volunteer's score and breakdown
   (the demo volunteer *Jasur Rahimov* is the best match).
3. Avatar menu → switch to **Volunteer** → the request is in *Suggested for you* → **Accept** → **Start**.
4. **Mark as done** with hours spent.
5. Switch back to **Requester** → **Confirm completion** → celebration shows the XP and the
   volunteer's new **"10 Helps"** badge → **Leave a review**.
6. Open **Impact** — completed requests, people helped, hours and "helped today" have updated.

Demo numbers come from the seeded database and are labelled *Demo data* in the UI while `DEMO_MODE=true`.

## Testing

```bash
npm run typecheck      # TypeScript
npm run lint           # ESLint
npm test               # Vitest: unit + API integration (own throwaway SQLite file)
npm run build && npm run test:e2e   # Playwright against `next start` (own throwaway SQLite file)
```

- **Unit** (`tests/unit`): matching algorithm, validation schemas, RBAC & resource permissions,
  state machine, gamification, moderation, classifier, upload validation, tokens, redirects, rate limiter.
- **API integration** (`tests/api`): call the real Route Handlers against a real SQLite database — registration,
  login/logout, CSRF rejection, suspended users, the full request lifecycle (matching, concurrent accept
  race, chat privacy, state-machine order, confirmation, reputation, achievements, reviews, live stats),
  withdrawal, authorization (admin APIs, role restrictions, ownership, private data, drafts), moderation
  and reports.
- **E2E** (`tests/e2e`): register → logout → login, invalid login errors, create urgent request with
  matching, volunteer accept/start/complete, requester confirm + achievement + review, impact &
  achievements pages, admin access control, 404, and a mobile (Pixel 7) horizontal-overflow sweep.

CI: `.github/workflows/ci.yml` runs lint, typecheck, Vitest, the production build and Playwright.

Tests create their own databases (`.tmp/test.db`, `.tmp/e2e.db`); the app database is never touched.

Playwright needs a Chromium build (`npx playwright install chromium`, or set `CHROMIUM_PATH`).

### QA scripts

With the app running (`npm run dev` or `npm start`) and seeded:

```bash
bash scripts/flow-check.sh            # API smoke test of the whole demo flow
node scripts/page-sweep.mjs '<ids-json>'  # visits every page per role: HTTP status, JS errors, horizontal overflow
GEMINI_API_KEY=… npx tsx scripts/ai-check.ts  # live check of the optional Gemini classifier
```

## Build & deploy

```bash
npm run build          # prisma generate + next build
npm start              # production server
```

### Vercel

1. Import the repository in Vercel (no database or storage integrations needed).
2. Set `SESSION_SECRET` (32+ random characters), `APP_URL` (your `https://…` address) and `DEMO_MODE=true`
   for the demo. Optional: `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID/SECRET`, `RESEND_API_KEY`.
3. Deploy. `npm run build` creates the SQLite database with demo data and ships it with the app.

**Important limitation:** Vercel's filesystem is read-only and serverless instances are short-lived.
The database is copied to `/tmp` on each cold start, so changes made on the live site (new users,
requests, messages, uploads) are **temporary**: they disappear when Vercel recycles the instance
(usually after some idle minutes) and are not shared between parallel instances. Every redeploy starts
again from fresh demo data. This is fine for a hackathon demo; for permanent data use a host with a
persistent disk (below).

### Any Node host / VPS / Docker (data persists)

```bash
npm ci && npm run build && npm start
```

Keep `prisma/qollab.db` and `storage/uploads/` on a persistent disk (e.g. a Render/Railway volume or a VPS).
Health check: `GET /api/health`.

## API reference

All endpoints return `{ data }` or `{ error: { code, fieldErrors? } }`.

| Method & path | Who | Purpose |
|---|---|---|
| `POST /api/auth/register` · `login` · `logout` · `demo` | public | Account & session |
| `GET /api/auth/me` | any | Current user |
| `GET /api/auth/google` → `/callback` | public | Google OAuth |
| `GET/POST /api/requests` | auth | List (`scope=mine/open/all`, filters, search, sort, pagination) / create |
| `GET/PATCH/DELETE /api/requests/:id` | owner / admin | Detail (role-aware projection), edit, delete draft |
| `POST /api/requests/:id/{submit,accept,start,complete,confirm,withdraw,decline,cancel,review}` | per action | Lifecycle |
| `GET /api/requests/matches` · `GET /api/volunteer/tasks` | volunteer | Suggestions / own tasks |
| `GET/PUT/PATCH /api/volunteer/profile` · `GET /api/volunteers/:id` | volunteer / public | Volunteer profile |
| `POST /api/uploads` · `DELETE /api/uploads/:id` · `GET /api/files/*` | auth | Images (magic-byte validated, 5 MB) |
| `GET /api/conversations` · `GET/POST …/:id/messages` · `POST …/:id/{attachments,read,typing}` | participants | Chat |
| `GET/POST /api/notifications` · `GET /api/notifications/summary` | auth | Notification center, badge counts |
| `POST /api/reports` | auth | Report request / user / conversation / message |
| `GET/PUT /api/settings` · `PUT /api/settings/password` · `POST /api/settings/locale` | auth | Settings |
| `GET /api/stats` · `/leaderboard` · `/map` · `/categories` · `/locations` | public | Impact, leaderboard, map data, reference data |
| `POST /api/ai/classify` | auth | Category/urgency suggestion |
| `GET /api/organizations` · `POST /api/organizations/:id/join` | public / volunteer | Organizations |
| `GET/PUT /api/organization` · `GET/POST /api/organization/members[/:id]` | organization | Own organization & team |
| `GET/POST /api/campaigns` · `GET/PATCH /api/campaigns/:id` · `POST/DELETE …/join` | public / org / volunteer | Campaigns |
| `GET /api/admin/{overview,stats,users,requests,organizations,reports,categories,audit}` | admin | Admin data |
| `POST /api/admin/{users,requests,organizations,reports}/:id` · `PUT/DELETE /api/admin/categories/:id` | admin | Admin actions |
| `GET /api/health` | public | Liveness + DB check |

## Security

- Passwords hashed with **bcrypt** (cost 12); login timing does not reveal whether an email exists.
- Sessions: random 256-bit tokens in **httpOnly, SameSite=Lax, Secure (prod)** cookies; only HMAC digests
  are stored; suspension, deletion and password changes revoke sessions.
- **RBAC on the server** for every route and resource; the client role is never trusted
  (self-registration cannot create admins).
- **CSRF**: SameSite cookies + Origin / `Sec-Fetch-Site` checks on every state-changing request.
- **Validation** with Zod on client and server; SQL injection prevented by Prisma (raw SQL is parameterized).
- **XSS**: React escaping, no `dangerouslySetInnerHTML` with user content, strict CSP and security headers
  (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS in production).
- **Uploads**: type detected from magic bytes (JPEG/PNG/WebP only), 5 MB limit, random server-side keys,
  path-traversal-safe serving, `nosniff` + sandboxing CSP, private chat attachments.
- **Rate limiting** on auth, registration, writes, request creation, uploads, messages and reports
  (in-memory or Upstash Redis).
- Privacy: exact addresses and phone numbers only for the requester, the assigned volunteer and admins;
  map and public views use coordinates coarsened to ≈1 km; match lists are visible only to the requester and admins.
- Open-redirect protection on `next` parameters, signed OAuth state, audit log for admin actions.

## Troubleshooting

| Problem | Fix |
|---|---|
| Empty site / missing demo data | Run `npm run db:setup` (or `npm run db:seed` to reset the demo data) |
| `SESSION_SECRET must be set…` in production | Set a 32+ character `SESSION_SECRET` |
| Grey map without tiles | The tile server is unreachable (offline / firewall) or `NEXT_PUBLIC_MAP_TILE_URL` is wrong; markers and filters still work |
| Data disappears on Vercel | Expected: the Vercel filesystem is temporary — use a host with a persistent disk for permanent data |
| "Google sign-in is not configured" | Set `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` and the redirect URI |
| Demo buttons missing / `demoDisabled` | Set `DEMO_MODE=true` and run `npm run db:seed` |
| "Too many attempts" while testing | Rate limits are per IP; wait a minute or set `DISABLE_RATE_LIMIT=true` locally |
| E2E: browser not found | `npx playwright install chromium` or set `CHROMIUM_PATH` |
