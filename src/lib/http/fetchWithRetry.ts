export type RetryOptions = {
  /** Retries after the first attempt, so the total is retries + 1. */
  retries?: number;
  /** Delay before the first retry; doubles on each one after that. */
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Which responses are worth another attempt. */
  shouldRetryResponse?: (response: Response) => boolean;
};

const DEFAULT_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 400;
const DEFAULT_MAX_DELAY_MS = 5000;

// Transient server and rate-limit statuses. Other 4xx responses (and 404, which
// the game uses to mean "no puzzle today") describe the request itself, so
// repeating them would only delay the answer.
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

function isRetryableResponse(response: Response): boolean {
  return RETRYABLE_STATUSES.has(response.status);
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function parseRetryAfterMs(response: Response): number | null {
  const header = response.headers.get("Retry-After");

  if (!header) return null;

  const seconds = Number(header);

  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);

  const date = Date.parse(header);

  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

function backoffDelayMs(
  retryNumber: number,
  baseDelayMs: number,
  maxDelayMs: number,
): number {
  const exponential = Math.min(maxDelayMs, baseDelayMs * 2 ** retryNumber);

  // Jitter between 50% and 100% of the step so many clients that failed at
  // the same moment don't all retry at the same moment.
  return exponential * (0.5 + Math.random() * 0.5);
}

function sleep(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    function onAbort() {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Drop-in replacement for fetch that retries network failures and transient
 * server errors with exponential backoff and jitter.
 *
 * Callers keep their existing handling: when retries run out on a bad status
 * the last Response is returned, and when they run out on a network failure
 * the last error is thrown. Only use it for requests that are safe to repeat.
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: RetryOptions = {},
): Promise<Response> {
  const {
    retries = DEFAULT_RETRIES,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    maxDelayMs = DEFAULT_MAX_DELAY_MS,
    shouldRetryResponse = isRetryableResponse,
  } = options;

  for (let attempt = 0; ; attempt++) {
    const hasRetriesLeft = attempt < retries;
    let response: Response;

    try {
      response = await fetch(input, init);
    } catch (error) {
      if (isAbort(error) || !hasRetriesLeft) throw error;

      await sleep(backoffDelayMs(attempt, baseDelayMs, maxDelayMs), init?.signal);
      continue;
    }

    if (!hasRetriesLeft || !shouldRetryResponse(response)) return response;

    const retryAfterMs = parseRetryAfterMs(response);
    const delayMs =
      retryAfterMs === null
        ? backoffDelayMs(attempt, baseDelayMs, maxDelayMs)
        : Math.min(retryAfterMs, maxDelayMs);

    await sleep(delayMs, init?.signal);
  }
}
