import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// getAiService()/isAiConfigured() decide whether the app talks to the real Gemini-backed
// edge function or the offline mock — this is the exact switch the security fix in
// docs/ai-workflow.md depends on, so it's worth locking down directly. @/lib/supabase is
// mocked because it throws at import time without real Supabase project env vars, which
// this test intentionally never sets.
vi.mock('@/lib/supabase', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}));

describe('getAiService / isAiConfigured', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('defaults to the mock AI service when VITE_AI_ENABLED is unset', async () => {
    const { getAiService, isAiConfigured } = await import('@/services/ai.service');
    const { GeminiService } = await import('@/services/ai/gemini');

    expect(isAiConfigured()).toBe(false);
    expect(getAiService()).not.toBeInstanceOf(GeminiService);
  });

  it('stays on the mock service for any value other than the exact string "true"', async () => {
    vi.stubEnv('VITE_AI_ENABLED', '1');
    const { isAiConfigured } = await import('@/services/ai.service');
    expect(isAiConfigured()).toBe(false);
  });

  it('switches to the Gemini-backed service when VITE_AI_ENABLED=true', async () => {
    vi.stubEnv('VITE_AI_ENABLED', 'true');
    const { getAiService, isAiConfigured } = await import('@/services/ai.service');
    const { GeminiService } = await import('@/services/ai/gemini');

    expect(isAiConfigured()).toBe(true);
    expect(getAiService()).toBeInstanceOf(GeminiService);
  });

  it('caches the selected service across repeated calls', async () => {
    const { getAiService } = await import('@/services/ai.service');
    expect(getAiService()).toBe(getAiService());
  });
});
