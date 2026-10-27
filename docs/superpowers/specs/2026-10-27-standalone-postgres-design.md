# Standalone Postgres + RLS — Design Spec

- Date: 2026-10-27
- Status: Approved by human partner; implementation on `feat/standalone-postgres`
- Supersedes (on this branch): the Supabase implementation on `main`

## Purpose

Run Review Responder without Supabase: Next.js + PostgreSQL + native RLS + local email/password auth. Keep the same UI and features. The schema stays standard Postgres so it can move to Supabase or any managed Postgres later.

## Stack

- Next.js 16 App Router, TypeScript, Tailwind.
- PostgreSQL 16 locally via Docker Compose; any managed Postgres (Neon, Railway, Supabase Postgres) in production.
- `pg` for data access (no ORM).
- `jose` for signed HttpOnly session JWTs.
- `bcryptjs` for password hashing.
- Gemini REST for reply generation.
- Vitest for unit tests.

## Authentication

- Email/password signup and login. No email verification, OAuth, or password reset in v1.
- Passwords hashed with bcrypt (cost 12), never logged.
- Session is an HS256 JWT (`sub` = user id, `email`) in an HttpOnly, SameSite=Lax cookie, 30-day expiry, Secure in production. `AUTH_SECRET` must be at least 32 characters.
- Auth queries go through `security definer` database functions so the application role never reads `users` directly.
- `src/proxy.ts` verifies the JWT and redirects `/app` unauthenticated users to `/login`, and signed-in users away from `/login`.

## Database and RLS

Tables: `users`, `reviews`, `ai_usage` (same columns and limits as the Supabase version).

- RLS is enabled and **forced** on `reviews` and `ai_usage`.
- `app.current_user_id()` returns `nullif(current_setting('app.user_id', true), '')::uuid`.
- Every application query runs through `withUser(userId, fn)`:
  1. acquire a pooled client;
  2. `begin`;
  3. `select set_config('app.user_id', $1, true)`;
  4. run the callback;
  5. `commit` or `rollback`; release the client.
- Without the setting, policies deny all rows. The app role must not be a superuser or have `BYPASSRLS`; `FORCE` covers table owners.
- Policies: users select/insert/delete their own reviews; `ai_usage` select/insert own, delete only rows older than 7 days.

Local role setup: Docker creates a non-superuser `app_user`; migrations run as `postgres` and grant only CRUD + function execution to `app_user`.

Auth functions:

- `app.create_user(email, password_hash) returns (id, email)` — security definer, unique email.
- `app.get_user_for_login(email) returns (id, email, password_hash)` — security definer.

## Routes and data flow

- `/login` — sign in / sign up; calls server actions, then `/app`.
- `/app` — server component; `getSession()` then `withUser(session.userId, ...)` to load up to 50 reviews; renders the existing composer + history.
- `generateReply`, `saveReply`, `deleteReply` server actions use `getSession()` + `withUser`; all SQL is parameterized.
- `signOut` clears the cookie.

## Local and production

- Local: `docker compose up -d db`, copy env, `npm run db:migrate`, `npm run dev`.
- Production: Vercel + managed Postgres (Neon free tier). Set `DATABASE_URL`, `AUTH_SECRET`, `GEMINI_API_KEY`, `GEMINI_MODEL`. Run the migration with an admin connection.
- SQLite is not used: Vercel has no persistent filesystem, so SQLite would lose data.

## Security and limits

- Unchanged limits: review 20–1,500 code points, reply 1–600, business name 0–100, rating 1–5 optional, 30 generations/hour/user.
- Review text is stored only when the user saves; no review text in logs.
- No service keys in the browser; only `DATABASE_URL`/`AUTH_SECRET`/`GEMINI_API_KEY` on the server.
- Prompt boundaries remain escaped, with a system instruction and output sentinel guard.

## Path to Supabase later

The tables and RLS are standard Postgres. To move to Supabase: apply the same schema, replace auth with Supabase Auth, and map `app.current_user_id()` to `auth.uid()` (or set `app.user_id` in a wrapper). Documented in the README.

## Out of scope

Email verification, password reset, OAuth, teams, billing, review importing, auto-posting.

## Success criteria

- The app runs locally with no Supabase account.
- Two users cannot read or delete each other's reviews, verified against a real Postgres.
- Signup/login/session/logout work; `/app` is protected.
- Generate, save, history, copy, and delete work end to end.
- `npm test`, `npm run lint`, and `npm run build` pass.
