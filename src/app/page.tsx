import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-2.5 px-4 sm:px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
            <Sparkles className="h-4 w-4 text-emerald-400" />
          </div>
          <span className="text-sm font-semibold">Review Responder</span>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
        <p className="mb-4 rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400">
          For small business owners
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Turn customer reviews into thoughtful replies.
        </h1>
        <p className="mt-5 max-w-xl text-base text-zinc-400">
          Paste a review, pick the tone, and get a ready-to-edit reply in
          seconds. Save your best responses and reuse them whenever you need.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400"
        >
          Start replying
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </main>
  );
}
