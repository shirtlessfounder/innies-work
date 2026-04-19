const MONTH_INDEX = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

export function buildRequestSessionKey(requestId) {
  const normalized = typeof requestId === 'string' ? requestId.trim() : '';
  return normalized ? `cli:request:${normalized}` : null;
}

export function buildOpenclawSessionKey(sessionId) {
  const normalized = typeof sessionId === 'string' ? sessionId.trim() : '';
  return normalized ? `cli:openclaw:${normalized}` : null;
}

export function parseJournalLatencyBlocks(text, options = {}) {
  const year = Number.isInteger(options.year) ? options.year : new Date().getUTCFullYear();
  const lines = String(text ?? '').split('\n');
  const blocks = [];
  let current = null;

  for (const line of lines) {
    if (line.includes('[stream-latency] {')) {
      if (current?.requestId && current?.credentialLabel && current?.occurredAt) {
        blocks.push(current);
      }
      current = {
        requestId: null,
        credentialLabel: null,
        occurredAt: parseJournalTimestamp(line, year),
      };
      continue;
    }

    if (!current) {
      continue;
    }

    const requestIdMatch = line.match(/requestId:\s*'([^']+)'/);
    if (requestIdMatch) {
      current.requestId = requestIdMatch[1];
    }

    const credentialLabelMatch = line.match(/credential_label:\s*'([^']+)'/);
    if (credentialLabelMatch) {
      current.credentialLabel = credentialLabelMatch[1];
    }

    if (line.trim().endsWith('}')) {
      if (current.requestId && current.credentialLabel && current.occurredAt) {
        blocks.push(current);
      }
      current = null;
    }
  }

  if (current?.requestId && current?.credentialLabel && current?.occurredAt) {
    blocks.push(current);
  }

  return blocks;
}

export function buildOverlaySession(detail) {
  const attempt = detail?.attempt ?? null;
  if (!attempt || attempt.requestSource !== 'direct') {
    return null;
  }

  const requestId = typeof attempt.requestId === 'string' ? attempt.requestId.trim() : '';
  const sessionKey = buildRequestSessionKey(requestId);
  if (!sessionKey) {
    return null;
  }

  const lastActivityAt = toIso(attempt.completedAt ?? attempt.startedAt);
  if (!lastActivityAt) {
    return null;
  }

  const entries = buildEntries(detail?.request ?? [], lastActivityAt, {
    attemptIdentity: buildLocalAttemptIdentity(attempt),
  });

  return {
    sessionKey,
    sessionType: 'cli',
    displayTitle: `cli ${shortSessionLabel(sessionKey)}`,
    buyerApiKeyId: readText(attempt.apiKeyId),
    startedAt: toIso(attempt.startedAt) ?? lastActivityAt,
    endedAt: toIso(attempt.completedAt ?? attempt.startedAt) ?? lastActivityAt,
    lastActivityAt,
    currentProvider: readText(attempt.provider),
    currentModel: readText(attempt.model),
    providerSet: readText(attempt.provider) ? [readText(attempt.provider)] : [],
    modelSet: readText(attempt.model) ? [readText(attempt.model)] : [],
    entries,
  };
}

