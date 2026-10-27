import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = {
  title: "Sign in | Review Responder",
};

export const instant = false;

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12">
      <AuthForm
        initialError={
          error === "confirmation-failed"
            ? "That confirmation link is invalid or expired. Try signing in, or sign up again."
            : undefined
        }
      />
    </main>
  );
}
