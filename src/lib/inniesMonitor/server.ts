const DEFAULT_TIMEOUT_MS = 15_000;
const ARCHIVE_WINDOW = '7d';
const ARCHIVE_SESSION_LIMIT = 12;
const ARCHIVE_EVENT_SESSION_FANOUT = 6;
const ARCHIVE_EVENTS_PER_SESSION_LIMIT = 8;
const MAX_ACTIVITY_ITEMS = 160;
const INNIES_INTERNAL_ORG_ID = '818d0cc7-7ed2-469f-b690-a977e72a921d';

type ApiConfig = {
  baseUrl: string;
  timeoutMs: number;
};

type AdminApiConfig = ApiConfig & {
  apiKey: string;
};

type FetchableConfig = ApiConfig | AdminApiConfig;

type PublicLiveSessionEntry =
  | {
    entryId?: string;
    kind?: 'user' | 'assistant_final';
    at?: string;
    text?: string;
  }
  | {
    entryId?: string;
    kind?: 'tool_call';
    at?: string;
    toolName?: string;
    argsText?: string;
  }
  | {
    entryId?: string;
    kind?: 'tool_result';
    at?: string;
    text?: string;
  }
  | {
    entryId?: string;
    kind?: 'provider_switch';
    at?: string;
    fromProvider?: string | null;
    toProvider?: string;
    fromModel?: string | null;
    toModel?: string;
  };

type PublicLiveSession = {
  sessionKey?: string;
  sessionType?: 'cli' | 'openclaw';
  displayTitle?: string;
  startedAt?: string;
  endedAt?: string;
  lastActivityAt?: string;
  currentProvider?: string | null;
  currentModel?: string | null;
  entries?: PublicLiveSessionEntry[];
};

type PublicLiveSessionsFeed = {
  generatedAt?: string;
  pollIntervalSeconds?: number;
  sessions?: PublicLiveSession[];
};

type ArchiveSessionSummary = {
  sessionKey?: string;
  sessionType?: 'cli' | 'openclaw';
  startedAt?: string;
  endedAt?: string;
  providerSet?: string[];
  modelSet?: string[];
  statusSummary?: Record<string, number>;
  previewSample?: {
    promptPreview?: string | null;
    responsePreview?: string | null;
  } | null;
};

type ArchiveSessionsResponse = {
  sessions?: ArchiveSessionSummary[];
};

type ArchiveSessionEvent = {
  eventType?: 'request_message' | 'response_message' | 'attempt_status';
  eventTime?: string;
  requestId?: string;
  attemptNo?: number;
  content?: unknown;
  provider?: string;
  model?: string;
  status?: string;
};

type ArchiveSessionEventsResponse = {
  sessionKey?: string;
  events?: ArchiveSessionEvent[];
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

type ActivityNormalizationInput = {
  liveSessionsFeed: PublicLiveSessionsFeed | null;
  archiveSessions: ArchiveSessionsResponse | null;
  archiveEventsBySession: Map<string, ArchiveSessionEventsResponse>;
};

type SourceFailure = {
  source: string;
  status: number;
  message: string;
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

function readBaseApiConfig(): ApiConfig {
  const baseUrl = process.env.INNIES_API_BASE_URL?.trim()
    || process.env.INNIES_BASE_URL?.trim();
  const timeoutMs = Number(process.env.INNIES_API_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);

  if (!baseUrl) {
    throw new InniesMonitorActivityError(503, 'Missing INNIES_API_BASE_URL or INNIES_BASE_URL');
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? Math.floor(timeoutMs) : DEFAULT_TIMEOUT_MS,
  };
}

function readAdminApiConfig(): AdminApiConfig {
  const baseUrl = process.env.INNIES_ADMIN_API_BASE_URL?.trim()
    || process.env.INNIES_BASE_URL?.trim();
  const apiKey = process.env.INNIES_ADMIN_API_KEY?.trim();
  const timeoutMs = Number(process.env.INNIES_ADMIN_API_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);

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
      return record.message;
    }
    if (typeof record.code === 'string' && record.code.trim().length > 0) {
      return record.code;
    }
  }
  return fallback;
}

