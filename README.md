# Review Responder

Paste a customer review, choose a tone, and get an editable reply you can copy or save. Built for small business owners who want to respond well without spending twenty minutes per review.

## Features

- Email/password authentication with Supabase.
- Optional business name, star rating, and tone (friendly, professional, apologetic).
- Gemini-generated replies capped at 600 characters, in the review's language.
- Editable draft with copy, regenerate, and save.
- Private saved-reply history with delete.
- 30 generation requests per user per rolling hour.
- Row Level Security: users can only read, create, and delete their own data.

## Prerequisites

- Node.js 22 or newer.
- A free [Supabase](https://supabase.com) project.
- A [Gemini API key](https://aistudio.google.com/apikey).

## Local setup

1. Install dependencies:

   ```bash
   npm.cmd install
   ```

   On macOS or Linux, use `npm install`.

2. Create `.env.local` from the template and fill in the values:

   ```bash
   cp .env.example .env.local
   ```

   | Variable | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
   | `GEMINI_API_KEY` | Google AI Studio API key |
   | `GEMINI_MODEL` | Optional; defaults to `gemini-2.0-flash` |

3. Apply the database schema. In the Supabase dashboard, open **SQL Editor**, paste the contents of `supabase/migrations/0001_init.sql`, and run it. The migration creates the `reviews` and `ai_usage` tables, indexes, RLS policies, and grants.

4. Configure authentication URLs in Supabase under **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/confirm`

   Add the production equivalents after deploying.

5. Start the dev server:

   ```bash
   npm.cmd run dev
   ```

6. Open <http://localhost:3000>, create an account, and generate a reply.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm.cmd run dev` | Start the development server |
| `npm.cmd test` | Run the Vitest suite |
| `npm.cmd run lint` | Run ESLint |
| `npm.cmd run build` | Production build |
| `npm.cmd start` | Start the production server |

## How it works

- The `/app` page is protected by `src/proxy.ts` and re-checks the Supabase session on the server.
- `generateReply` validates input, enforces the rolling-hour limit, records usage, builds a grounded prompt, calls Gemini, and cleans the output. The review text is only stored when the user explicitly saves the reply.
- The Gemini key stays server-side. Browser code only sees the Supabase URL and anon key.
- RLS policies restrict every table operation to the signed-in user.

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import the repository at <https://vercel.com/new>.
3. Add the four environment variables from the table above.
4. Deploy.
5. In Supabase **Authentication → URL Configuration**, set the Site URL to the production URL and add `https://<your-domain>/auth/confirm` as a redirect URL.
6. Run the live smoke test below.

## Verification

Automated:

```bash
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

Manual smoke test:

1. Sign up, confirm your email if confirmation is enabled, and sign in.
2. Generate replies with two different tones; confirm each is under 600 characters and plain text.
3. Copy a reply, save it, confirm it appears under **Saved replies**, then delete it.
4. Create a second account and confirm it cannot see the first account's saved replies.
5. Sign out and open `/app`; confirm the redirect to `/login`.
6. Temporarily remove `GEMINI_API_KEY`; confirm the composer shows the "AI is not configured" message instead of crashing.

## Stack

Next.js 16 (App Router), TypeScript, Tailwind CSS, Supabase Auth/Postgres, Gemini, Vitest, Vercel.
