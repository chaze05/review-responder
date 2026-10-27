# Standalone Postgres + RLS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace Supabase with standalone PostgreSQL, native RLS, and local email/password auth while keeping the existing UI and features.

**Architecture:** Next.js talks to Postgres through `pg`. Every query runs in `withUser()`, which sets `app.user_id` transaction-locally so RLS policies can scope rows. Auth is a signed JWT cookie; auth lookups go through security-definer functions.

**Tech Stack:** Next.js 16, TypeScript, Tailwind, PostgreSQL 16, `pg`, `jose`, `bcryptjs`, Gemini, Vitest, Docker Compose, Vercel + managed Postgres.

**Spec:** `docs/superpowers/specs/2026-10-27-standalone-postgres-design.md`

## Global Constraints

- Branch: `feat/standalone-postgres`. Do not change `main`.
- App role is non-superuser with no `BYPASSRLS`; `reviews`/`ai_usage` use `FORCE ROW LEVEL SECURITY`.
- Every data query goes through `withUser()`.
- Limits: review 20–1,500 code points; reply 1–600; business name 0–100; rating optional 1–5; 30 generations/hour/user.
- `AUTH_SECRET` ≥ 32 characters; `GEMINI_API_KEY` server-only; no secrets in git.
- Run npm as `npm.cmd` on this machine.
- Commit after every task with a real message; no empty commits.

---

### Task 1: Postgres, role, schema, and RLS

**Files:** `docker-compose.yml`, `db/init/001-app-user.sql`, `db/migrations/0001_init.sql`, `scripts/migrate.mjs`, `src/lib/migration.test.ts`

**Interfaces produced:** database `review_responder`; app role `app_user`; tables `users`, `reviews`, `ai_usage`; `app.current_user_id()`, `app.create_user(text,text)`, `app.get_user_for_login(text)`; forced RLS.

- [ ] Write `docker-compose.yml` with `postgres:16-alpine`, database `review_responder`, admin `postgres`, port `5433:5432`, a named volume, and a `db/init` mount.
- [ ] Write `db/init/001-app-user.sql`: create `app_user` login password `app_password` **nosuperuser**; grant connect.
- [ ] Write `db/migrations/0001_init.sql`:
  - `users (id uuid pk default gen_random_uuid(), email text not null, password_hash text not null, created_at timestamptz default now())`; unique index on `lower(email)`.
  - `reviews` and `ai_usage` with the existing constraints/indexes.
  - `create schema app;` and `app.current_user_id()`.
  - Enable + force RLS on `reviews` and `ai_usage`; policies `to public` using `app.current_user_id()`; `ai_usage` delete only rows older than 7 days.
  - Security-definer `app.create_user` and `app.get_user_for_login` with `set search_path = public`.
  - `do $$ ... $$` block: if `app_user` exists, grant usage on `app`/`public`, CRUD on `reviews`/`ai_usage`, execute on the auth functions; revoke all on `users` from `app_user`. Revoke all on `users` from `public`.
- [ ] Write `scripts/migrate.mjs`: read `db/migrations/*.sql` sorted, run in one transaction using `ADMIN_DATABASE_URL ?? DATABASE_URL`, exit non-zero on error.
- [ ] Replace `migration.test.ts`: read the new SQL and assert `force row level security`, `app.current_user_id()`, the delete-old policy, and grants.
- [ ] Start `docker compose up -d db`, run `npm run db:migrate` with the admin URL, and verify tables/policies with `psql`.
- [ ] Commit: `feat: add standalone Postgres schema with RLS`.

### Task 2: DB helper, password, session (TDD)

**Files:** `src/lib/db.ts`, `src/lib/password.ts`, `src/lib/session.ts`, `src/lib/password.test.ts`, `src/lib/session.test.ts`, `package.json`

**Interfaces produced:**

- `pool`, `query<T>(text, params?)`, `withUser<T>(userId, fn)`
- `hashPassword(password)`, `verifyPassword(password, hash)`
- `SESSION_COOKIE`, `signSession({userId,email})`, `verifySession(token)`, `getSession()`, `setSessionCookie(token)`, `clearSessionCookie()`

