// Server-side proxy to the Innies admin live-sessions endpoint.
//
// The INNIES_ADMIN_API_KEY is a server-only env var (no NEXT_PUBLIC_ prefix),
// so the browser never sees it. The UI calls `/api/innies/live-sessions`
// and Next.js forwards it to Innies using that key.
//
// Upstream contract:
//   GET {INNIES_API_BASE_URL}/v1/admin/me/live-sessions
//     ?api_key_ids=<csv>&window_hours=24
//     headers: x-api-key: {INNIES_ADMIN_API_KEY}

export const dynamic = 'force-dynamic';

const DEFAULT_WINDOW_HOURS = 24;
const DEFAULT_TIMEOUT_MS = 15_000;

class RouteConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RouteConfigError';
  }
}

function readEnv(name: string): string {
  const value = process.env[name];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new RouteConfigError(`Missing env ${name}`);
  }
  return value.trim();
}

function readOptionalNumber(raw: string | null): number | null {
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export async function GET(request: Request) {
  try {
    const baseUrl = readEnv('INNIES_API_BASE_URL');
    const adminApiKey = readEnv('INNIES_ADMIN_API_KEY');
    const apiKeyIds = readEnv('INNIES_MONITOR_API_KEY_IDS');

    const url = new URL(request.url);
    const windowHours =
      readOptionalNumber(url.searchParams.get('window_hours')) ?? DEFAULT_WINDOW_HOURS;

    const upstream = new URL('/v1/admin/me/live-sessions', `${baseUrl}/`);
    upstream.searchParams.set('api_key_ids', apiKeyIds);
    upstream.searchParams.set('window_hours', String(windowHours));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

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
      return Response.json(
        {
          code: 'upstream_error',
          message: `Upstream ${response.status}: ${body.slice(0, 500)}`
        },
        {
          status: response.status === 401 || response.status === 403 ? 502 : response.status,
          headers: { 'cache-control': 'no-store' }
        }
      );
    }

    const payload = await response.json();
    return Response.json(payload, {
      headers: { 'cache-control': 'no-store' }
    });
  } catch (error) {
    if (error instanceof RouteConfigError) {
      return Response.json(
        { code: 'config_error', message: error.message },
        { status: 503, headers: { 'cache-control': 'no-store' } }
      );
    }

    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { code: 'internal_error', message },
      { status: 500, headers: { 'cache-control': 'no-store' } }
    );
  }
}
