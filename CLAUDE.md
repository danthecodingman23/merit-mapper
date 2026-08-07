# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app does

MeritMapper is an AI-powered scholarship matching app. Students fill out a profile, the app fetches all scholarships from Supabase, then calls Claude (forced tool use) to score and rank each scholarship for that student. Results are shown ranked by match score.

## Commands

```bash
# Frontend (needs PORT and BASE_PATH env vars — Replit sets these automatically)
pnpm --filter @workspace/merit-mapper run dev

# API server (Replit/local only — not used on Vercel)
pnpm --filter @workspace/api-server run dev

# Typecheck everything
pnpm run typecheck

# Build everything
pnpm run build

# Vercel-specific frontend build
pnpm --filter @workspace/merit-mapper run build:vercel

# Regenerate API hooks + Zod schemas from OpenAPI spec (run after editing openapi.yaml)
pnpm --filter @workspace/api-spec run codegen

# Push DB schema to Postgres (dev only)
pnpm --filter @workspace/db run push
```

There is no test suite configured.

## Required environment variables

| Variable | Where used |
|---|---|
| `PORT` | Frontend Vite dev server |
| `BASE_PATH` | Frontend Vite dev server base path |
| `VITE_SUPABASE_URL` | Frontend — Supabase client; also read by all serverless/Express API routes |
| `VITE_SUPABASE_ANON_KEY` | Frontend — Supabase client; also used by scholarship save/unsave/saved routes |
| `ANTHROPIC_API_KEY` | `/api/match` (API server + Vercel serverless function) |
| `DATABASE_URL` | API server + `lib/db` Drizzle connection |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side DB writes — scholarship save/unsave/saved, report-link, contact, and all admin routes |
| `RESEND_API_KEY` | `/api/contact` — sends the contact-form email via Resend |
| `ADMIN_PASSWORD` | Gates all `/api/admin/*` routes and the `/admin` page |

## Architecture

This is a pnpm workspace monorepo with two deployment targets that share source:

### Packages

- **`artifacts/merit-mapper/`** — React SPA (Vite, React 19, TanStack Query, wouter, Tailwind v4, shadcn/ui)
- **`artifacts/api-server/`** — Express 5 API server, used on Replit only (port 5000); built with esbuild to CJS
- **`artifacts/mockup-sandbox/`** — standalone UI design sandbox, not part of the main app
- **`lib/api-spec/`** — OpenAPI YAML — source of truth for all API contracts
- **`lib/api-client-react/`** — generated TanStack Query hooks (do not edit manually)
- **`lib/api-zod/`** — generated Zod validators (do not edit manually)
- **`lib/db/`** — Drizzle ORM schema + Postgres client (`DATABASE_URL`)

### Two deployment targets

**Replit**: The frontend (`artifacts/merit-mapper`) proxies `/api/*` to the Express server (`artifacts/api-server`) running on port 5000.

**Vercel**: The frontend builds as a static site (`build:vercel`). The Express server is not used; instead each API endpoint is a plain-JS Vercel serverless function under `artifacts/merit-mapper/api/` (Node.js 22, 60s timeout). These are hand-written duplicates of the Express routes — **keep the two in sync when changing any API logic.** Current functions:

- `api/match.js` — scholarship matching (mirrors `api-server` `match.ts`)
- `api/scholarships/{save,saved,unsave}.js` — saved-scholarship CRUD (mirrors `scholarships.ts`); Express-only, no Vercel-only logic diverges
- `api/report-link.js` — report a broken scholarship link
- `api/contact.js` — save contact message to Supabase + email via Resend
- `api/admin/{users,delete-user,update-scholarship,delete-scholarship,feedback,reported-links}.js` — admin dashboard backend, all gated by `ADMIN_PASSWORD`

The `report-link`, `contact`, and `admin/*` functions are **Vercel-only** — there is no Express equivalent for them.

### Data flow for scholarship matching

1. `/profile` page calls `useScholarships()` to fetch all rows from the Supabase `scholarships` table
2. On form submit, the profile + scholarship list are POST'd to `/api/match`
3. The match handler calls `claude-sonnet-4-6` with `tool_choice: { type: "tool", name: "return_match_results" }` — Claude is forced to return structured JSON; there is no free-text fallback
4. Results are stored in `MatchContext` (in-memory React state) and the user is navigated to `/results`

### API codegen contract

`lib/api-spec/openapi.yaml` → Orval → `lib/api-client-react/src/generated/` (React Query hooks) and `lib/api-zod/src/generated/` (Zod schemas). The OpenAPI title must stay `"Api"` — changing it breaks generated import paths. Run `codegen` after every spec change; never edit generated files directly.

### Frontend routing (wouter)

| Path | Auth | Page |
|---|---|---|
| `/` | public | Landing |
| `/login` | public | Supabase email/password login |
| `/signup` | public | Supabase signup |
| `/profile` | protected | Student profile form + match trigger |
| `/results` | protected | Ranked scholarship results |
| `/saved` | protected | User's saved scholarships |
| `/reset-password` | public | Password reset (forgot-password flow) |
| `/privacy` | public | Privacy policy |
| `/contact` | public | Contact form (posts to `/api/contact`) |
| `/admin` | password | Admin dashboard (gated by `ADMIN_PASSWORD`, not Supabase auth) |

Auth state lives in `AuthContext` (Supabase `onAuthStateChange`). The Supabase client in `src/lib/supabase.ts` is lazy — it throws only on first property access if env vars are missing, preventing a blank screen on misconfigured deploys.

### DB schema

`lib/db/src/schema/index.ts` is currently a placeholder with no tables defined. All tables live in Supabase directly (not managed by Drizzle); Drizzle is wired up for future use. Supabase tables include `scholarships` (created outside the repo) plus `profiles` and `saved_scholarships`, whose schema/RLS lives in `artifacts/merit-mapper/supabase/migrations/` (`001_create_profiles.sql`, `002_create_saved_scholarships.sql`). Contact messages and link reports are also stored in Supabase tables written by the service-role API routes.

## Package manager

This workspace requires pnpm. Running `npm install` or `yarn` will exit with an error. New package versions must be at least 1 day old before pnpm will install them (supply-chain protection — see `pnpm-workspace.yaml`).
