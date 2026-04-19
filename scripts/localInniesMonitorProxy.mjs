import http from 'node:http';
import { readFileSync } from 'node:fs';
import { Pool } from 'pg';

import {
  buildOpenclawSessionOverlay,
  buildOverlaySession,
  buildRequestSessionKey,
  filterSessionsForLocalMonitor,
  mergeOverlaySessions,
  parseJournalLatencyBlocks,
  removeSupersededIdleSessions,
  selectJournalRequestIdsForOverlay,
} from '../src/lib/inniesMonitor/localLiveOverlay.mjs';

const PORT = normalizePort(process.env.PORT) ?? 4010;
const PUBLIC_UPSTREAM_BASE_URL = normalizeBaseUrl(process.env.UPSTREAM_INNIES_API_BASE_URL) ?? 'https://api.innies.computer';
const ADMIN_UPSTREAM_BASE_URL = normalizeBaseUrl(process.env.UPSTREAM_INNIES_ADMIN_API_BASE_URL) ?? 'https://api.innies.computer';
const JOURNAL_URL = process.env.DEVOPS_JOURNAL_URL?.trim()
  || 'https://admin.spicefi.xyz/devops/v1/journal?env=prod&unit=innies-api&lines=5000';
const MAX_MISSING_REQUESTS = 12;
const MAX_FILTERED_MISSING_REQUESTS = 120;
const ATTEMPT_CACHE_TTL_MS = 15_000;
const DEFAULT_LOOKBACK_MS = 24 * 60 * 60 * 1000;
const LOCAL_MONITOR_MODE = 'fallback-only';

const localEnv = readLocalEnv();
const ADMIN_API_KEY = process.env.INNIES_ADMIN_API_KEY?.trim() || localEnv.INNIES_ADMIN_API_KEY || '';
const JOURNAL_USER = process.env.DEVOPS_JOURNAL_USER?.trim() || localEnv.DEVOPS_JOURNAL_USER || '';
const JOURNAL_PASSWORD = process.env.DEVOPS_JOURNAL_PASSWORD?.trim() || localEnv.DEVOPS_JOURNAL_PASSWORD || '';
const credentialFilter = parseCsvSet(process.env.LIVE_OVERLAY_CREDENTIALS ?? localEnv.LIVE_OVERLAY_CREDENTIALS ?? '');
const buyerApiKeyFilter = parseCsvSet(process.env.LIVE_OVERLAY_BUYER_API_KEY_IDS ?? localEnv.LIVE_OVERLAY_BUYER_API_KEY_IDS ?? '');
const lookbackMs = normalizeLookbackMs(process.env.LIVE_OVERLAY_LOOKBACK_MS ?? localEnv.LIVE_OVERLAY_LOOKBACK_MS)
  ?? DEFAULT_LOOKBACK_MS;
const DATABASE_URL = process.env.DATABASE_URL?.trim() || localEnv.DATABASE_URL || '';

