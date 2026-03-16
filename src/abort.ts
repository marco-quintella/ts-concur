/**
 * @fileoverview AbortSignal helper: promise that rejects when the signal aborts.
 */

/**
 * Returns the abort reason for the given signal, or a DOMException with name AbortError when undefined.
 *
 * @param signal - AbortSignal (may be undefined).
 * @returns signal.reason when present, otherwise new DOMException("Aborted", "AbortError").
 */
export function getAbortReason(signal: AbortSignal | undefined): unknown {
  return signal?.reason ?? new DOMException("Aborted", "AbortError");
}

/**
 * Returns a promise that rejects when the given AbortSignal aborts.
 * Uses signal.reason when available, otherwise a DOMException with name AbortError.
 *
 * @param signal - AbortSignal to listen to.
 * @returns Promise that rejects with the abort reason when the signal aborts.
 */
export function whenAborted(signal: AbortSignal): Promise<never> {
  if (signal.aborted) {
    return Promise.reject(getAbortReason(signal));
  }
  return new Promise((_, reject) => {
    signal.addEventListener("abort", () => reject(getAbortReason(signal)), { once: true });
  });
}