- [ ] Install `pg`, `jose`, `bcryptjs`, `@types/pg`; add `db:up`, `db:down`, `db:migrate` scripts.
- [ ] Write failing tests: password hash verifies correct password and rejects wrong; JWT sign/verify round-trips, tampered token returns null, expired token returns null.
- [ ] Implement `password.ts` (bcrypt cost 12) and `session.ts` (HS256, 30d, cookie rules). `getSession()` reads the cookie; `setSessionCookie`/`clearSessionCookie` use `cookies()`.
- [ ] Implement `db.ts` with a global-cached `pg.Pool` and `withUser`.
- [ ] Run tests, then commit: `feat: add Postgres helpers and session auth`.

### Task 3: Auth actions, form, proxy, sign-out

**Files:** `src/actions/auth.ts`, `src/lib/validation.ts`, `src/components/auth-form.tsx`, `src/app/login/page.tsx`, `src/proxy.ts`, `src/components/sign-out-button.tsx`

**Interfaces produced:** `signUp(formData)`, `signIn(formData)`, `signOut()`, `signUpSchema`, `signInSchema`.

- [ ] Add auth schemas/tests (valid email, password ≥8, lowercase email).
- [ ] Implement actions: validate, hash/verify, call the DB functions, set/clear the JWT cookie, return `{ ok: true }` or `{ error }`; map unique violations to “account exists”.
- [ ] Replace the Supabase form calls with the actions; on success `router.push("/app")` + refresh. Remove the email-confirmation state.
- [ ] Replace `proxy.ts` with JWT verification (no Supabase), keeping `/app`/`/login` redirects.
- [ ] Sign-out calls the action.
- [ ] Verify build; commit: `feat: add standalone auth`.

### Task 4: Replace app data access with pg + withUser

**Files:** `src/app/app/page.tsx`, `src/actions/replies.ts`, `src/types.ts`

- [ ] `/app`: `getSession()`, redirect if absent, then `withUser` select up to 50 reviews, newest first; map `created_at` to ISO strings; render existing Composer/HistoryList.
- [ ] `generateReply`: session + validation + rate-limit count/insert in `withUser`; call Gemini outside the transaction; clean/safety check; delete old usage rows best-effort.
- [ ] `saveReply`: session + `parseSaveReply` + `withUser` insert `returning id, created_at`; return ISO string.
- [ ] `deleteReply`: session + `withUser` delete by id; RLS enforces ownership.
- [ ] Remove `src/lib/supabase/*`; remove Supabase imports everywhere.
- [ ] Verify build; commit: `feat: move app data access to Postgres RLS`.

### Task 5: Remove Supabase, env/docs, and verify RLS

**Files:** `package.json`, `.env.example`, `README.md`, `.gitignore`, delete `supabase/`, delete `src/lib/response-cookies.*` and its use.

- [ ] Remove `@supabase/ssr` and `@supabase/supabase-js`; update `.env.example` to `DATABASE_URL`, `ADMIN_DATABASE_URL`, `AUTH_SECRET`, `GEMINI_API_KEY`, `GEMINI_MODEL`.
- [ ] Rewrite the README for Docker Postgres + standalone auth + Neon/Vercel; document running the migration, `app_user`, the two-user RLS check, and the Supabase migration path.
- [ ] Delete the Supabase client files/migration and the obsolete response-cookie helper/tests.
- [ ] Add `scripts/test-rls.mjs`: create two users, insert a review as user A through `withUser`, assert user B sees 0 and cannot delete/insert as A; clean up reviews and test users.
- [ ] Run the RLS script against Docker; run `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run build`.
- [ ] Commit: `docs: document standalone Postgres setup`.

### Task 6: Live deployment (user-assisted)

- [ ] Push the branch; open a PR/merge after verification.
- [ ] Create a free Neon Postgres database; run the migration with the admin URL; set `DATABASE_URL`, `AUTH_SECRET`, `GEMINI_API_KEY` in Vercel.
- [ ] Deploy; verify signup, generate, save, delete, and two-account isolation live.
