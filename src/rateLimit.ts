/**
 * @fileoverview Token-bucket style rate limiter for task start rate.
 */

import type { RateLimitConfig } from "./types.js";

function isValidRate(value: number): boolean {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * Creates a function that returns true if a task may start, false if rate limited.
 * Uses a fixed window per second/minute; perSecond and perMinute are enforced separately.
 * When provided, perSecond and perMinute must be positive finite numbers; 0 is treated as no limit for that window.
 * Throws if a provided value is negative, NaN, or non-finite.
 *
 * @param config - Rate limit configuration (perSecond, perMinute, or both).
 * @returns A function that returns true if a task may start, false if rate limited.
 */
export function createRateLimiter(config: RateLimitConfig): () => boolean {
  const rawSecond = config.perSecond;
  const rawMinute = config.perMinute;

  if (rawSecond !== undefined && rawSecond !== 0 && !isValidRate(rawSecond)) {
    throw new Error(
      "rateLimit.perSecond must be a positive finite number (got " + String(rawSecond) + ")",
    );
  }
  if (rawMinute !== undefined && rawMinute !== 0 && !isValidRate(rawMinute)) {
    throw new Error(
      "rateLimit.perMinute must be a positive finite number (got " + String(rawMinute) + ")",
    );
  }

  const perSecond =
    rawSecond === undefined || rawSecond === 0 ? Number.POSITIVE_INFINITY : rawSecond;
  const perMinute =
    rawMinute === undefined || rawMinute === 0 ? Number.POSITIVE_INFINITY : rawMinute;

  if (perSecond === Number.POSITIVE_INFINITY && perMinute === Number.POSITIVE_INFINITY) {
    return () => true;
  }

  let secondCount = 0;
  let secondResetAt = 0;
  let minuteCount = 0;
  let minuteResetAt = 0;

  return function allow(): boolean {
    const now = Date.now();

    if (now >= secondResetAt) {
      secondCount = 0;
      secondResetAt = now + 1000;
    }
    if (now >= minuteResetAt) {
      minuteCount = 0;
      minuteResetAt = now + 60_000;
    }

    if (secondCount >= perSecond || minuteCount >= perMinute) {
      return false;
    }
    secondCount += 1;
    minuteCount += 1;
    return true;
  };
}
