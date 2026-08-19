import { beforeEach, describe, expect, it, vi } from 'vitest';

// Same boundary-mocking approach as ai/gemini.test.ts: agentService never touches a real
// Supabase project in tests, only the invoke()/from() surface it depends on.
const invokeMock = vi.hoisted(() => vi.fn());
const fromMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase', () => ({
  supabase: { functions: { invoke: invokeMock }, from: fromMock },
}));

import {
  autoScanAndClassify,
  buildGmailAuthUrl,
  classifyEmails,
  dismissEmailJob,
  fetchEmailMonitoringJobs,
} from '@/services/agentService';

function chainable(result: { data: unknown; error: unknown }) {
  const obj: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'not', 'order', 'limit', 'update', 'upsert', 'insert', 'gte', 'maybeSingle', 'single'];
  for (const method of methods) {
    obj[method] = vi.fn(() => obj);
  }
  (obj as { then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => unknown }).then = (resolve, reject) =>
    Promise.resolve(result).then(resolve, reject);
  return obj;
}

describe('classifyEmails', () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it('invokes classify-emails with the userId and returns its result on success', async () => {
    invokeMock.mockResolvedValue({ data: { scanned: 12, detected: 3 }, error: null });

    const result = await classifyEmails('user-1');

    expect(invokeMock).toHaveBeenCalledWith('classify-emails', { body: { userId: 'user-1' } });
    expect(result).toEqual({ scanned: 12, detected: 3 });
  });

  it('rejects when the edge function reports a validation error (e.g. missing userId)', async () => {
    invokeMock.mockResolvedValue({
      data: null,
      error: new Error('Request body must include a "userId" string.'),
    });

    await expect(classifyEmails('')).rejects.toThrow(/userId/);
    expect(invokeMock).toHaveBeenCalledOnce();
  });
});

describe('fetchEmailMonitoringJobs', () => {
  it('maps snake_case rows to the domain EmailMonitoringJob shape', async () => {
    fromMock.mockReturnValue(
      chainable({
        data: [
          {
            id: 'job-1',
            user_id: 'user-1',
            gmail_message_id: 'msg-1',
            sender: 'boss@company.com',
            subject: 'System design interview next week',
            snippet: 'Please prepare...',
            learning_goal: 'Prepare for system design interview',
            urgency: 'high',
            confidence: 0.9,
            context: 'An interview was mentioned with a date.',
            suggested_actions: ['Review system design fundamentals'],
            roadmap_id: null,
            is_dismissed: false,
            created_at: '2026-01-01T00:00:00.000Z',
            updated_at: '2026-01-01T00:00:00.000Z',
          },
        ],
        error: null,
      })
    );

    const jobs = await fetchEmailMonitoringJobs('user-1');

    expect(fromMock).toHaveBeenCalledWith('email_monitoring_jobs');
    expect(jobs).toEqual([
      expect.objectContaining({
        id: 'job-1',
        learningGoal: 'Prepare for system design interview',
        urgency: 'high',
        suggestedActions: ['Review system design fundamentals'],
        isDismissed: false,
      }),
    ]);
  });

  function emailRow(id: string, urgency: 'high' | 'medium' | 'low', createdAt: string) {
    return {
      id,
      user_id: 'user-1',
      gmail_message_id: `msg-${id}`,
      sender: null,
      subject: `Subject ${id}`,
      snippet: null,
      learning_goal: `Goal ${id}`,
      urgency,
      confidence: 0.9,
      context: null,
      suggested_actions: [],
      roadmap_id: null,
      is_dismissed: false,
      created_at: createdAt,
      updated_at: createdAt,
    };
  }

  it('sorts high-urgency emails before medium and low, regardless of arrival order', async () => {
    // Rows deliberately arrive newest-first with urgency out of priority order — the database
    // query only orders by created_at, so it's fetchEmailMonitoringJobs's own client-side sort
    // that must put "high" first.
    fromMock.mockReturnValue(
      chainable({
        data: [
          emailRow('low-1', 'low', '2026-01-03T00:00:00.000Z'),
          emailRow('medium-1', 'medium', '2026-01-02T00:00:00.000Z'),
          emailRow('high-1', 'high', '2026-01-01T00:00:00.000Z'),
        ],
        error: null,
      })
    );

    const jobs = await fetchEmailMonitoringJobs('user-1');

    expect(jobs.map((j) => j.id)).toEqual(['high-1', 'medium-1', 'low-1']);
  });

  it('breaks ties within the same urgency by most-recent first', async () => {
    fromMock.mockReturnValue(
      chainable({
        data: [
          emailRow('high-old', 'high', '2026-01-01T00:00:00.000Z'),
          emailRow('high-new', 'high', '2026-01-05T00:00:00.000Z'),
        ],
        error: null,
      })
    );

    const jobs = await fetchEmailMonitoringJobs('user-1');

    expect(jobs.map((j) => j.id)).toEqual(['high-new', 'high-old']);
  });
});

