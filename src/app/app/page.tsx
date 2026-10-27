import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";

import { SignOutButton } from "@/components/sign-out-button";
import { Composer } from "@/components/composer";
import { HistoryList } from "@/components/history-list";
import { withUser } from "@/lib/db";
import { getSession } from "@/lib/session-cookies";
import type { Reply, Tone } from "@/types";

export const metadata = {
  title: "Workspace | Review Responder",
};

export const instant = false;

export default async function AppPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  let savedReplies: Reply[] = [];
  let historyError = "";

  try {
    const result = await withUser(session.userId, (client) =>
      client.query(
        `select id, user_id, business_name, review_text, rating, tone, reply_text, created_at
         from public.reviews
         order by created_at desc
         limit 50`
      )
    );

    savedReplies = result.rows.map((row) => ({
      id: String(row.id),
      user_id: String(row.user_id),
      business_name: String(row.business_name ?? ""),
      review_text: String(row.review_text),
      rating: row.rating === null ? null : Number(row.rating),
      tone: row.tone as Tone,
      reply_text: String(row.reply_text),
      created_at: new Date(row.created_at).toISOString(),
    }));
  } catch (error) {
    console.error(
      "[app] history load failed:",
      error instanceof Error ? error.message : "unknown error"
    );
    historyError = "Could not load saved replies. Refresh to try again.";
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
              <Sparkles className="h-4 w-4 text-emerald-400" />
            </div>
            <span className="text-sm font-semibold">Review Responder</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-zinc-500 sm:inline">
              {session.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-100">
            Write a thoughtful reply
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Paste a review, choose a tone, and edit the draft before you copy it.
          </p>
        </div>
        <Composer />

        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                Saved replies
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Your private history, newest first.
              </p>
            </div>
            <span className="rounded-full border border-zinc-800 px-2.5 py-1 text-xs text-zinc-500">
              {savedReplies.length}
            </span>
          </div>
          {historyError && (
            <p className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {historyError}
            </p>
          )}
          <HistoryList replies={savedReplies} />
        </section>
      </main>
    </div>
  );
}
