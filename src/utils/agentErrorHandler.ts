// Error classification + retry helper shared by every agent-system call in src/services/agentService.ts.

export enum AgentErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_INPUT = 'INVALID_INPUT',
  UNKNOWN = 'UNKNOWN',
}

const RETRYABLE_TYPES = new Set<AgentErrorType>([AgentErrorType.NETWORK_ERROR, AgentErrorType.TIMEOUT, AgentErrorType.RATE_LIMITED]);

export class AgentError extends Error {
  readonly type: AgentErrorType;

  constructor(message: string, type: AgentErrorType) {
    super(message);
    this.name = 'AgentError';
    this.type = type;
  }

  get isRetryable(): boolean {
    return RETRYABLE_TYPES.has(this.type);
  }
}

export function classifyError(err: unknown): AgentError {
  if (err instanceof AgentError) return err;

  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (lower.includes('400') || lower.includes('invalid') || lower.includes('validation')) {
    return new AgentError(message, AgentErrorType.INVALID_INPUT);
  }
  if (lower.includes('429') || lower.includes('rate limit') || lower.includes('too many requests')) {
    return new AgentError(message, AgentErrorType.RATE_LIMITED);
  }
  if (lower.includes('timeout') || lower.includes('timed out') || lower.includes('aborted')) {
    return new AgentError(message, AgentErrorType.TIMEOUT);
  }
  if (lower.includes('network') || lower.includes('fetch failed') || lower.includes('failed to fetch')) {
    return new AgentError(message, AgentErrorType.NETWORK_ERROR);
  }
  return new AgentError(message, AgentErrorType.UNKNOWN);
}

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
}

/** Retries `fn` with exponential backoff, but only for retryable error types. */
export async function runWithRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { maxRetries = 3, initialDelayMs = 1000 } = options;

  let lastError: AgentError = new AgentError('runWithRetry called with zero attempts.', AgentErrorType.UNKNOWN);
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = classifyError(err);
      const isLastAttempt = attempt === maxRetries;
      if (!lastError.isRetryable || isLastAttempt) {
        throw lastError;
      }
      const delayMs = initialDelayMs * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}
