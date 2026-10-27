import { describe, expect, it } from "vitest";

import { copyCookies } from "./response-cookies";

describe("copyCookies", () => {
  it("copies each cookie with its options", () => {
    const calls: Array<[string, string, Record<string, unknown>]> = [];

    copyCookies(
      [{ name: "sb-session", value: "token", path: "/", httpOnly: true }],
      (name, value, options) => calls.push([name, value, options])
    );

    expect(calls).toEqual([
      ["sb-session", "token", { path: "/", httpOnly: true }],
    ]);
  });
});
