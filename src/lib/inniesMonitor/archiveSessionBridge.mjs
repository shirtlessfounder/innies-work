export function filterArchiveSessionsForMonitor(input) {
  const sessions = Array.isArray(input?.sessions) ? input.sessions : [];
  const buyerApiKeyIds = input?.buyerApiKeyIds instanceof Set ? input.buyerApiKeyIds : new Set();
  const lookbackMs = Number.isFinite(input?.lookbackMs) && input.lookbackMs >= 0 ? input.lookbackMs : 0;
  const nowMs = readNowMs(input?.now);
  const minTimestampMs = lookbackMs > 0 ? nowMs - lookbackMs : Number.NEGATIVE_INFINITY;

  return sessions
    .filter((session) => {
      const buyerApiKeyId = readArchiveBuyerApiKeyId(session?.sessionKey);
      if (buyerApiKeyIds.size > 0 && (!buyerApiKeyId || !buyerApiKeyIds.has(buyerApiKeyId))) {
        return false;
      }

      const sessionTimestampMs = readSessionTimestampMs(session);
      return Number.isFinite(sessionTimestampMs) && sessionTimestampMs >= minTimestampMs;
    })
    .sort((left, right) => (
      readSessionTimestampMs(right) - readSessionTimestampMs(left)
      || String(right?.sessionKey ?? '').localeCompare(String(left?.sessionKey ?? ''))
    ));
}

export function synthesizeArchiveLiveTrail(input) {
  const archiveEventsBySession = input?.archiveEventsBySession instanceof Map ? input.archiveEventsBySession : new Map();
  const latestRequestDetailsBySession = input?.latestRequestDetailsBySession instanceof Map
    ? input.latestRequestDetailsBySession
    : new Map();
  const existingLiveSessionKeys = input?.existingLiveSessionKeys instanceof Set ? input.existingLiveSessionKeys : new Set();
  const existingLiveSessions = Array.isArray(input?.existingLiveSessions) ? input.existingLiveSessions : [];
  const sessions = filterArchiveSessionsForMonitor(input);
  const liveSessions = [];
  const latestPrompts = [];

  for (const session of sessions) {
    const sessionKey = readText(session?.sessionKey);
    if (!sessionKey || existingLiveSessionKeys.has(sessionKey) || !sessionKey.startsWith('cli:idle:')) {
      continue;
    }

    if (hasOverlappingOpenclawLiveSession({
      archiveSession: session,
      existingLiveSessions,
    })) {
      continue;
    }

    const sessionType = readText(session?.sessionType) ?? null;
    const latestRequestDetail = latestRequestDetailsBySession.get(sessionKey) ?? null;
    const sessionEvents = Array.isArray(archiveEventsBySession.get(sessionKey)?.events)
      ? archiveEventsBySession.get(sessionKey).events
      : [];
    const trailEvents = sessionEvents
      .filter((event) => {
        const eventType = readText(event?.eventType);
        return eventType === 'request_message'
          || eventType === 'response_message'
          || eventType === 'attempt_status';
      })
      .filter((event) => Number.isFinite(parseTimestampMs(event?.eventTime)))
      .sort((left, right) => parseTimestampMs(left?.eventTime) - parseTimestampMs(right?.eventTime));
    const latestRequestTrail = buildLatestRequestTrail({
      sessionKey,
      sessionType,
      session,
      requestDetail: latestRequestDetail,
    });
    const latestEvent = trailEvents.at(-1) ?? null;
    const latestRequestTrailTimeMs = latestRequestTrail.length > 0
      ? parseTimestampMs(latestRequestTrail.at(-1)?.occurredAt)
      : null;
    const latestEventTimeMs = parseTimestampMs(latestEvent?.eventTime);
    const useLatestRequestTrail = latestRequestTrail.length > 0
      && (!Number.isFinite(latestEventTimeMs) || latestRequestTrailTimeMs >= latestEventTimeMs);
    const effectiveTrail = useLatestRequestTrail ? latestRequestTrail : null;

    const occurredAt = effectiveTrail?.at(-1)?.occurredAt
      ?? toIso(latestEvent?.eventTime)
      ?? toIso(session?.endedAt)
      ?? toIso(session?.startedAt);
    if (!occurredAt) {
      continue;
    }

    const provider = readText(latestRequestDetail?.attempt?.provider)
      ?? readText(latestEvent?.provider)
      ?? readText(Array.isArray(session?.providerSet) ? session.providerSet[0] : null);
    const model = readText(latestRequestDetail?.attempt?.model)
      ?? readText(latestEvent?.model)
      ?? readText(Array.isArray(session?.modelSet) ? session.modelSet[0] : null);

    liveSessions.push({
      id: `archive-live-session:${sessionKey}`,
      stream: 'live_sessions',
      kind: 'session',
      occurredAt,
      title: sessionKey,
      detail: describeProviderModel(provider, model),
      sessionKey,
      sessionType,
      provider,
      model,
      status: 'live',
      href: null,
    });

    if (effectiveTrail) {
      latestPrompts.push(...effectiveTrail.map((item) => ({
        ...item,
        detail: describeProviderModel(item.provider ?? provider, item.model ?? model),
      })));
      continue;
    }

    for (const event of trailEvents) {
      const eventType = readText(event?.eventType);
      const eventTime = toIso(event?.eventTime);
      const title = summarizeArchiveEventTitle(event);
      if (!eventType || !eventTime) {
        continue;
      }
      if (!title) {
        continue;
      }

      latestPrompts.push({
        id: `archive-live-prompt:${sessionKey}:${readText(event?.requestId) ?? 'request'}:${event?.attemptNo ?? 0}:${eventType}:${eventTime}`,
        stream: 'latest_prompts',
        kind: eventType,
        occurredAt: eventTime,
        title,
        detail: describeProviderModel(readText(event?.provider) ?? provider, readText(event?.model) ?? model),
        sessionKey,
        sessionType,
        provider: readText(event?.provider) ?? provider,
        model: readText(event?.model) ?? model,
        status: readText(event?.status),
        href: null,
      });
    }
  }

  return {
    liveSessions,
    latestPrompts,
  };
}

