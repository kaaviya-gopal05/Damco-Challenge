import { describe, expect, it, vi } from 'vitest';
import { AgentError, AgentErrorType, classifyError, runWithRetry } from '@/utils/agentErrorHandler';

describe('classifyError', () => {
  it('passes an existing AgentError through unchanged', () => {
    const original = new AgentError('boom', AgentErrorType.RATE_LIMITED);
    expect(classifyError(original)).toBe(original);
  });

  it.each([
    ['Request failed with status 429', AgentErrorType.RATE_LIMITED],
    ['rate limit exceeded', AgentErrorType.RATE_LIMITED],
    ['Request timed out', AgentErrorType.TIMEOUT],
    ['the operation was aborted', AgentErrorType.TIMEOUT],
    ['Failed to fetch', AgentErrorType.NETWORK_ERROR],
    ['network error', AgentErrorType.NETWORK_ERROR],
    ['400 invalid request body', AgentErrorType.INVALID_INPUT],
    ['validation failed for field x', AgentErrorType.INVALID_INPUT],
    ['something totally unexpected happened', AgentErrorType.UNKNOWN],
  ])('classifies "%s" as %s', (message, expectedType) => {
    expect(classifyError(new Error(message)).type).toBe(expectedType);
  });

  it('marks network/timeout/rate-limit errors as retryable, everything else as not', () => {
    expect(classifyError(new Error('network error')).isRetryable).toBe(true);
    expect(classifyError(new Error('Request timed out')).isRetryable).toBe(true);
    expect(classifyError(new Error('rate limit exceeded')).isRetryable).toBe(true);
    expect(classifyError(new Error('400 invalid request')).isRetryable).toBe(false);
    expect(classifyError(new Error('mystery failure')).isRetryable).toBe(false);
  });
});

describe('runWithRetry', () => {
  it('returns the result on the first successful attempt without retrying', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    await expect(runWithRetry(fn, { initialDelayMs: 1 })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledOnce();
  });

  it('retries a retryable error up to maxRetries times, then succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce('recovered');
    await expect(runWithRetry(fn, { maxRetries: 3, initialDelayMs: 1 })).resolves.toBe('recovered');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws immediately for a non-retryable error without retrying', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('400 invalid input'));
    await expect(runWithRetry(fn, { initialDelayMs: 1 })).rejects.toMatchObject({ type: AgentErrorType.INVALID_INPUT });
    expect(fn).toHaveBeenCalledOnce();
  });

  it('gives up after maxRetries attempts and throws the last error', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Request timed out'));
    await expect(runWithRetry(fn, { maxRetries: 2, initialDelayMs: 1 })).rejects.toMatchObject({ type: AgentErrorType.TIMEOUT });
    expect(fn).toHaveBeenCalledTimes(3);
  });
});
