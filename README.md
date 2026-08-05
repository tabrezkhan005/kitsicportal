# KITSIC Dashboard

Member and operations platform for the KITS Innovation Club.

This is a **dashboard-only** Turborepo for club members, heads, and leadership.

## Stack

- Next.js 16 · React 19 · TypeScript
- Turborepo monorepo
- Supabase Auth + PostgreSQL + RLS
- Drizzle ORM
- Tailwind CSS v4 · shadcn-style UI · Framer Motion

## Structure

```
apps/dashboard/          # Next.js dashboard app
packages/
  auth/                  # Supabase SSR + RBAC
  database/              # Drizzle schema, migrations, seed
  ui/                    # Design system + components
  types/                 # Shared TypeScript types
  utils/                 # Helpers + error classes
  hooks/                 # Shared React hooks
  config/                # TSConfig presets
```

## Setup

### 1. Environment

Copy `.env.example` to `apps/dashboard/.env.local`:

```bash
cp .env.example apps/dashboard/.env.local
```

Fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Database migration

Run the foundation SQL in the **Supabase SQL Editor**:

```
packages/database/supabase/migrations/0001_foundation.sql
```

Or via CLI from the repo root (requires `DATABASE_URL` in env):

```bash
npm run db:migrate
npm run db:seed
```

### 3. Supabase Auth

In your Supabase dashboard:

- Enable **Email**, **Google**, and **Magic Link** providers
- Set Site URL: `http://localhost:3000`
- Add redirect URL: `http://localhost:3000/auth/callback`

### 5. Demo accounts

```bash
npm run db:seed:demo
```

| Email | Role | Password |
|-------|------|----------|
| president@demo.kitsic | President | `KitsicDemo2026!` |
| vicepresident@demo.kitsic | Vice President | `KitsicDemo2026!` |
| secretary@demo.kitsic | Secretary | `KitsicDemo2026!` |
| treasurer@demo.kitsic | Treasurer | `KitsicDemo2026!` |
| techhead@demo.kitsic | Technical Head | `KitsicDemo2026!` |
| socialhead@demo.kitsic | Social Media Head | `KitsicDemo2026!` |
| resourcehead@demo.kitsic | Resource Head | `KitsicDemo2026!` |
| logisticshead@demo.kitsic | Logistics Head | `KitsicDemo2026!` |
| studentlead@demo.kitsic | Student Lead | `KitsicDemo2026!` |
| member@demo.kitsic | Member | `KitsicDemo2026!` |

Demo accounts also appear on the login page in development mode.

### 6. Run locally

```bash
npm install
npm run dev
```

Dashboard runs at [http://localhost:3000](http://localhost:3000).

## Roles

Database-driven RBAC with 10 roles: President, Vice President, Secretary, Treasurer, Technical Head, Social Media Head, Resource Head, Logistics Head, Student Lead, Member.

Permissions are checked server-side on every protected page. The sidebar is generated dynamically from the user's permissions.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dashboard dev server |
| `npm run build` | Production build |
| `npm run db:migrate` | Run SQL migrations |
| `npm run db:seed` | Seed roles, permissions, navigation |
| `npm run db:seed:demo` | Create demo users for all roles |

## Roadmap

- **Phase 2** — Core ops: members, tasks, meetings, QR attendance, notifications
- **Phase 3** — Google Workspace integration
- **Phase 4** — Analytics, performance profiles, AI assistants
- **Phase 6** — Public API for external website integration
