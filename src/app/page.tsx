import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  MessageSquareQuote,
  Sparkles,
  Wand2,
} from "lucide-react";

const steps = [
  {
    icon: MessageSquareQuote,
    title: "Paste the review",
    description:
      "Drop in a Google, Facebook, or other customer review. Add the rating and business name if you want.",
  },
  {
    icon: Wand2,
    title: "Generate a reply",
    description:
      "Pick a friendly, professional, or apologetic tone. Get a concise draft in the review's own language.",
  },
  {
    icon: ClipboardCheck,
    title: "Copy or save it",
    description:
      "Edit the reply, copy it to the platform, and save your favorites for next time. You stay in control.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
              <Sparkles className="h-4 w-4 text-emerald-400" />
            </div>
            <span className="text-sm font-semibold">Review Responder</span>
          </div>
          <Link
            href="/login"
            className="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-100"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto flex max-w-4xl flex-col items-center px-4 pb-16 pt-20 text-center sm:px-6 sm:pt-28">
          <p className="mb-5 rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1 text-xs text-zinc-400">
            For small business owners who care about their reviews
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
            Turn customer reviews into thoughtful replies.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
            Paste a review, pick the tone, and get an editable reply in seconds.
            Save your best responses and reuse them whenever you need.
          </p>
          <div className="mt-9 flex flex-col items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-emerald-400"
            >
              Start replying
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="text-xs text-zinc-500">
              No auto-posting. You stay in control.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="grid gap-4 rounded-3xl border border-zinc-800 bg-zinc-900/30 p-4 sm:grid-cols-3 sm:p-6">
            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.title}
                  className="rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-6"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                      <Icon className="h-5 w-5 text-emerald-400" />
                    </div>
                    <span className="text-xs font-medium text-zinc-600">
                      0{index + 1}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold text-zinc-100">
                    {step.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-zinc-600 sm:flex-row sm:px-6">
          <span>Review Responder</span>
          <span>Private by default. No auto-posting, ever.</span>
        </div>
      </footer>
    </div>
  );
}