const attemptCache = new Map();
const dbPool = DATABASE_URL ? new Pool({ connectionString: DATABASE_URL, max: 1 }) : null;

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`);

    if (requestUrl.pathname === '/healthz') {
      writeJson(res, 200, {
        ok: true,
        adminApiKeyConfigured: Boolean(ADMIN_API_KEY),
        journalConfigured: Boolean(JOURNAL_USER && JOURNAL_PASSWORD),
      });
      return;
    }

    if (requestUrl.pathname === '/v1/public/innies/live-sessions') {
      const baseFeed = await fetchJson(buildUpstreamUrl(PUBLIC_UPSTREAM_BASE_URL, requestUrl), {
        accept: 'application/json',
      });
      const hydratedBaseSessions = await hydrateSessionsWithBuyerApiKeyIds(baseFeed?.sessions);
      const openclawOverlaySessions = await loadOpenclawOverlaySessions();
      const overlaySessions = await loadOverlaySessions({
        ...(baseFeed ?? {}),
        sessions: hydratedBaseSessions,
      });
      const dedupedBaseSessions = removeSupersededIdleSessions({
        sessions: hydratedBaseSessions,
        overlaySessions: openclawOverlaySessions,
      });
      const mergedFeed = mergeOverlaySessions(
        {
          ...(baseFeed ?? {}),
          sessions: dedupedBaseSessions,
        },
        [...openclawOverlaySessions, ...overlaySessions],
      );
      const filteredSessions = filterSessionsForLocalMonitor({
        sessions: mergedFeed.sessions,
        buyerApiKeyIds: buyerApiKeyFilter,
        lookbackMs,
      });
      const responseFeed = {
        ...(mergedFeed ?? {}),
        sessions: filteredSessions,
      };

      console.log(
        `[local-monitor-proxy] ${LOCAL_MONITOR_MODE} public feed sessions=${Array.isArray(baseFeed?.sessions) ? baseFeed.sessions.length : 0} hydrated=${hydratedBaseSessions.length} openclawOverlay=${openclawOverlaySessions.length} overlay=${overlaySessions.length} filtered=${filteredSessions.length}`,
      );

      writeJson(res, 200, responseFeed, {
        'cache-control': 'no-store',
        'x-overlay-session-count': String(overlaySessions.length),
        'x-openclaw-overlay-session-count': String(openclawOverlaySessions.length),
        'x-monitor-lookback-ms': String(lookbackMs),
        'x-monitor-buyer-key-count': String(buyerApiKeyFilter.size),
      });
      return;
    }

    if (requestUrl.pathname.startsWith('/v1/admin/')) {
      if (!ADMIN_API_KEY) {
        writeJson(res, 503, {
          code: 'missing_admin_api_key',
          message: 'Missing INNIES_ADMIN_API_KEY for local admin proxy',
        });
        return;
      }

      const response = await fetch(buildUpstreamUrl(ADMIN_UPSTREAM_BASE_URL, requestUrl), {
        headers: {
          accept: 'application/json',
          'x-api-key': ADMIN_API_KEY,
        },
      });
      await forwardResponse(res, response);
      return;
    }

    writeJson(res, 404, {
      code: 'not_found',
      message: 'Local Innies monitor proxy only serves /v1/public/innies/live-sessions and /v1/admin/*',
    });
  } catch (error) {
    console.error('[local-monitor-proxy] request failed', error);
    writeJson(res, 500, {
      code: 'local_proxy_error',
      message: error instanceof Error ? error.message : 'Unexpected local proxy failure',
    });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[local-monitor-proxy] ${LOCAL_MONITOR_MODE} shim listening on http://127.0.0.1:${PORT}`);
  console.log(`[local-monitor-proxy] public upstream ${PUBLIC_UPSTREAM_BASE_URL}`);
  console.log(`[local-monitor-proxy] admin upstream ${ADMIN_UPSTREAM_BASE_URL}`);
});

async function loadOverlaySessions(baseFeed) {
  if (!ADMIN_API_KEY || !JOURNAL_USER || !JOURNAL_PASSWORD) {
    return [];
  }

  const journalText = await fetchText(JOURNAL_URL, {
    authorization: `Basic ${Buffer.from(`${JOURNAL_USER}:${JOURNAL_PASSWORD}`).toString('base64')}`,
  });
  const journalBlocks = parseJournalLatencyBlocks(journalText)
    .filter((block) => credentialFilter.size === 0 || credentialFilter.has(block.credentialLabel));
  const existingSessionKeys = new Set(
    (Array.isArray(baseFeed?.sessions) ? baseFeed.sessions : [])
      .map((session) => session?.sessionKey)
      .filter(Boolean),
  );
  const missingRequestIds = selectJournalRequestIdsForOverlay({
    journalBlocks,
    existingSessionKeys,
    maxMissingRequests: buyerApiKeyFilter.size > 0 ? MAX_FILTERED_MISSING_REQUESTS : MAX_MISSING_REQUESTS,
  });

  const overlaySessions = [];
  for (const requestId of missingRequestIds) {
    let detail;
    try {
      detail = await loadAttemptDetail(requestId);
    } catch (error) {
      if (isArchiveNotReadyError(error)) {
        continue;
      }
      throw error;
    }
    const overlaySession = buildOverlaySession(detail);
    if (!overlaySession || existingSessionKeys.has(overlaySession.sessionKey)) {
      continue;
    }
    overlaySessions.push(overlaySession);
  }

  return filterSessionsForLocalMonitor({
    sessions: overlaySessions,
    buyerApiKeyIds: buyerApiKeyFilter,
    lookbackMs,
  });
}

