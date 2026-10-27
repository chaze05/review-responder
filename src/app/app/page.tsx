import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";

import { SignOutButton } from "@/components/sign-out-button";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Workspace | Review Responder",
};

export const instant = false;

export default async function AppPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15">
              <Sparkles className="h-4 w-4 text-emerald-400" />
            </div>
            <span className="text-sm font-semibold">Review Responder</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-zinc-500 sm:inline">
              {user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
          <h1 className="text-2xl font-semibold text-zinc-100">
            Your workspace is ready.
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            The review composer and saved history are being wired up next.
          </p>
        </div>
      </main>
    </div>
  );
}
