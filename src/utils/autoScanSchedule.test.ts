import { describe, expect, it } from 'vitest';
import { computeNextScanDelayMs } from './autoScanSchedule';

const THIRTY_MIN = 30 * 60 * 1000;
const NOW = 1_800_000_000_000; // arbitrary fixed epoch ms

describe('computeNextScanDelayMs', () => {
  it('scans immediately when there is no recorded last scan (first-ever load)', () => {
    expect(computeNextScanDelayMs(null, NOW, THIRTY_MIN)).toBe(0);
  });

  it('scans immediately when the interval has fully elapsed', () => {
    const lastScanAt = NOW - THIRTY_MIN;
    expect(computeNextScanDelayMs(lastScanAt, NOW, THIRTY_MIN)).toBe(0);
  });

  it('scans immediately when well past the interval (app was closed for hours)', () => {
    const lastScanAt = NOW - THIRTY_MIN * 5;
    expect(computeNextScanDelayMs(lastScanAt, NOW, THIRTY_MIN)).toBe(0);
  });

  it('waits the remaining time when the last scan was recent', () => {
    const tenMinutesAgo = NOW - 10 * 60 * 1000;
    expect(computeNextScanDelayMs(tenMinutesAgo, NOW, THIRTY_MIN)).toBe(20 * 60 * 1000);
  });

  it('waits a full interval if the recorded timestamp is somehow in the future (clock skew)', () => {
    const future = NOW + 60_000;
    expect(computeNextScanDelayMs(future, NOW, THIRTY_MIN)).toBe(THIRTY_MIN);
  });

  it('waits a full interval when the last scan happened this very instant', () => {
    expect(computeNextScanDelayMs(NOW, NOW, THIRTY_MIN)).toBe(THIRTY_MIN);
  });
});