export function buildOpenclawSessionOverlay(input) {
  const sessionKey = buildOpenclawSessionKey(input?.openclawSessionId);
  if (!sessionKey) {
    return null;
  }

  const attempts = Array.isArray(input?.attempts) ? [...input.attempts] : [];
  attempts.sort((left, right) => (
    parseTimestampMs(left?.startedAt) - parseTimestampMs(right?.startedAt)
    || parseTimestampMs(left?.completedAt) - parseTimestampMs(right?.completedAt)
    || readNumericValue(left?.attemptNo) - readNumericValue(right?.attemptNo)
    || String(left?.requestAttemptArchiveId ?? '').localeCompare(String(right?.requestAttemptArchiveId ?? ''))
    || String(left?.requestId ?? '').localeCompare(String(right?.requestId ?? ''))
  ));

  const startedAt = attempts
    .map((attempt) => toIso(attempt?.startedAt) ?? toIso(attempt?.completedAt))
    .find(Boolean)
    ?? null;
  const lastActivityAt = [...attempts]
    .reverse()
    .map((attempt) => toIso(attempt?.completedAt) ?? toIso(attempt?.startedAt))
    .find(Boolean)
    ?? null;

  if (!startedAt || !lastActivityAt) {
    return null;
  }

  const latestAttempt = [...attempts].reverse().find((attempt) => (
    readText(attempt?.provider)
    || readText(attempt?.model)
    || toIso(attempt?.completedAt)
    || toIso(attempt?.startedAt)
  )) ?? null;

  const messages = attempts.flatMap((attempt, attemptIndex) => {
    const requestAt = toIso(attempt?.startedAt) ?? toIso(attempt?.completedAt) ?? lastActivityAt;
    const responseAt = toIso(attempt?.completedAt) ?? requestAt;
    const attemptMessages = Array.isArray(attempt?.messages) ? [...attempt.messages] : [];
    const attemptIdentity = buildLocalAttemptIdentity(attempt, attemptIndex);

    attemptMessages.sort((left, right) => (
      messagePhaseRank(left?.side) - messagePhaseRank(right?.side)
      || readNumericValue(left?.ordinal) - readNumericValue(right?.ordinal)
      || String(left?.role ?? '').localeCompare(String(right?.role ?? ''))
    ));

    return attemptMessages.map((message, messageIndex) => ({
      ...message,
      at: message?.side === 'response' ? responseAt : requestAt,
      content: message?.content ?? message?.normalizedPayload ?? null,
      localAttemptIdentity: attemptIdentity,
      localMessageIndex: messageIndex,
    }));
  });

  const entries = buildEntries(messages, lastActivityAt);
  if (entries.length === 0) {
    return null;
  }

  const provider = readText(latestAttempt?.provider);
  const model = readText(latestAttempt?.model);

  return {
    sessionKey,
    sessionType: 'cli',
    displayTitle: `cli ${shortSessionLabel(sessionKey)}`,
    buyerApiKeyId: readText(input?.buyerApiKeyId),
    startedAt,
    endedAt: lastActivityAt,
    lastActivityAt,
    currentProvider: provider,
    currentModel: model,
    providerSet: provider ? [provider] : [],
    modelSet: model ? [model] : [],
    entries,
  };
}

export function filterSessionsForLocalMonitor(input) {
  const sessions = Array.isArray(input?.sessions) ? input.sessions : [];
  const buyerApiKeyIds = input?.buyerApiKeyIds instanceof Set ? input.buyerApiKeyIds : new Set();
  const lookbackMs = Number.isFinite(input?.lookbackMs) && input.lookbackMs >= 0 ? input.lookbackMs : 0;
  const nowMs = readNowMs(input?.now);
  const minTimestampMs = lookbackMs > 0 ? nowMs - lookbackMs : Number.NEGATIVE_INFINITY;

  return sessions
    .filter((session) => {
      const buyerApiKeyId = readBuyerApiKeyId(session);
      if (buyerApiKeyIds.size > 0 && (!buyerApiKeyId || !buyerApiKeyIds.has(buyerApiKeyId))) {
        return false;
      }

      const activityAtMs = readSessionTimestampMs(session);
      return Number.isFinite(activityAtMs) && activityAtMs >= minTimestampMs;
    })
    .sort((left, right) => (
      readSessionTimestampMs(right) - readSessionTimestampMs(left)
      || String(right?.sessionKey ?? '').localeCompare(String(left?.sessionKey ?? ''))
    ));
}

function readBuyerApiKeyId(session) {
  const directBuyerApiKeyId = readText(session?.buyerApiKeyId);
  if (directBuyerApiKeyId) {
    return directBuyerApiKeyId;
  }

  const sessionKey = readText(session?.sessionKey);
  if (!sessionKey || !sessionKey.startsWith('cli:idle:')) {
    return null;
  }

  const parts = sessionKey.split(':');
  return readText(parts[3]);
}

export function mergeOverlaySessions(feed, overlaySessions) {
  const existingSessions = Array.isArray(feed?.sessions) ? feed.sessions : [];
  const overlayBySessionKey = new Map();

  for (const session of overlaySessions ?? []) {
    if (!session?.sessionKey) {
      continue;
    }
    overlayBySessionKey.set(session.sessionKey, session);
  }

  for (const session of existingSessions) {
    if (!session?.sessionKey || overlayBySessionKey.has(session.sessionKey)) {
      continue;
    }
    overlayBySessionKey.set(session.sessionKey, session);
  }

  return {
    ...(feed ?? {}),
    sessions: [...overlayBySessionKey.values()].sort((left, right) => (
      Date.parse(right.lastActivityAt ?? right.endedAt ?? 0) - Date.parse(left.lastActivityAt ?? left.endedAt ?? 0)
      || String(right.sessionKey ?? '').localeCompare(String(left.sessionKey ?? ''))
    )),
  };
}

