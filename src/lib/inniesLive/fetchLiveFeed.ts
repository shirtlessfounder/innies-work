// Server-only upstream fetcher for the Innies live-sessions feed.
// Shared by `src/app/api/innies/live-sessions/route.ts` and
// `src/app/v2/layout.tsx` (SSR prefetch so the watch-me-work tab isn't
// blank on first paint).

import type { InniesLiveFeed } from './feedTypes';

const DEFAULT_UPSTREAM_TIMEOUT_MS = 15_000;
const DEFAULT_PREFETCH_TIMEOUT_MS = 2_500;

type FetchOpts = {
  windowHours: number;
  /**
   * Abort the upstream fetch after this many ms. Prefetch from the layout
   * uses a shorter cap so a slow upstream doesn't block the landing page.
   */
  timeoutMs?: number;
};

export class InniesFeedConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InniesFeedConfigError';
  }
}

export class InniesFeedUpstreamError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'InniesFeedUpstreamError';
  }
}

function readEnv(name: string): string {
  const value = process.env[name];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new InniesFeedConfigError(`Missing env ${name}`);
  }
  return value.trim();
}

export async function fetchInniesLiveFeed(opts: FetchOpts): Promise<InniesLiveFeed> {
  const baseUrl = readEnv('INNIES_API_BASE_URL');
  const adminApiKey = readEnv('INNIES_ADMIN_API_KEY');
  const apiKeyIds = readEnv('INNIES_MONITOR_API_KEY_IDS');

  const upstream = new URL('/v1/admin/me/live-sessions', `${baseUrl}/`);
  upstream.searchParams.set('api_key_ids', apiKeyIds);
  upstream.searchParams.set('window_hours', String(opts.windowHours));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_UPSTREAM_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(upstream, {
      method: 'GET',
      headers: {
        'x-api-key': adminApiKey,
        accept: 'application/json'
      },
      cache: 'no-store',
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new InniesFeedUpstreamError(
      response.status,
      `Upstream ${response.status}: ${body.slice(0, 500)}`
    );
  }

  return (await response.json()) as InniesLiveFeed;
}

/**
 * Best-effort prefetch for SSR. Swallows errors (including timeouts) — the
 * client hook will retry. Null means "render the blank state, let the
 * client take over". A short cap keeps the landing page off the critical
 * path of a slow upstream.
 */
export async function prefetchInniesLiveFeed(windowHours: number): Promise<InniesLiveFeed | null> {
  try {
    return await fetchInniesLiveFeed({
      windowHours,
      timeoutMs: DEFAULT_PREFETCH_TIMEOUT_MS
    });
  } catch {
    return null;
  }
}
