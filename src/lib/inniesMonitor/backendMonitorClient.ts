const DEFAULT_TIMEOUT_MS = 15_000;

export const CANONICAL_BACKEND_MONITOR_ACTIVITY_PATH = '/v1/admin/monitor/activity';
export const INNIES_MONITOR_USE_CANONICAL_BACKEND_FLAG = 'INNIES_MONITOR_USE_CANONICAL_BACKEND';

type AdminApiConfig = {
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
};

export type MonitorActivityLiveStatus = 'live' | 'stale' | 'degraded';

export type MonitorActivityStream = 'live_sessions' | 'latest_prompts' | 'archive_trail';

export type MonitorActivityKind =
  | 'session'
  | 'user'
  | 'assistant_final'
  | 'tool_call'
  | 'tool_result'
  | 'provider_switch'
  | 'request_message'
  | 'response_message'
  | 'attempt_status';

export type MonitorActivityItem = {
  id: string;
  stream: MonitorActivityStream;
  kind: MonitorActivityKind;
  occurredAt: string;
  title: string;
  detail: string | null;
  sessionKey: string | null;
  sessionType: 'cli' | 'openclaw' | null;
  provider: string | null;
  model: string | null;
  status: string | null;
  href: string | null;
};

export type MonitorActivityPayload = {
  generatedAt: string;
  liveStatus: MonitorActivityLiveStatus;
  items: MonitorActivityItem[];
};

export class InniesMonitorActivityError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'InniesMonitorActivityError';
    this.status = status;
    this.details = details ?? null;
  }
}

function readBooleanFlag(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

function parseJsonBody(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function readErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    if (typeof record.message === 'string' && record.message.trim().length > 0) {
      return record.message.trim();
    }
    if (typeof record.code === 'string' && record.code.trim().length > 0) {
      return record.code.trim();
    }
  }

  return fallback;
}

function readAdminApiConfig(env: NodeJS.ProcessEnv): AdminApiConfig {
  const baseUrl = env.INNIES_ADMIN_API_BASE_URL?.trim()
    || env.INNIES_BASE_URL?.trim();
  const apiKey = env.INNIES_ADMIN_API_KEY?.trim();
  const timeoutMs = Number(env.INNIES_ADMIN_API_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);

  if (!baseUrl) {
    throw new InniesMonitorActivityError(503, 'Missing INNIES_ADMIN_API_BASE_URL or INNIES_BASE_URL');
  }

  if (!apiKey) {
    throw new InniesMonitorActivityError(503, 'Missing INNIES_ADMIN_API_KEY');
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    apiKey,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? Math.floor(timeoutMs) : DEFAULT_TIMEOUT_MS,
  };
}

function isActivityStream(value: unknown): value is MonitorActivityStream {
  return value === 'live_sessions' || value === 'latest_prompts' || value === 'archive_trail';
}

function isActivityKind(value: unknown): value is MonitorActivityKind {
  return value === 'session'
    || value === 'user'
    || value === 'assistant_final'
    || value === 'tool_call'
    || value === 'tool_result'
    || value === 'provider_switch'
    || value === 'request_message'
    || value === 'response_message'
    || value === 'attempt_status';
}

function isActivityLiveStatus(value: unknown): value is MonitorActivityLiveStatus {
  return value === 'live' || value === 'stale' || value === 'degraded';
}

function isActivityItem(value: unknown): value is MonitorActivityItem {
  if (!value || typeof value !== 'object') return false;

  const record = value as Record<string, unknown>;
  const sessionType = record.sessionType;

  return typeof record.id === 'string'
    && isActivityStream(record.stream)
    && isActivityKind(record.kind)
    && typeof record.occurredAt === 'string'
    && typeof record.title === 'string'
    && (record.detail === null || typeof record.detail === 'string')
    && (record.sessionKey === null || typeof record.sessionKey === 'string')
    && (sessionType === null || sessionType === 'cli' || sessionType === 'openclaw')
    && (record.provider === null || typeof record.provider === 'string')
    && (record.model === null || typeof record.model === 'string')
    && (record.status === null || typeof record.status === 'string')
    && (record.href === null || typeof record.href === 'string');
}

function isActivityPayload(value: unknown): value is MonitorActivityPayload {
  if (!value || typeof value !== 'object') return false;

  const record = value as Record<string, unknown>;
  return typeof record.generatedAt === 'string'
    && isActivityLiveStatus(record.liveStatus)
    && Array.isArray(record.items)
    && record.items.every((item) => isActivityItem(item));
}

export function shouldUseCanonicalBackendMonitor(env: NodeJS.ProcessEnv = process.env): boolean {
  return readBooleanFlag(env[INNIES_MONITOR_USE_CANONICAL_BACKEND_FLAG]);
}

export async function fetchBackendMonitorActivityFeed(
  env: NodeJS.ProcessEnv = process.env,
): Promise<MonitorActivityPayload> {
  const config = readAdminApiConfig(env);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  const url = new URL(CANONICAL_BACKEND_MONITOR_ACTIVITY_PATH, `${config.baseUrl}/`);

  try {
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        'x-api-key': config.apiKey,
      },
      cache: 'no-store',
      signal: controller.signal,
    });
    const text = await response.text();
    const body = text.length > 0 ? parseJsonBody(text) : null;

    if (!response.ok) {
      throw new InniesMonitorActivityError(
        response.status,
        readErrorMessage(body, `Innies request failed (${response.status})`),
        body,
      );
    }

    if (!isActivityPayload(body)) {
      throw new InniesMonitorActivityError(502, 'Invalid canonical backend monitor payload', body);
    }

    return body;
  } catch (error) {
    if (error instanceof InniesMonitorActivityError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new InniesMonitorActivityError(504, `Timed out fetching ${CANONICAL_BACKEND_MONITOR_ACTIVITY_PATH}`);
    }

    throw new InniesMonitorActivityError(
      502,
      error instanceof Error ? error.message : `Failed to fetch ${CANONICAL_BACKEND_MONITOR_ACTIVITY_PATH}`,
    );
  } finally {
    clearTimeout(timeout);
  }
}
