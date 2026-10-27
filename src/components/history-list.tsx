"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Loader2, MessageSquareQuote, Trash2 } from "lucide-react";

import { deleteReply } from "@/actions/replies";
import type { Reply } from "@/types";

import { CopyButton } from "./copy-button";

interface HistoryListProps {
  replies: Reply[];
}

export function HistoryList({ replies }: HistoryListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function remove(id: string) {
    if (!window.confirm("Delete this saved reply?")) {
      return;
    }

    setDeletingId(id);
    setError("");

    try {
      const result = await deleteReply(id);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      router.refresh();
    } catch {
      setError("Could not delete the reply. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  if (replies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-800 py-14 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800">
          <MessageSquareQuote className="h-6 w-6 text-zinc-500" />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-300">No saved replies yet</p>
          <p className="mt-1 max-w-sm text-xs text-zinc-500">
            Generate a reply and save it to build a private history you can
            reuse.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {replies.map((reply) => (
        <article
          key={reply.id}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-zinc-100">
                {reply.business_name || "Unnamed business"}
              </h3>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span className="rounded-full border border-zinc-800 px-2 py-0.5 capitalize">
                  {reply.tone}
                </span>
                {reply.rating !== null && <span>{reply.rating}/5</span>}
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {reply.created_at.slice(0, 10)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <CopyButton text={reply.reply_text} />
              <button
                type="button"
                onClick={() => remove(reply.id)}
                disabled={deletingId === reply.id}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-500 transition-colors hover:border-red-500/30 hover:text-red-300 disabled:opacity-60"
              >
                {deletingId === reply.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span className="sr-only">Delete</span>
              </button>
            </div>
          </div>

          <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
            {reply.reply_text}
          </p>

          <details className="mt-4">
            <summary className="cursor-pointer text-xs text-zinc-500 transition-colors hover:text-zinc-300">
              Original review
            </summary>
            <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-zinc-500">
              {reply.review_text}
            </p>
          </details>
        </article>
      ))}
    </div>
  );
}
