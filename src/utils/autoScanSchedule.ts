/**
 * Pure scheduling math for useAutoScanEmails: given when the last background scan ran and the
 * fixed poll interval, how long until the next one should fire. Extracted out of the hook itself
 * so the "should we scan now, or wait, and for how long" decision is testable without mounting a
 * component, mocking React Query, or faking browser timers.
 */
export function computeNextScanDelayMs(lastScanAt: number | null, now: number, intervalMs: number): number {
  if (lastScanAt === null) return 0;
  const elapsed = now - lastScanAt;
  if (elapsed < 0) return intervalMs; // clock skew / a lastScanAt from the future — just wait a full interval
  if (elapsed >= intervalMs) return 0;
  return intervalMs - elapsed;
}
