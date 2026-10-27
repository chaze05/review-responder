"use server";

import { query } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { signSession } from "@/lib/session";
import { clearSessionCookie, setSessionCookie } from "@/lib/session-cookies";
import { signInSchema, signUpSchema } from "@/lib/validation";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

export async function signUp(
  formData: FormData
): Promise<{ ok: true } | { error: string }> {
  const parsed = signUpSchema.safeParse({
    email: formString(formData, "email"),
    password: formString(formData, "password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const passwordHash = await hashPassword(parsed.data.password);
    const { rows } = await query<{ id: string; email: string }>(
      "select id, email from app.create_user($1, $2)",
      [parsed.data.email, passwordHash]
    );

    const user = rows[0];
    if (!user) {
      return { error: "Could not create the account. Please try again." };
    }

    const token = await signSession({ userId: user.id, email: user.email });
    await setSessionCookie(token);

    return { ok: true };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { error: "An account with that email already exists." };
    }

    console.error(
      "[auth] signup failed:",
      error instanceof Error ? error.message : "unknown error"
    );
    return { error: "Could not create the account. Please try again." };
  }
}

export async function signIn(
  formData: FormData
): Promise<{ ok: true } | { error: string }> {
  const parsed = signInSchema.safeParse({
    email: formString(formData, "email"),
    password: formString(formData, "password"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }

  try {
    const { rows } = await query<{
      id: string;
      email: string;
      password_hash: string;
    }>("select id, email, password_hash from app.get_user_for_login($1)", [
      parsed.data.email,
    ]);

    const user = rows[0];
    if (!user) {
      return { error: "Invalid email or password." };
    }

    const valid = await verifyPassword(parsed.data.password, user.password_hash);
    if (!valid) {
      return { error: "Invalid email or password." };
    }

    const token = await signSession({ userId: user.id, email: user.email });
    await setSessionCookie(token);

    return { ok: true };
  } catch (error) {
    console.error(
      "[auth] signin failed:",
      error instanceof Error ? error.message : "unknown error"
    );
    return { error: "Could not sign in. Please try again." };
  }
}

export async function signOut(): Promise<{ ok: true }> {
  await clearSessionCookie();
  return { ok: true };
}