async function loadOpenclawOverlaySessions() {
  if (!dbPool || buyerApiKeyFilter.size === 0) {
    return [];
  }

  // Fallback-only reconstruction while the backend canonical path rolls out.
  const result = await dbPool.query(
    `
      select
        a.id::text as request_attempt_archive_id,
        a.request_id,
        a.attempt_no,
        a.api_key_id::text as api_key_id,
        a.openclaw_session_id,
        a.provider,
        a.model,
        a.started_at,
        a.completed_at,
        m.side,
        m.ordinal,
        m.role,
        b.normalized_payload
      from in_request_attempt_archives a
      left join in_request_attempt_messages m
        on m.request_attempt_archive_id = a.id
      left join in_message_blobs b
        on b.id = m.message_blob_id
      where a.api_key_id = any($1::uuid[])
        and a.started_at >= now() - ($2::bigint * interval '1 millisecond')
        and a.openclaw_session_id is not null
      order by
        a.openclaw_session_id asc,
        a.started_at asc,
        case
          when m.side = 'request' then 0
          when m.side = 'response' then 1
          else 2
        end asc,
        m.ordinal asc
    `,
    [Array.from(buyerApiKeyFilter), lookbackMs],
  );

  const sessionsByOpenclawSessionId = new Map();
  for (const row of result.rows ?? []) {
    const openclawSessionId = normalizeText(row.openclaw_session_id);
    const requestId = normalizeText(row.request_id);
    const buyerApiKeyId = normalizeText(row.api_key_id);
    if (!openclawSessionId || !requestId || !buyerApiKeyId) {
      continue;
    }

    let session = sessionsByOpenclawSessionId.get(openclawSessionId);
    if (!session) {
      session = {
        openclawSessionId,
        buyerApiKeyId,
        attemptsByIdentity: new Map(),
      };
      sessionsByOpenclawSessionId.set(openclawSessionId, session);
    }

    const requestAttemptArchiveId = normalizeText(row.request_attempt_archive_id);
    const attemptNo = normalizeInteger(row.attempt_no);
    const startedAtKey = normalizeTimestampKey(row.started_at ?? row.completed_at);
    const attemptIdentity = requestAttemptArchiveId
      ?? [requestId, attemptNo === null ? null : `attempt:${attemptNo}`, startedAtKey].filter(Boolean).join(':');
    if (!attemptIdentity) {
      continue;
    }

    let attempt = session.attemptsByIdentity.get(attemptIdentity);
    if (!attempt) {
      attempt = {
        requestAttemptArchiveId,
        requestId,
        attemptNo,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        provider: normalizeText(row.provider),
        model: normalizeText(row.model),
        messages: [],
      };
      session.attemptsByIdentity.set(attemptIdentity, attempt);
    }

    if (normalizeText(row.side) && row.normalized_payload) {
      attempt.messages.push({
        side: row.side,
        ordinal: row.ordinal,
        role: row.role,
        normalizedPayload: row.normalized_payload,
      });
    }
  }

  const overlaySessions = [];
  for (const session of sessionsByOpenclawSessionId.values()) {
    const overlaySession = buildOpenclawSessionOverlay({
      openclawSessionId: session.openclawSessionId,
      buyerApiKeyId: session.buyerApiKeyId,
      attempts: [...session.attemptsByIdentity.values()],
    });

    if (overlaySession) {
      overlaySessions.push(overlaySession);
    }
  }

  return filterSessionsForLocalMonitor({
    sessions: overlaySessions,
    buyerApiKeyIds: buyerApiKeyFilter,
    lookbackMs,
  });
}

