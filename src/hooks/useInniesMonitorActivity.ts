'use client';

import { startTransition, useEffect, useRef, useState } from 'react';

export const INNIES_MONITOR_ACTIVITY_POLL_INTERVAL_MS = 7_500;
const STALE_GRACE_PERIOD_MS = INNIES_MONITOR_ACTIVITY_POLL_INTERVAL_MS * 2;
const INNIES_MONITOR_ACTIVITY_PATH = '/api/innies/monitor/activity';

export type InniesMonitorActivityLiveStatus = 'loading' | 'live' | 'stale' | 'degraded';
export type InniesMonitorActivityStream = 'live_sessions' | 'latest_prompts' | 'archive_trail';
export type InniesMonitorActivityKind =
  | 'session'
  | 'user'
  | 'assistant_final'
  | 'tool_call'
  | 'tool_result'
  | 'provider_switch'
  | 'request_message'
  | 'response_message'
  | 'attempt_status';

export type InniesMonitorActivityItem = {
  id: string;
  stream: InniesMonitorActivityStream;
  kind: InniesMonitorActivityKind;
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

export type InniesMonitorActivityPayload = {
  generatedAt: string;
  liveStatus: Exclude<InniesMonitorActivityLiveStatus, 'loading'>;
  items: InniesMonitorActivityItem[];
};

type UseInniesMonitorActivityResult = {
  payload: InniesMonitorActivityPayload | null;
  liveStatus: InniesMonitorActivityLiveStatus;
  error: string | null;
  lastSuccessfulUpdateAt: string | null;
  refresh: () => void;
};

type ErrorPayload = {
  code?: unknown;
  message?: unknown;
};

function isActivityStream(value: unknown): value is InniesMonitorActivityStream {
  return value === 'live_sessions' || value === 'latest_prompts' || value === 'archive_trail';
}

function isActivityKind(value: unknown): value is InniesMonitorActivityKind {
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

function isActivityLiveStatus(value: unknown): value is Exclude<InniesMonitorActivityLiveStatus, 'loading'> {
  return value === 'live' || value === 'stale' || value === 'degraded';
}

function isActivityItem(value: unknown): value is InniesMonitorActivityItem {
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

function isActivityPayload(value: unknown): value is InniesMonitorActivityPayload {
  if (!value || typeof value !== 'object') return false;

  const record = value as Record<string, unknown>;
  return typeof record.generatedAt === 'string'
    && isActivityLiveStatus(record.liveStatus)
    && Array.isArray(record.items)
    && record.items.every((item) => isActivityItem(item));
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.trim().length === 0) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function readErrorMessage(status: number, payload: unknown): string {
  if (payload && typeof payload === 'object') {
    const record = payload as ErrorPayload;
    if (typeof record.message === 'string' && record.message.trim().length > 0) {
      return record.message.trim();
    }
    if (typeof record.code === 'string' && record.code.trim().length > 0) {
      return record.code.trim();
    }
  }

  return `Innies monitor activity request failed (${status})`;
}

export function useInniesMonitorActivity(): UseInniesMonitorActivityResult {
  const [payload, setPayload] = useState<InniesMonitorActivityPayload | null>(null);
  const [liveStatus, setLiveStatus] = useState<InniesMonitorActivityLiveStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [lastSuccessfulUpdateAt, setLastSuccessfulUpdateAt] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const payloadRef = useRef<InniesMonitorActivityPayload | null>(null);
  const lastGoodPayloadRef = useRef<InniesMonitorActivityPayload | null>(null);
  const lastGoodFetchAtMsRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
    let activeController: AbortController | null = null;

    const scheduleNext = () => {
      if (cancelled) return;
      timeoutId = globalThis.setTimeout(() => {
        void runCycle();
      }, INNIES_MONITOR_ACTIVITY_POLL_INTERVAL_MS);
    };

    const runCycle = async () => {
      activeController?.abort();
      activeController = new AbortController();

      if (!payloadRef.current) {
        startTransition(() => {
          setLiveStatus('loading');
          setError(null);
        });
      }

      try {
        const response = await fetch(INNIES_MONITOR_ACTIVITY_PATH, {
          cache: 'no-store',
          headers: { accept: 'application/json' },
          signal: activeController.signal,
        });
        const nextPayload = await readJson(response);

        if (!response.ok) {
          throw new Error(readErrorMessage(response.status, nextPayload));
        }

        if (!isActivityPayload(nextPayload)) {
          throw new Error('Invalid innies monitor activity payload');
        }

        if (cancelled) return;

        payloadRef.current = nextPayload;
        lastGoodPayloadRef.current = nextPayload;
        lastGoodFetchAtMsRef.current = Date.now();

        startTransition(() => {
          setPayload(nextPayload);
          setLiveStatus(nextPayload.liveStatus);
          setError(null);
          setLastSuccessfulUpdateAt(nextPayload.generatedAt);
        });
      } catch (fetchError) {
        if (cancelled) return;
        if (fetchError instanceof Error && fetchError.name === 'AbortError') return;

        const fallbackPayload = lastGoodPayloadRef.current;
        const lastGoodFetchAtMs = lastGoodFetchAtMsRef.current;
        const withinStaleGracePeriod = Boolean(fallbackPayload)
          && typeof lastGoodFetchAtMs === 'number'
          && Date.now() - lastGoodFetchAtMs <= STALE_GRACE_PERIOD_MS;

        payloadRef.current = withinStaleGracePeriod ? fallbackPayload : null;

        startTransition(() => {
          setPayload(withinStaleGracePeriod ? fallbackPayload : null);
          setLiveStatus('degraded');
          setError(fetchError instanceof Error ? fetchError.message : 'Failed to refresh innies monitor activity');
        });
      } finally {
        scheduleNext();
      }
    };

    void runCycle();

    return () => {
      cancelled = true;
      activeController?.abort();
      if (timeoutId) globalThis.clearTimeout(timeoutId);
    };
  }, [refreshNonce]);

  return {
    payload,
    liveStatus,
    error,
    lastSuccessfulUpdateAt,
    refresh: () => setRefreshNonce((value) => value + 1),
  };
}
