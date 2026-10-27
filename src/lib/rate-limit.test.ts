import { describe, expect, it } from "vitest";

import { checkRateLimit } from "./rate-limit";

const now = new Date("2026-01-01T12:00:00.000Z");
const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60_000);

describe("checkRateLimit", () => {
  it("allows fewer than 30 recent requests", () => {
    expect(checkRateLimit([minutesAgo(5)], now)).toEqual({
      limited: false,
      retryMinutes: 0,
    });
  });

  it("allows the 30th request", () => {
    const timestamps = Array.from({ length: 29 }, () => minutesAgo(5));

    expect(checkRateLimit(timestamps, now).limited).toBe(false);
  });

  it("blocks the 31st request and reports retry minutes", () => {
    const timestamps = Array.from({ length: 30 }, () => minutesAgo(10));

    expect(checkRateLimit(timestamps, now)).toEqual({
      limited: true,
      retryMinutes: 50,
    });
  });

  it("ignores rows outside the 60-minute window", () => {
    const timestamps = Array.from({ length: 30 }, () => minutesAgo(61));

    expect(checkRateLimit(timestamps, now).limited).toBe(false);
  });

  it("ignores future timestamps", () => {
    const timestamps = Array.from({ length: 30 }, () =>
      new Date(now.getTime() + 60_000)
    );

    expect(checkRateLimit(timestamps, now).limited).toBe(false);
  });

  it("never reports less than one retry minute when the oldest row is at the boundary", () => {
    const timestamps = Array.from({ length: 30 }, () => minutesAgo(59.99));

    const result = checkRateLimit(timestamps, now);

    expect(result.limited).toBe(true);
    expect(result.retryMinutes).toBeGreaterThanOrEqual(1);
  });
});