describe('autoScanAndClassify', () => {
  beforeEach(() => {
    invokeMock.mockReset();
    fromMock.mockReset();
  });

  it('is a silent no-op — does not call classify-emails — when the inbox scan finds nothing new', async () => {
    invokeMock.mockResolvedValueOnce({ data: { messages: [] }, error: null });

    const result = await autoScanAndClassify('user-1');

    expect(result).toEqual({ scanned: 0, detected: 0 });
    expect(invokeMock).toHaveBeenCalledOnce();
    expect(invokeMock).toHaveBeenCalledWith('gmail-fetch-messages', { body: { maxResults: 50 } });
  });

  it('classifies newly-scanned messages when the inbox scan finds new mail', async () => {
    fromMock.mockReturnValue(chainable({ data: null, error: null }));
    invokeMock
      .mockResolvedValueOnce({
        data: { messages: [{ id: 'm1', threadId: 't1', sender: 'a@b.com', subject: 'Hi', body: 'body', timestamp: '2026-01-01T00:00:00.000Z' }] },
        error: null,
      })
      .mockResolvedValueOnce({ data: { scanned: 1, detected: 1 }, error: null });

    const result = await autoScanAndClassify('user-1');

    expect(result).toEqual({ scanned: 1, detected: 1 });
    expect(invokeMock).toHaveBeenCalledTimes(2);
    expect(invokeMock).toHaveBeenNthCalledWith(2, 'classify-emails', { body: { userId: 'user-1' } });
  });
});

describe('dismissEmailJob', () => {
  it('throws when the underlying update fails', async () => {
    fromMock.mockReturnValue(chainable({ data: null, error: { message: 'row not found' } }));
    await expect(dismissEmailJob('missing-job')).rejects.toMatchObject({ message: 'row not found' });
  });
});

describe('buildGmailAuthUrl', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('throws when VITE_GMAIL_CLIENT_ID is not configured', () => {
    vi.stubEnv('VITE_GMAIL_CLIENT_ID', '');
    expect(() => buildGmailAuthUrl('https://app.example.com/app/settings')).toThrow(/VITE_GMAIL_CLIENT_ID/);
  });

  it('builds a Google OAuth consent URL with the expected scope and redirect_uri', () => {
    vi.stubEnv('VITE_GMAIL_CLIENT_ID', 'test-client-id.apps.googleusercontent.com');
    const url = buildGmailAuthUrl('https://app.example.com/app/settings');
    const parsed = new URL(url);

    expect(parsed.origin + parsed.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(parsed.searchParams.get('client_id')).toBe('test-client-id.apps.googleusercontent.com');
    expect(parsed.searchParams.get('redirect_uri')).toBe('https://app.example.com/app/settings');
    expect(parsed.searchParams.get('scope')).toContain('gmail.readonly');
  });
});
