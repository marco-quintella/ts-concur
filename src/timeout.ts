/**
 * @fileoverview Timeout helper: race a promise with a timeout that rejects with TimeoutError.
 */

/**
 * Races the given promise against a timeout. If the promise settles first, its result is returned.
 * If the timeout elapses first, the returned promise rejects with a DOMException (name TimeoutError).
 * The timer is always cleared when the promise settles to avoid leaks.
 *
 * @param promise - Promise to race.
 * @param ms - Timeout in milliseconds (must be positive and finite; validated by caller).
 * @returns Promise that resolves or rejects with the same outcome as the input, or rejects on timeout.
 */
export function raceWithTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let id: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    id = setTimeout(() => {
      reject(new DOMException("The operation was aborted due to timeout", "TimeoutError"));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (id !== undefined) clearTimeout(id);
  });
}
