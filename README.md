# Review Responder

**Live demo:** <https://review-responder-omega.vercel.app>

> Auth and saved history work on the live demo. AI generation needs `GEMINI_API_KEY` set in the Vercel project; until then the composer shows the "AI is not configured" message.

Standalone version: paste a customer review, choose a tone, and get an editable reply you can copy or save. No Supabase — just Next.js, PostgreSQL, native RLS, and local email/password auth.

## Features

- Email/password signup, login, and logout with an HttpOnly session cookie.
- Optional business name, star rating, and tone (friendly, professional, apologetic).
- Gemini-generated replies capped at 600 characters, in the review's language.
- Editable draft with copy, regenerate, and save.
- Private saved-reply history with delete.
- PostgreSQL Row Level Security on reviews and usage records.
- 30 generation requests per user per rolling hour.

## Stack

- Next.js 16 App Router, TypeScript, Tailwind CSS.
- PostgreSQL 16 locally via Docker Compose; any managed Postgres (Neon, Railway, Supabase Postgres) in production.
- `pg` for queries, `jose` for session JWTs, `bcryptjs` for password hashing.
- Gemini REST API for reply generation.
- Vitest for unit tests.

## Prerequisites

- Node.js 22 or newer.
- Docker Desktop for the local database, or a managed Postgres connection string.
- A [Gemini API key](https://aistudio.google.com/apikey).

## Local setup

1. Install dependencies:

   ```powershell
   npm.cmd install
   ```

   On macOS/Linux, use `npm install`.

2. Start PostgreSQL:

   ```powershell
   npm.cmd run db:up
   ```

   This starts `postgres:16-alpine` on **port 5433**, database `review_responder`, and creates a non-superuser `app_user` role. Data lives in the `db_data` Docker volume.

3. Create `.env.local` from `.env.example` and fill in `AUTH_SECRET` (any random string of 32+ characters) and `GEMINI_API_KEY`:

   ```powershell
   Copy-Item .env.example .env.local
   ```

   The default local URLs are:

   | Variable | Local value |
   | --- | --- |
   | `DATABASE_URL` | `postgres://app_user:app_password@localhost:5433/review_responder` |
   | `ADMIN_DATABASE_URL` | `postgres://postgres:postgres@localhost:5433/review_responder` |
   | `AUTH_SECRET` | 32+ random characters |
   | `GEMINI_API_KEY` | Google AI Studio key |
   | `GEMINI_MODEL` | Optional; defaults to `gemini-2.0-flash` |

4. Apply the schema:

   ```powershell
   npm.cmd run db:migrate
   ```

   The migration creates `users`, `reviews`, `ai_usage`, `app.current_user_id()`, the auth functions, and the RLS policies. It runs as the admin role; the app connects as `app_user`.

5. Start the app:

   ```powershell
   npm.cmd run dev
   ```

6. Open <http://localhost:3000>, create an account, and generate a reply.

## How RLS works here

The app connection role (`app_user`) is **not** a superuser and has no `BYPASSRLS`. `reviews` and `ai_usage` have `ENABLE` + **`FORCE`** row-level security.

Every query runs through `withUser(userId, fn)` in `src/lib/db.ts`:

1. Open a transaction.
2. Run `select set_config('app.user_id', $1, true)`.
3. Run the query.
4. Commit or roll back.

Policies compare rows to `app.current_user_id()`, which reads `current_setting('app.user_id', true)`. Without the setting, the value is null and RLS denies every row. The app role cannot read the `users` table directly; signup and login go through security-definer functions.

Verify isolation against the real database:

```powershell
npm.cmd run db:test-rls
```

The script creates two users, inserts a review as user A, and confirms user B cannot read, delete, or insert as user A, then cleans up.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm.cmd run dev` | Start the Next.js dev server |
| `npm.cmd run db:up` | Start local Postgres |
| `npm.cmd run db:down` | Stop local Postgres |
| `npm.cmd run db:migrate` | Apply pending `db/migrations/*.sql` |
| `npm.cmd run db:migrate:prod` | Apply migrations using the current environment (no `.env.local` assumption) |
| `npm.cmd run db:test-rls` | Run the two-user RLS check |
| `npm.cmd test` | Run Vitest |
| `npm.cmd run lint` | Run ESLint |
| `npm.cmd run build` | Production build |

## Deploy to Vercel + managed Postgres

SQLite is intentionally not used: Vercel has no persistent filesystem. Use a managed Postgres such as Neon (free tier works).

1. Create a Postgres database at <https://neon.tech> (or another provider).
2. Connect as the database owner/admin and create a **restricted** app role with a generated password:

   ```sql
   create role app_user login password '<GENERATED_PASSWORD>' nosuperuser nobypassrls;
   select rolname, rolsuper, rolbypassrls from pg_roles where rolname = 'app_user';
   ```

   The second query must return `rolsuper = false` and `rolbypassrls = false`. Do not create this role through the Neon Console/CLI/API if it grants `neon_superuser` or `BYPASSRLS`; create it with SQL and verify.

3. Run the migration with an admin connection string. The migration fails unless `app_user` exists and is safe:

   ```powershell
   $env:ADMIN_DATABASE_URL = "postgres://<owner>:<password>@<host>/<database>?sslmode=require"
   npm.cmd run db:migrate:prod
   ```

   Do not commit this URL. Migrations are tracked in `public.schema_migrations`; reruns skip applied files.

4. Import the repository at <https://vercel.com/new>.
5. Add the environment variables:
   - `DATABASE_URL` — the connection string for **app_user** (not the owner/admin role)
   - `AUTH_SECRET` — 32+ random characters
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL` (optional)
6. Deploy and run the live smoke test below.

The app verifies its database role on first query and **fails closed** if the role is a superuser or has `BYPASSRLS`. `FORCE ROW LEVEL SECURITY` covers table ownership. The local Docker password in `db/init` is for localhost only; never reuse it in production.

## Path to Supabase later

The schema is standard PostgreSQL. To move to Supabase:

1. Apply the same tables and RLS policies to the Supabase Postgres database.
2. Replace the JWT cookie auth with Supabase Auth.
3. Map `app.current_user_id()` to `auth.uid()` (or set `app.user_id` in the query wrapper).
4. Keep `withUser` if you want the same transaction-local user setting.

The original Supabase implementation remains on the `main` branch as a reference.

## Security notes

- `AUTH_SECRET` and `GEMINI_API_KEY` are server-only.
- Passwords are hashed with bcrypt cost 12; never logged.
- Review text is stored only when the user saves a reply; no review text is logged.
- The app role cannot read `users` directly and cannot alter the schema.
- Auth throttling: 5 signups/hour/IP, 20 sign-in attempts/15 min/IP, and 10/15 min per email.
- Generation limits: 30 requests/hour/user (attempts count, including failures); saves are capped at 100/hour/user.
- Prompt boundaries are escaped, with a system instruction and an output sentinel guard.
- v1 has no email verification or password reset.

## Live smoke test

1. Sign up, then confirm you land on `/app`.
2. Generate replies with two tones; confirm each is under 600 characters and plain text.
3. Copy a reply, save it, confirm it appears under **Saved replies**, then delete it.
4. Create a second account and confirm it cannot see the first account's replies.
5. Sign out and open `/app`; confirm the redirect to `/login`.
6. Temporarily remove `GEMINI_API_KEY`; confirm the composer shows the "AI is not configured" message instead of crashing.
