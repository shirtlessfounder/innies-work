// Server-side proxy to the Innies admin live-sessions endpoint.
//
// The INNIES_ADMIN_API_KEY is a server-only env var (no NEXT_PUBLIC_ prefix),
// so the browser never sees it. The UI calls `/api/innies/live-sessions`
// and Next.js forwards it to Innies using that key.
//
// Upstream contract:
//   GET {INNIES_API_BASE_URL}/v1/admin/me/live-sessions
//     ?api_key_ids=<csv>&window_hours=12
//     headers: x-api-key: {INNIES_ADMIN_API_KEY}

import {
  fetchInniesLiveFeed,
  InniesFeedConfigError,
  InniesFeedUpstreamError
} from '../../../../lib/inniesLive/fetchLiveFeed';

export const dynamic = 'force-dynamic';

const DEFAULT_WINDOW_HOURS = 12;

function readOptionalNumber(raw: string | null): number | null {
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const windowHours =
      readOptionalNumber(url.searchParams.get('window_hours')) ?? DEFAULT_WINDOW_HOURS;

    const payload = await fetchInniesLiveFeed({ windowHours });
    return Response.json(payload, {
      headers: { 'cache-control': 'no-store' }
    });
  } catch (error) {
    if (error instanceof InniesFeedConfigError) {
      return Response.json(
        { code: 'config_error', message: error.message },
        { status: 503, headers: { 'cache-control': 'no-store' } }
      );
    }

    if (error instanceof InniesFeedUpstreamError) {
      return Response.json(
        { code: 'upstream_error', message: error.message },
        {
          status: error.status === 401 || error.status === 403 ? 502 : error.status,
          headers: { 'cache-control': 'no-store' }
        }
      );
    }

    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { code: 'internal_error', message },
      { status: 500, headers: { 'cache-control': 'no-store' } }
    );
  }
}