export function removeSupersededIdleSessions(input) {
  const sessions = Array.isArray(input?.sessions) ? input.sessions : [];
  const overlaySessions = Array.isArray(input?.overlaySessions) ? input.overlaySessions : [];
  const overlayWindowsByBuyerApiKeyId = new Map();

  for (const session of overlaySessions) {
    const sessionKey = readText(session?.sessionKey);
    const buyerApiKeyId = readBuyerApiKeyId(session);
    const startedAtMs = readSessionStartTimestampMs(session);
    const endedAtMs = readSessionTimestampMs(session);

    if (!sessionKey || !sessionKey.startsWith('cli:openclaw:') || !buyerApiKeyId) {
      continue;
    }

    if (!Number.isFinite(startedAtMs) || !Number.isFinite(endedAtMs)) {
      continue;
    }

    const current = overlayWindowsByBuyerApiKeyId.get(buyerApiKeyId);
    overlayWindowsByBuyerApiKeyId.set(buyerApiKeyId, {
      startedAtMs: current ? Math.min(current.startedAtMs, startedAtMs) : startedAtMs,
      endedAtMs: current ? Math.max(current.endedAtMs, endedAtMs) : endedAtMs,
    });
  }

  if (overlayWindowsByBuyerApiKeyId.size === 0) {
    return sessions;
  }

  return sessions.filter((session) => {
    const sessionKey = readText(session?.sessionKey);
    if (!sessionKey || !sessionKey.startsWith('cli:idle:')) {
      return true;
    }

    const buyerApiKeyId = readBuyerApiKeyId(session);
    const overlayWindow = buyerApiKeyId ? overlayWindowsByBuyerApiKeyId.get(buyerApiKeyId) : null;
    if (!overlayWindow) {
      return true;
    }

    const startedAtMs = readSessionStartTimestampMs(session);
    const endedAtMs = readSessionTimestampMs(session);
    if (!Number.isFinite(endedAtMs)) {
      return true;
    }

    const effectiveStartedAtMs = Number.isFinite(startedAtMs) ? startedAtMs : endedAtMs;
    const overlaps = endedAtMs >= overlayWindow.startedAtMs
      && effectiveStartedAtMs <= overlayWindow.endedAtMs;

    return !overlaps;
  });
}

export function selectJournalRequestIdsForOverlay(input) {
  const existingSessionKeys = input?.existingSessionKeys ?? new Set();
  const maxMissingRequests = Number.isFinite(input?.maxMissingRequests) ? input.maxMissingRequests : 12;
  const missingRequestIds = [];
  const seenRequestIds = new Set();

  for (const block of [...(input?.journalBlocks ?? [])].reverse()) {
    if (!block?.requestId || seenRequestIds.has(block.requestId)) {
      continue;
    }

    seenRequestIds.add(block.requestId);
    const sessionKey = buildRequestSessionKey(block.requestId);
    if (!sessionKey || existingSessionKeys.has(sessionKey)) {
      continue;
    }

    missingRequestIds.push(block.requestId);
    if (missingRequestIds.length >= maxMissingRequests) {
      break;
    }
  }

  return missingRequestIds;
}

function buildEntries(messages, fallbackAt, options = {}) {
  const entries = [];
  const defaultAttemptIdentity = readText(options?.attemptIdentity) ?? 'attempt:unknown';

  for (const [messageIndex, message] of messages.entries()) {
    const content = message?.content ?? message?.normalizedPayload ?? null;
    const role = readText(message?.role) ?? readText(content?.role);
    if (role === 'system') {
      continue;
    }

    const text = compactText(extractTextParts(content));
    if (!text) {
      continue;
    }

    const occurredAt = toIso(message?.at) ?? fallbackAt;
    if (!occurredAt) {
      continue;
    }

    if (message?.side === 'request' && role === 'user') {
      entries.push({
        entryId: buildLocalEntryId({
          attemptIdentity: readText(message?.localAttemptIdentity) ?? defaultAttemptIdentity,
          side: 'request',
          ordinal: message?.ordinal,
          messageIndex: readLocalMessageIndex(message?.localMessageIndex, messageIndex),
          kind: 'user',
        }),
        kind: 'user',
        at: occurredAt,
        text,
      });
      continue;
    }

    if (message?.side === 'response' && role === 'assistant') {
      entries.push({
        entryId: buildLocalEntryId({
          attemptIdentity: readText(message?.localAttemptIdentity) ?? defaultAttemptIdentity,
          side: 'response',
          ordinal: message?.ordinal,
          messageIndex: readLocalMessageIndex(message?.localMessageIndex, messageIndex),
          kind: 'assistant_final',
        }),
        kind: 'assistant_final',
        at: occurredAt,
        text,
      });
    }
  }

  return entries;
}

