export const RATE_LIMIT = 30;
export const RATE_WINDOW_MINUTES = 60;

export interface RateLimitResult {
  limited: boolean;
  retryMinutes: number;
}

export function checkRateLimit(
  timestamps: Date[],
  now: Date
): RateLimitResult {
  const nowMs = now.getTime();
  const windowStartMs = nowMs - RATE_WINDOW_MINUTES * 60_000;

  const recent = timestamps
    .map((timestamp) => timestamp.getTime())
    .filter((timestamp) => timestamp >= windowStartMs && timestamp <= nowMs);

  if (recent.length < RATE_LIMIT) {
    return { limited: false, retryMinutes: 0 };
  }

  const oldest = Math.min(...recent);
  const retryMinutes = Math.max(
    1,
    Math.ceil(
      (oldest + RATE_WINDOW_MINUTES * 60_000 - nowMs) / 60_000
    )
  );

  return { limited: true, retryMinutes };
}
