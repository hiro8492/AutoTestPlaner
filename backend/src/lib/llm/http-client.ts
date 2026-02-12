export const DEFAULT_REQUEST_TIMEOUT_MS = 60_000;

interface SafeRequestOptions {
  timeoutMs?: number;
  errorLabel: string;
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  options: SafeRequestOptions,
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`${options.errorLabel}: request timeout (${timeoutMs}ms)`);
    }
    throw new Error(
      `${options.errorLabel}: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function readErrorBody(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '<failed to read error body>';
  }
}

export function assertValidUrl(value: string, fieldName: string): string {
  const trimmed = value.trim();
  const parsed = new URL(trimmed);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${fieldName} must use http(s)`);
  }
  return parsed.toString().replace(/\/$/, '');
}
