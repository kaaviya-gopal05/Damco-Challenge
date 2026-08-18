import { beforeEach, describe, expect, it, vi } from 'vitest';

// GeminiService never talks to Google directly — it calls our own `ai-complete`
// Supabase Edge Function via supabase.functions.invoke(). Mock that boundary so
// these tests exercise GeminiService's parsing/error-handling logic without any
// network access or real Supabase project, and never depend on a live model call.
// vi.hoisted is required because vi.mock's factory is hoisted above all imports —
// a plain top-level const wouldn't exist yet when the factory runs.
const invokeMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase', () => ({
  supabase: { functions: { invoke: invokeMock } },
}));

import { GeminiService } from '@/services/ai/gemini';

describe('GeminiService', () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it('calls the ai-complete edge function with the prompt and jsonMode flag', async () => {
    invokeMock.mockResolvedValue({ data: { text: '3-5 sentence summary.' }, error: null });
    const service = new GeminiService();

    await service.summarizeDocument('Some long document text.', 'My Doc');

    expect(invokeMock).toHaveBeenCalledWith('ai-complete', {
      body: expect.objectContaining({ jsonMode: false, prompt: expect.stringContaining('My Doc') }),
    });
  });

  it('requests JSON mode for structured-output methods', async () => {
    invokeMock.mockResolvedValue({ data: { text: '{"label":"Topic","children":[]}' }, error: null });
    const service = new GeminiService();

    const tree = await service.generateMindMapTree('Topic');

    expect(invokeMock).toHaveBeenCalledWith('ai-complete', {
      body: expect.objectContaining({ jsonMode: true }),
    });
    expect(tree).toEqual({ label: 'Topic', children: [] });
  });

  it('parses a well-formed structured response into the expected shape', async () => {
    const payload = {
      title: 'Learn Rust',
      description: 'A roadmap.',
      estimatedDurationWeeks: 6,
      difficulty: 'beginner',
      phases: [],
    };
    invokeMock.mockResolvedValue({ data: { text: JSON.stringify(payload) }, error: null });
    const service = new GeminiService();

    const roadmap = await service.generateRoadmap('Learn Rust');
    expect(roadmap).toEqual(payload);
  });

  it('throws a clear error when the edge function itself errors', async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: 'FunctionsHttpError: 500' } });
    const service = new GeminiService();

    await expect(service.summarizeDocument('text', 'title')).rejects.toThrow(/AI request failed/);
  });

  it('throws a clear error when the response has no usable text', async () => {
    invokeMock.mockResolvedValue({ data: { text: '' }, error: null });
    const service = new GeminiService();

    await expect(service.summarizeDocument('text', 'title')).rejects.toThrow(/empty response/i);
  });

  it('propagates a JSON.parse failure when the model returns malformed JSON', async () => {
    invokeMock.mockResolvedValue({ data: { text: 'not valid json {' }, error: null });
    const service = new GeminiService();

    await expect(service.generateMindMapTree('Topic')).rejects.toThrow();
  });

  it('includes study material in the roadmap prompt only when provided', async () => {
    invokeMock.mockResolvedValue({
      data: { text: '{"title":"x","description":"x","estimatedDurationWeeks":1,"difficulty":"beginner","phases":[]}' },
      error: null,
    });
    const service = new GeminiService();

    await service.generateRoadmap('Learn X', { materialText: 'CHAPTER ONE CONTENT' });

    expect(invokeMock).toHaveBeenCalledWith(
      'ai-complete',
      expect.objectContaining({ body: expect.objectContaining({ prompt: expect.stringContaining('CHAPTER ONE CONTENT') }) })
    );
  });
});