async function fetchJson<T>(input: {
  config: FetchableConfig;
  path: string;
  query?: Record<string, string | number | null | undefined>;
}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.config.timeoutMs);
  const url = new URL(input.path, `${input.config.baseUrl}/`);

  for (const [key, value] of Object.entries(input.query ?? {})) {
    if (value !== undefined && value !== null && String(value).trim().length > 0) {
      url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {
    accept: 'application/json',
  };

  if ('apiKey' in input.config) {
    headers['x-api-key'] = input.config.apiKey;
  }

  try {
    const response = await fetch(url, {
      headers,
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

    return body as T;
  } catch (error) {
    if (error instanceof InniesMonitorActivityError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new InniesMonitorActivityError(504, `Timed out fetching ${input.path}`);
    }
    throw new InniesMonitorActivityError(
      502,
      error instanceof Error ? error.message : `Failed to fetch ${input.path}`,
    );
  } finally {
    clearTimeout(timeout);
  }
}

function toFailure(source: string, error: unknown): SourceFailure {
  if (error instanceof InniesMonitorActivityError) {
    return {
      source,
      status: error.status,
      message: error.message,
    };
  }

  return {
    source,
    status: 500,
    message: error instanceof Error ? error.message : 'Unexpected activity failure',
  };
}

function toIsoOrNull(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function toTrimmedString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function compactText(value: string | null, maxLength = 240): string | null {
  if (!value) return null;
  const compacted = value.replace(/\s+/g, ' ').trim();
  if (compacted.length === 0) return null;
  return compacted.length <= maxLength ? compacted : `${compacted.slice(0, maxLength - 1)}…`;
}

function describeProviderModel(provider: string | null, model: string | null): string | null {
  const parts = [provider, model].filter((value): value is string => Boolean(value));
  return parts.length > 0 ? parts.join(' / ') : null;
}

function summarizeArchiveContent(content: unknown): string | null {
  if (typeof content === 'string') {
    return compactText(content);
  }

  if (!Array.isArray(content)) return null;

  const text = content
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      if (typeof record.text === 'string') return record.text;
      if (typeof record.content === 'string') return record.content;
      return null;
    })
    .filter((entry): entry is string => Boolean(entry))
    .join(' ');

  return compactText(text);
}

function deriveArchiveStatus(statusSummary: Record<string, number> | null | undefined): string | null {
  if (!statusSummary) return null;
  if ((statusSummary.failed ?? 0) > 0) return 'failed';
  if ((statusSummary.partial ?? 0) > 0) return 'partial';
  if ((statusSummary.success ?? 0) > 0) return 'success';
  return null;
}

function buildArchiveSessionHref(sessionKey: string): string {
  return `/v1/admin/archive/sessions/${encodeURIComponent(sessionKey)}`;
}

function buildArchiveEventsHref(sessionKey: string): string {
  return `/v1/admin/archive/sessions/${encodeURIComponent(sessionKey)}/events`;
}

export function normalizeActivityItems(input: ActivityNormalizationInput): MonitorActivityItem[] {
  const items: MonitorActivityItem[] = [];

  for (const session of input.liveSessionsFeed?.sessions ?? []) {
    const sessionKey = toTrimmedString(session.sessionKey);
    const sessionType = session.sessionType ?? null;
    const occurredAt = toIsoOrNull(session.lastActivityAt) ?? toIsoOrNull(session.endedAt);
    if (!sessionKey || !occurredAt) continue;

    const provider = toTrimmedString(session.currentProvider);
    const model = toTrimmedString(session.currentModel);

    items.push({
      id: `live-session:${sessionKey}`,
      stream: 'live_sessions',
      kind: 'session',
      occurredAt,
      title: toTrimmedString(session.displayTitle) ?? sessionKey,
      detail: describeProviderModel(provider, model),
      sessionKey,
      sessionType,
      provider,
      model,
      status: 'live',
      href: null,
    });

    for (const entry of session.entries ?? []) {
      const entryId = toTrimmedString(entry.entryId);
      const entryAt = toIsoOrNull(entry.at);
      if (!entryId || !entryAt || !entry.kind) continue;

      const baseItem = {
        id: entryId,
        stream: 'latest_prompts' as const,
        occurredAt: entryAt,
        sessionKey,
        sessionType,
        provider,
        model,
        status: null,
        href: null,
      };

      switch (entry.kind) {
        case 'user':
        case 'assistant_final':
        case 'tool_result': {
          items.push({
            ...baseItem,
            kind: entry.kind,
            title: compactText(toTrimmedString(entry.text)) ?? `${sessionKey} ${entry.kind}`,
            detail: toTrimmedString(session.displayTitle),
          });
          break;
        }
        case 'tool_call': {
          items.push({
            ...baseItem,
            kind: 'tool_call',
            title: compactText(toTrimmedString(entry.toolName)) ?? `${sessionKey} tool call`,
            detail: compactText(toTrimmedString(entry.argsText)),
          });
          break;
        }
        case 'provider_switch': {
          const fromProvider = toTrimmedString(entry.fromProvider);
          const toProvider = toTrimmedString(entry.toProvider);
          const fromModel = toTrimmedString(entry.fromModel);
          const toModel = toTrimmedString(entry.toModel);
          items.push({
            ...baseItem,
            kind: 'provider_switch',
            title: compactText(`${fromProvider ?? 'unknown'} -> ${toProvider ?? 'unknown'}`) ?? 'provider switch',
            detail: describeProviderModel(fromModel, toModel),
          });
          break;
        }
      }
    }
  }

  for (const session of input.archiveSessions?.sessions ?? []) {
    const sessionKey = toTrimmedString(session.sessionKey);
    const occurredAt = toIsoOrNull(session.endedAt) ?? toIsoOrNull(session.startedAt);
    if (!sessionKey || !occurredAt) continue;

    const provider = toTrimmedString(session.providerSet?.[0]);
    const model = toTrimmedString(session.modelSet?.[0]);

    items.push({
      id: `archive-session:${sessionKey}`,
      stream: 'archive_trail',
      kind: 'session',
      occurredAt,
      title: sessionKey,
      detail: compactText(
        toTrimmedString(session.previewSample?.promptPreview)
        ?? toTrimmedString(session.previewSample?.responsePreview)
        ?? describeProviderModel(provider, model),
      ),
      sessionKey,
      sessionType: session.sessionType ?? null,
      provider,
      model,
      status: deriveArchiveStatus(session.statusSummary),
      href: buildArchiveSessionHref(sessionKey),
    });

    const eventPage = input.archiveEventsBySession.get(sessionKey);
    for (const event of eventPage?.events ?? []) {
      const eventType = event.eventType;
      const eventTime = toIsoOrNull(event.eventTime);
      if (!eventType || !eventTime) continue;

      const eventProvider = toTrimmedString(event.provider) ?? provider;
      const eventModel = toTrimmedString(event.model) ?? model;

      items.push({
        id: `archive-event:${sessionKey}:${toTrimmedString(event.requestId) ?? 'request'}:${event.attemptNo ?? 0}:${eventType}:${eventTime}`,
        stream: 'archive_trail',
        kind: eventType,
        occurredAt: eventTime,
        title: eventType === 'attempt_status'
          ? compactText(`Attempt ${toTrimmedString(event.status) ?? 'unknown'}`) ?? 'Attempt update'
          : summarizeArchiveContent(event.content) ?? `${sessionKey} ${eventType}`,
        detail: describeProviderModel(eventProvider, eventModel),
        sessionKey,
        sessionType: session.sessionType ?? null,
        provider: eventProvider,
        model: eventModel,
        status: toTrimmedString(event.status),
        href: buildArchiveEventsHref(sessionKey),
      });
    }
  }

  return items
    .filter((item) => item.title.trim().length > 0)
    .sort((left, right) =>
      Date.parse(right.occurredAt) - Date.parse(left.occurredAt)
      || right.id.localeCompare(left.id)
    )
    .slice(0, MAX_ACTIVITY_ITEMS);
}

function deriveLiveStatus(input: {
  generatedAt: string;
  liveSessionsFeed: PublicLiveSessionsFeed | null;
  failures: SourceFailure[];
}): MonitorActivityLiveStatus {
  if (input.failures.length > 0) return 'degraded';

  const generatedAtMs = Date.parse(input.generatedAt);
  const publicGeneratedAtMs = Date.parse(input.liveSessionsFeed?.generatedAt ?? '');
  const pollIntervalSeconds = Number(input.liveSessionsFeed?.pollIntervalSeconds ?? 0);
  const staleAfterMs = Math.max(60_000, pollIntervalSeconds * 3 * 1000);

  if (Number.isFinite(publicGeneratedAtMs) && generatedAtMs - publicGeneratedAtMs > staleAfterMs) {
    return 'stale';
  }

  return 'live';
}

export async function getInniesMonitorActivityFeed(): Promise<MonitorActivityPayload> {
  const generatedAt = new Date().toISOString();
  const [liveResult, archiveSessionsResult] = await Promise.allSettled([
    fetchJson<PublicLiveSessionsFeed>({
      config: readBaseApiConfig(),
      path: '/v1/public/innies/live-sessions',
    }),
    fetchJson<ArchiveSessionsResponse>({
      config: readAdminApiConfig(),
      path: '/v1/admin/archive/sessions',
      query: {
        window: ARCHIVE_WINDOW,
        orgId: INNIES_INTERNAL_ORG_ID,
        limit: ARCHIVE_SESSION_LIMIT,
      },
    }),
  ]);

  const failures: SourceFailure[] = [];
  const liveSessionsFeed = liveResult.status === 'fulfilled'
    ? liveResult.value
    : (failures.push(toFailure('public_live_sessions', liveResult.reason)), null);
  const archiveSessions = archiveSessionsResult.status === 'fulfilled'
    ? archiveSessionsResult.value
    : (failures.push(toFailure('archive_sessions', archiveSessionsResult.reason)), null);
  const archiveEventsBySession = new Map<string, ArchiveSessionEventsResponse>();

  if (archiveSessions?.sessions?.length) {
    const adminConfig = readAdminApiConfig();
    const eventResults = await Promise.allSettled(
      archiveSessions.sessions
        .slice(0, ARCHIVE_EVENT_SESSION_FANOUT)
        .map(async (session) => {
          const sessionKey = toTrimmedString(session.sessionKey);
          if (!sessionKey) return null;
          return fetchJson<ArchiveSessionEventsResponse>({
            config: adminConfig,
            path: buildArchiveEventsHref(sessionKey),
            query: {
              limit: ARCHIVE_EVENTS_PER_SESSION_LIMIT,
            },
          });
        }),
    );

    for (let index = 0; index < eventResults.length; index += 1) {
      const result = eventResults[index];
      const sessionKey = toTrimmedString(archiveSessions.sessions[index]?.sessionKey);

      if (result.status === 'fulfilled') {
        if (result.value && sessionKey) {
          archiveEventsBySession.set(sessionKey, result.value);
        }
        continue;
      }

      failures.push(toFailure(`archive_session_events:${sessionKey ?? index}`, result.reason));
    }
  }

  const items = normalizeActivityItems({
    liveSessionsFeed,
    archiveSessions,
    archiveEventsBySession,
  });

  if (!liveSessionsFeed && !archiveSessions) {
    throw new InniesMonitorActivityError(500, 'Innies monitor activity feed unavailable', {
      failures,
    });
  }

  return {
    generatedAt,
    liveStatus: deriveLiveStatus({
      generatedAt,
      liveSessionsFeed,
      failures,
    }),
    items,
  };
}
