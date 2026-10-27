import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  fileURLToPath(new URL("../../db/migrations/0001_init.sql", import.meta.url)),
  "utf8"
);

describe("standalone RLS migration", () => {
  it("forces row level security on both data tables", () => {
    expect(migration.match(/force row level security/gi)).toHaveLength(2);
  });

  it("scopes rows with app.current_user_id()", () => {
    expect(migration).toContain("app.current_user_id()");
    expect(migration).toContain("current_setting('app.user_id', true)");
  });

  it("restricts ai_usage deletes to rows older than seven days", () => {
    expect(migration).toContain("ai_usage_delete_own_old");
    expect(migration).toMatch(
      /created_at\s*<\s*now\(\)\s*-\s*interval '7 days'/i
    );
  });

  it("does not let the app role read the users table directly", () => {
    expect(migration).toContain("revoke all on public.users from app_user");
  });
});