function readArchiveBuyerApiKeyId(sessionKey) {
  const normalized = readText(sessionKey);
  if (!normalized || !normalized.startsWith('cli:idle:')) {
    return null;
  }

  const segments = normalized.split(':');
  return readText(segments[3]);
}

function readSessionTimestampMs(session) {
  return (
    parseTimestampMs(session?.endedAt)
    ?? parseTimestampMs(session?.lastActivityAt)
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

function readNowMs(value) {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  return Date.now();
}

function parseTimestampMs(value) {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function toIso(value) {
  const parsed = parseTimestampMs(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function hasOverlappingOpenclawLiveSession(input) {
  const archiveSessionKey = readText(input?.archiveSession?.sessionKey);
  if (!archiveSessionKey || !archiveSessionKey.startsWith('cli:idle:')) {
    return false;
  }

  const buyerApiKeyId = readArchiveBuyerApiKeyId(archiveSessionKey);
  if (!buyerApiKeyId) {
    return false;
  }

  const archiveStartedAtMs = readSessionStartTimestampMs(input?.archiveSession);
  const archiveEndedAtMs = readSessionTimestampMs(input?.archiveSession);
  if (!Number.isFinite(archiveEndedAtMs)) {
    return false;
  }

  const effectiveArchiveStartedAtMs = Number.isFinite(archiveStartedAtMs) ? archiveStartedAtMs : archiveEndedAtMs;

  return (input?.existingLiveSessions ?? []).some((session) => {
    const sessionKey = readText(session?.sessionKey);
    if (!sessionKey || !sessionKey.startsWith('cli:openclaw:')) {
      return false;
    }

    const liveBuyerApiKeyId = readText(session?.buyerApiKeyId);
    if (!liveBuyerApiKeyId || liveBuyerApiKeyId !== buyerApiKeyId) {
      return false;
    }

    const liveStartedAtMs = readSessionStartTimestampMs(session);
    const liveEndedAtMs = readSessionTimestampMs(session);
    if (!Number.isFinite(liveEndedAtMs)) {
      return false;
    }

    const effectiveLiveStartedAtMs = Number.isFinite(liveStartedAtMs) ? liveStartedAtMs : liveEndedAtMs;
    return liveEndedAtMs >= effectiveArchiveStartedAtMs && effectiveLiveStartedAtMs <= archiveEndedAtMs;
  });
}

function describeProviderModel(provider, model) {
  const parts = [provider, model].filter((value) => typeof value === 'string' && value.length > 0);
  return parts.length > 0 ? parts.join(' / ') : null;
}

function summarizeArchiveContent(content) {
  if (typeof content === 'string') {
    return compactText(content);
  }

  if (!content || typeof content !== 'object') {
    return null;
  }

  const directText = compactText(readText(content.text));
  if (directText) {
    return directText;
  }

  const nestedContent = Array.isArray(content.content) ? content.content : [];
  const joined = nestedContent
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      if (!entry || typeof entry !== 'object') return null;
      return readText(entry.text) ?? readText(entry.content);
    })
    .filter(Boolean)
    .join(' ');

  return compactText(joined);
}

function summarizeArchiveEventTitle(event) {
  const eventType = readText(event?.eventType);
  const role = readText(event?.role);

  if ((eventType === 'request_message' || eventType === 'response_message') && role === 'system') {
    return null;
  }

  return summarizeArchiveContent(event?.content) ?? null;
}

function buildLatestRequestTrail(input) {
  const requestDetail = input?.requestDetail;
  const attempt = requestDetail?.attempt ?? null;
  const requestId = readText(attempt?.requestId)
    ?? readText(input?.session?.previewSample?.latestRequestId)
    ?? 'request';
  const attemptNo = readPositiveInteger(attempt?.attemptNo)
    ?? readPositiveInteger(input?.session?.previewSample?.latestAttemptNo)
    ?? 0;
  const provider = readText(attempt?.provider)
    ?? readText(Array.isArray(input?.session?.providerSet) ? input.session.providerSet[0] : null);
  const model = readText(attempt?.model)
    ?? readText(Array.isArray(input?.session?.modelSet) ? input.session.modelSet[0] : null);
  const requestOccurredAt = toIso(attempt?.startedAt)
    ?? toIso(attempt?.completedAt)
    ?? toIso(input?.session?.startedAt)
    ?? toIso(input?.session?.endedAt);
  const responseOccurredAt = toIso(attempt?.completedAt)
    ?? requestOccurredAt
    ?? toIso(input?.session?.endedAt)
    ?? toIso(input?.session?.startedAt);
  const requestMessages = Array.isArray(requestDetail?.request) ? requestDetail.request : [];
  const responseMessages = Array.isArray(requestDetail?.response) ? requestDetail.response : [];

  return [
    ...buildLatestRequestTrailItems({
      messages: requestMessages,
      sessionKey: input?.sessionKey,
      sessionType: input?.sessionType,
      requestId,
      attemptNo,
      provider,
      model,
      occurredAt: requestOccurredAt,
      kind: 'request_message',
      status: null,
    }),
    ...buildLatestRequestTrailItems({
      messages: responseMessages,
      sessionKey: input?.sessionKey,
      sessionType: input?.sessionType,
      requestId,
      attemptNo,
      provider,
      model,
      occurredAt: responseOccurredAt,
      kind: 'response_message',
      status: readText(attempt?.status),
    }),
  ];
}

function buildLatestRequestTrailItems(input) {
  const occurredAt = readText(input?.occurredAt);
  if (!occurredAt) {
    return [];
  }

  const messages = Array.isArray(input?.messages) ? input.messages : [];
  const items = [];

  for (const message of messages) {
    const role = readText(message?.role);
    const contentType = readText(message?.contentType);
    if (!role || role === 'system' || (contentType && contentType !== 'text')) {
      continue;
    }

    const title = summarizeArchiveContent(message?.content);
    if (!title) {
      continue;
    }

    items.push({
      id: `archive-live-prompt:${input.sessionKey}:${input.requestId}:${input.attemptNo}:${input.kind}:${message?.side ?? 'message'}:${readPositiveInteger(message?.ordinal) ?? 0}`,
      stream: 'latest_prompts',
      kind: input.kind,
      occurredAt,
      title,
      detail: null,
      sessionKey: input.sessionKey,
      sessionType: input.sessionType,
      provider: input.provider ?? null,
      model: input.model ?? null,
      status: input.status ?? null,
      href: null,
    });
  }

  return items;
}

function compactText(value) {
  const normalized = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized.length > 0 ? normalized : null;
}

function readText(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readPositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}
