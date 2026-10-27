import { SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";

import { signSession, verifySession } from "./session";

const userId = "11111111-1111-4111-8111-111111111111";
const email = "owner@example.com";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-".padEnd(48, "x");
});

describe("session JWT", () => {
  it("round-trips a session", async () => {
    const token = await signSession({ userId, email });

    await expect(verifySession(token)).resolves.toEqual({ userId, email });
  });

  it("rejects a tampered token", async () => {
    const token = await signSession({ userId, email });
    const tampered = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");

    await expect(verifySession(tampered)).resolves.toBeNull();
  });

  it("rejects an expired token", async () => {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const token = await new SignJWT({ email })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(userId)
      .setIssuedAt()
      .setExpirationTime("-1s")
      .sign(secret);

    await expect(verifySession(token)).resolves.toBeNull();
  });

  it("returns null for a malformed token", async () => {
    await expect(verifySession("not-a-token")).resolves.toBeNull();
  });
});
