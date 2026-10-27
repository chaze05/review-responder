import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  fileURLToPath(new URL("../../supabase/migrations/0001_init.sql", import.meta.url)),
  "utf8"
);

describe("ai_usage delete policy", () => {
  it("only allows deleting rows older than seven days", () => {
    expect(migration).toContain("ai_usage_delete_own_old");
    expect(migration).toMatch(
      /created_at\s*<\s*now\(\)\s*-\s*interval '7 days'/i
    );
  });

  it("does not grant unrestricted delete access to authenticated users", () => {
    expect(migration).not.toContain('create policy "ai_usage_delete_own"');
  });
});