async function hydrateSessionsWithBuyerApiKeyIds(sessions) {
  const sourceSessions = Array.isArray(sessions) ? sessions : [];
  const hydratedSessions = await Promise.all(sourceSessions.map(async (session) => {
    const buyerApiKeyId = normalizeText(session?.buyerApiKeyId);
    if (buyerApiKeyId) {
      return {
        ...session,
        buyerApiKeyId,
      };
    }

    const requestId = readRequestIdFromSessionKey(session?.sessionKey);
    if (!requestId) {
      return session;
    }

    try {
      const detail = await loadAttemptDetail(requestId);
      const hydratedBuyerApiKeyId = normalizeText(detail?.attempt?.apiKeyId);
      if (!hydratedBuyerApiKeyId) {
        return session;
      }

      return {
        ...session,
        buyerApiKeyId: hydratedBuyerApiKeyId,
      };
    } catch (error) {
      if (isArchiveNotReadyError(error)) {
        return session;
      }
      throw error;
    }
  }));

  return hydratedSessions;
}

async function loadAttemptDetail(requestId) {
  const cached = attemptCache.get(requestId);
  if (cached && Date.now() - cached.cachedAtMs < ATTEMPT_CACHE_TTL_MS) {
    return cached.value;
  }

  const detail = await fetchJson(
    `${ADMIN_UPSTREAM_BASE_URL}/v1/admin/archive/requests/${encodeURIComponent(requestId)}/attempts/1`,
    {
      accept: 'application/json',
      'x-api-key': ADMIN_API_KEY,
    },
  );

  attemptCache.set(requestId, {
    cachedAtMs: Date.now(),
    value: detail,
  });

  return detail;
}

function buildUpstreamUrl(baseUrl, requestUrl) {
  const upstreamUrl = new URL(requestUrl.pathname, `${baseUrl}/`);
  upstreamUrl.search = requestUrl.search;
  return upstreamUrl;
}

async function fetchJson(url, headers) {
  const response = await fetch(url, { headers });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Upstream request failed (${response.status}) for ${url}: ${text.slice(0, 280)}`);
  }

  return text.length > 0 ? JSON.parse(text) : null;
}

async function fetchText(url, headers) {
  const response = await fetch(url, { headers });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Journal request failed (${response.status}) for ${url}: ${text.slice(0, 280)}`);
  }

  return text;
}

async function forwardResponse(res, upstreamResponse) {
  const body = await upstreamResponse.text();
  const headers = {
    'cache-control': 'no-store',
    'content-type': upstreamResponse.headers.get('content-type') || 'application/json; charset=utf-8',
  };

  res.writeHead(upstreamResponse.status, headers);
  res.end(body);
}

function writeJson(res, status, payload, headers = {}) {
  res.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
    ...headers,
  });
  res.end(JSON.stringify(payload));
}

function normalizePort(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
}

function normalizeBaseUrl(value) {
  const normalized = value?.trim();
  return normalized ? normalized.replace(/\/+$/, '') : null;
}

function normalizeLookbackMs(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : null;
}

function parseCsvSet(value) {
  return new Set(
    String(value ?? '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
}

function readRequestIdFromSessionKey(sessionKey) {
  const normalized = normalizeText(sessionKey);
  if (!normalized || !normalized.startsWith('cli:request:')) {
    return null;
  }
  return normalized.slice('cli:request:'.length) || null;
}

function normalizeText(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function normalizeInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function normalizeTimestampKey(value) {
  const parsed = Date.parse(String(value ?? ''));
  return Number.isFinite(parsed) ? String(parsed) : null;
}

function isArchiveNotReadyError(error) {
  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes('(404)')
    || error.message.includes('"code":"not_found"');
}

function readLocalEnv() {
  const envPath = new URL('../.env.local', import.meta.url);
  const values = {};

  try {
    const source = readFileSync(envPath, 'utf8');
    for (const line of source.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const delimiterIndex = trimmed.indexOf('=');
      if (delimiterIndex <= 0) {
        continue;
      }

      const key = trimmed.slice(0, delimiterIndex).trim();
      let value = trimmed.slice(delimiterIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"'))
        || (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      values[key] = value;
    }
  } catch {}

  return values;
}
