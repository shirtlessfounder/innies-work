export const PUBLIC_LIVE_SESSIONS_PATH = '/v1/public/innies/live-sessions';

export type PublicLiveSessionTextEntry = {
  entryId: string;
  kind: 'user' | 'assistant_final';
  at: string;
  text: string;
};

export type PublicLiveSessionEntry = PublicLiveSessionTextEntry;

export type PublicLiveSession = {
  sessionKey: string;
  sessionType: string;
  displayTitle: string;
  startedAt: string;
  lastActivityAt: string;
  currentProvider: string | null;
  currentModel: string | null;
  entries: PublicLiveSessionEntry[];
};

export type PublicLiveSessionsFeed = {
  generatedAt: string;
  pollIntervalSeconds: number;
  idleTimeoutSeconds: number;
  historyWindowSeconds: number;
  sessions: PublicLiveSession[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function readNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readEntry(value: unknown): PublicLiveSessionEntry | null {
  if (!isRecord(value)) {
    return null;
  }

  const entryId = readString(value.entryId);
  const at = readString(value.at);
  const kind = readString(value.kind);

  if (!entryId || !at) {
    return null;
  }

  switch (kind) {
    case 'user':
    case 'assistant_final':
      return {
        entryId,
        kind,
        at,
        text: readString(value.text),
      };
    default:
      return null;
  }
}

function readSession(value: unknown): PublicLiveSession | null {
  if (!isRecord(value)) {
    return null;
  }

  const sessionKey = readString(value.sessionKey);
  const sessionType = readString(value.sessionType);
  const displayTitle = readString(value.displayTitle);
  const startedAt = readString(value.startedAt);
  const lastActivityAt = readString(value.lastActivityAt);

  if (!sessionKey || !sessionType || !displayTitle || !startedAt || !lastActivityAt) {
    return null;
  }

  const rawEntries = Array.isArray(value.entries) ? value.entries : [];

  return {
    sessionKey,
    sessionType,
    displayTitle,
    startedAt,
    lastActivityAt,
    currentProvider: readNullableString(value.currentProvider),
    currentModel: readNullableString(value.currentModel),
    entries: rawEntries
      .map(readEntry)
      .filter((entry): entry is PublicLiveSessionEntry => entry !== null),
  };
}

function readFeed(value: unknown): PublicLiveSessionsFeed {
  if (!isRecord(value)) {
    throw new Error('Live sessions payload was not an object');
  }

  const rawSessions = Array.isArray(value.sessions) ? value.sessions : [];
  const sessions = rawSessions
    .map(readSession)
    .filter((session): session is PublicLiveSession => session !== null)
    .sort((left, right) => Date.parse(right.lastActivityAt) - Date.parse(left.lastActivityAt));

  return {
    generatedAt: readString(value.generatedAt, new Date().toISOString()),
    pollIntervalSeconds: readNumber(value.pollIntervalSeconds, 30),
    idleTimeoutSeconds: readNumber(value.idleTimeoutSeconds, 900),
    historyWindowSeconds: readNumber(value.historyWindowSeconds, 3600),
    sessions,
  };
}

export async function fetchPublicLiveSessions(signal?: AbortSignal): Promise<PublicLiveSessionsFeed> {
  const baseUrl = process.env.NEXT_PUBLIC_INNIES_API_BASE_URL?.trim();

  if (!baseUrl) {
    throw new Error('Missing NEXT_PUBLIC_INNIES_API_BASE_URL');
  }

  const response = await fetch(new URL(PUBLIC_LIVE_SESSIONS_PATH, `${baseUrl}/`).toString(), {
    method: 'GET',
    cache: 'no-store',
    headers: {
      accept: 'application/json',
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Live sessions request failed: ${response.status}`);
  }

  return readFeed(await response.json());
}