// Fallback-only overlay ids stay explicitly local so they cannot be mistaken for
// canonical backend lane event ids during rollout.
function buildLocalEntryId(input) {
  const attemptIdentity = readText(input?.attemptIdentity) ?? 'attempt:unknown';
  const side = readText(input?.side) ?? 'unknown';
  const kind = readText(input?.kind) ?? 'message';
  const ordinal = Number.isFinite(Number(input?.ordinal)) ? String(Number(input.ordinal)) : 'na';
  const messageIndex = String(readLocalMessageIndex(input?.messageIndex, 0));
  return `local-entry:${attemptIdentity}:${side}:${ordinal}:${messageIndex}:${kind}`;
}

function buildLocalAttemptIdentity(attempt, attemptIndex = 0) {
  const requestAttemptArchiveId = readText(attempt?.requestAttemptArchiveId);
  if (requestAttemptArchiveId) {
    return `archive:${requestAttemptArchiveId}`;
  }

  const requestId = readText(attempt?.requestId);
  const attemptNo = readPositiveInteger(attempt?.attemptNo);
  if (requestId && attemptNo !== null) {
    return `request:${requestId}:attempt:${attemptNo}`;
  }
  if (requestId) {
    return `request:${requestId}:attempt-index:${attemptIndex}`;
  }

  const timestampMs = parseTimestampMs(attempt?.startedAt) ?? parseTimestampMs(attempt?.completedAt);
  if (Number.isFinite(timestampMs)) {
    return `started-ms:${timestampMs}:attempt-index:${attemptIndex}`;
  }

  return `attempt-index:${attemptIndex}`;
}

function extractTextParts(content) {
  if (typeof content === 'string') {
    return content;
  }

  const parts = Array.isArray(content?.content) ? content.content : [];
  return parts
    .map((part) => {
      if (!part || typeof part !== 'object') {
        return null;
      }
      if (typeof part.text === 'string') {
        return part.text;
      }
      return null;
    })
    .filter(Boolean)
    .join('\n');
}

function compactText(value) {
  const normalized = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized.length > 0 ? normalized : null;
}

function shortSessionLabel(sessionKey) {
  const lastSegment = sessionKey.split(':').at(-1) ?? sessionKey;
  if (lastSegment.length <= 16) {
    return lastSegment;
  }
  return `${lastSegment.slice(0, 8)}...${lastSegment.slice(-4)}`;
}

function readText(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function toIso(value) {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(String(value));
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return new Date(parsed).toISOString();
}

function readNowMs(value) {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return Date.now();
}

function readNumericValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function readPositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function readLocalMessageIndex(value, fallbackIndex) {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed >= 0) {
    return parsed;
  }
  return fallbackIndex;
}

function readSessionTimestampMs(session) {
  return (
    parseTimestampMs(session?.lastActivityAt)
    ?? parseTimestampMs(session?.endedAt)
    ?? parseTimestampMs(session?.startedAt)
    ?? Number.NEGATIVE_INFINITY
  );
}

function readSessionStartTimestampMs(session) {
  return (
    parseTimestampMs(session?.startedAt)
    ?? parseTimestampMs(session?.lastActivityAt)
    ?? parseTimestampMs(session?.endedAt)
    ?? Number.NEGATIVE_INFINITY
  );
}

function parseTimestampMs(value) {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseJournalTimestamp(line, year) {
  const match = line.match(/^([A-Z][a-z]{2})\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})/);
  if (!match) {
    return null;
  }

  const month = MONTH_INDEX[match[1]];
  if (month == null) {
    return null;
  }

  const timestamp = Date.UTC(
    year,
    month,
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  );

  return new Date(timestamp).toISOString();
}

function messagePhaseRank(side) {
  return side === 'request' ? 0 : side === 'response' ? 1 : 2;
}
