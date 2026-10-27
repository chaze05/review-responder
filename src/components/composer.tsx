"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquareQuote, Save, Wand2 } from "lucide-react";

import { generateReply, saveReply } from "@/actions/replies";
import type { Tone } from "@/types";

import { CopyButton } from "./copy-button";
import { StarRating } from "./star-rating";

const EXAMPLE_REVIEW =
  "The team was friendly and the salon was spotless. My appointment started about 25 minutes late, which made me rush afterwards. The cut itself was excellent and I would come back, but I hope the timing improves.";

const TONES: Array<{ value: Tone; label: string }> = [
  { value: "friendly", label: "Friendly" },
  { value: "professional", label: "Professional" },
  { value: "apologetic", label: "Apologetic" },
];

export function Composer() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [tone, setTone] = useState<Tone>("friendly");
  const [replyText, setReplyText] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const canGenerate = reviewText.trim().length >= 20;

  function generate() {
    setError("");
    setSaveMessage("");

    startTransition(async () => {
      const formData = new FormData();
      formData.set("businessName", businessName);
      formData.set("reviewText", reviewText);
      formData.set("rating", rating === null ? "" : String(rating));
      formData.set("tone", tone);

      try {
        const result = await generateReply(formData);

        if ("error" in result) {
          setError(result.error);
          return;
        }

        setReplyText(result.text);
      } catch {
        setError("Could not generate a reply. Please try again.");
      }
    });
  }

  function loadExample() {
    setReviewText(EXAMPLE_REVIEW);
    setRating(3);
    setError("");
  }

  async function save() {
    setError("");
    setSaveMessage("");
    setIsSaving(true);

    const formData = new FormData();
    formData.set("businessName", businessName);
    formData.set("reviewText", reviewText);
    formData.set("rating", rating === null ? "" : String(rating));
    formData.set("tone", tone);
    formData.set("replyText", replyText);

    try {
      const result = await saveReply(formData);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      setSaveMessage("Saved to your history.");
      router.refresh();
    } catch {
      setError("Could not save the reply. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-zinc-200">The review</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Paste the customer review. It is only stored if you save the reply.
          </p>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="business-name" className="text-sm font-medium text-zinc-300">
              Business name <span className="text-zinc-600">(optional)</span>
            </label>
            <input
              id="business-name"
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              maxLength={100}
              placeholder="e.g. Acme Salon"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="review-text" className="text-sm font-medium text-zinc-300">
                Review
              </label>
              <button
                type="button"
                onClick={loadExample}
                className="text-xs font-medium text-emerald-400 transition-colors hover:text-emerald-300"
              >
                Load example
              </button>
            </div>
            <textarea
              id="review-text"
              value={reviewText}
              onChange={(event) => setReviewText(event.target.value)}
              maxLength={1_500}
              rows={8}
              placeholder="Paste the review here…"
              className={`${inputClass} resize-y`}
            />
            <div className="flex items-center justify-between text-xs text-zinc-600">
              <span>Minimum 20 characters.</span>
              <span>{reviewText.length}/1,500</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-zinc-300">
                Rating <span className="text-zinc-600">(optional)</span>
              </span>
              <StarRating value={rating} onChange={setRating} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="tone" className="text-sm font-medium text-zinc-300">
                Tone
              </label>
              <select
                id="tone"
                value={tone}
                onChange={(event) => setTone(event.target.value as Tone)}
                className={inputClass}
              >
                {TONES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={generate}
            disabled={!canGenerate || isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            {isPending ? "Writing reply…" : replyText ? "Regenerate reply" : "Generate reply"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">Your reply</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Edit it before copying. You stay in control.
            </p>
          </div>
          {replyText && (
            <span className="text-xs text-zinc-500">{replyText.length}/600</span>
          )}
        </div>

        {replyText ? (
          <div className="flex flex-col gap-4">
            <textarea
              value={replyText}
              onChange={(event) => {
                setReplyText(event.target.value);
                setSaveMessage("");
              }}
              maxLength={600}
              rows={12}
              className={`${inputClass} resize-y`}
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <CopyButton text={replyText} />
                <button
                  type="button"
                  onClick={save}
                  disabled={
                    isSaving ||
                    replyText.trim().length === 0 ||
                    replyText.length > 600
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isSaving ? "Saving…" : "Save reply"}
                </button>
                {saveMessage && (
                  <span className="text-xs text-emerald-400">{saveMessage}</span>
                )}
              </div>
              <button
                type="button"
                onClick={generate}
                disabled={!canGenerate || isPending}
                className="text-xs font-medium text-emerald-400 transition-colors hover:text-emerald-300 disabled:opacity-50"
              >
                Regenerate
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-zinc-800 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800">
              <MessageSquareQuote className="h-6 w-6 text-zinc-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-300">No reply yet</p>
              <p className="mt-1 max-w-xs text-xs text-zinc-500">
                Paste a review and generate a reply. It will appear here, ready
                to edit and copy.
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
