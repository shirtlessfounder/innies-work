'use client';

import { startTransition, useEffect, useRef, useState } from 'react';
import { INNIES_LIVE_FEED_ROUTE, type InniesLiveFeed } from '../lib/inniesLive/feedTypes';

const DEFAULT_POLL_INTERVAL_MS = 5_000;
const STALE_GRACE_MULTIPLIER = 2;
// Cached feed older than this is ignored — don't show a half-day-old snapshot.
const CACHE_MAX_AGE_MS = 60 * 60 * 1000; // 1h
const CACHE_STORAGE_KEY = 'innies:live-sessions:last-feed';

export type InniesLiveStatus = 'loading' | 'live' | 'stale' | 'degraded';

export type UseMyInniesSessionsResult = {
  feed: InniesLiveFeed | null;
  status: InniesLiveStatus;
  error: string | null;
  lastUpdatedAt: string | null;
  refresh: () => void;
};

export type UseMyInniesSessionsOptions = {
  /**
   * Initial feed to render on first paint before the client fetch resolves.
   * Passed in from a server component via SSR prefetch so the panel isn't
   * blank while the first network round-trip is in flight.
   */
  initialFeed?: InniesLiveFeed | null;
};

type ErrorPayload = { code?: unknown; message?: unknown };

function isFeed(value: unknown): value is InniesLiveFeed {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.generatedAt === 'string'
    && typeof record.windowHours === 'number'
    && typeof record.pollIntervalSeconds === 'number'
    && Array.isArray(record.apiKeyIds)
    && Array.isArray(record.sessions);
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.trim().length === 0) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function readCachedFeed(): InniesLiveFeed | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const record = parsed as { cachedAt?: unknown; feed?: unknown };
    if (typeof record.cachedAt !== 'number') return null;
    if (Date.now() - record.cachedAt > CACHE_MAX_AGE_MS) return null;
    if (!isFeed(record.feed)) return null;
    return record.feed;
  } catch {
    return null;
  }
}

function writeCachedFeed(feed: InniesLiveFeed): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      CACHE_STORAGE_KEY,
      JSON.stringify({ cachedAt: Date.now(), feed })
    );
  } catch {
    // quota / disabled storage — best-effort, ignore
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
  return `Innies live sessions request failed (${status})`;
}

export function useMyInniesSessions(options: UseMyInniesSessionsOptions = {}): UseMyInniesSessionsResult {
  const { initialFeed = null } = options;
  const [feed, setFeed] = useState<InniesLiveFeed | null>(initialFeed);
  const [status, setStatus] = useState<InniesLiveStatus>(initialFeed ? 'stale' : 'loading');
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(initialFeed?.generatedAt ?? null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const feedRef = useRef<InniesLiveFeed | null>(initialFeed);
  const lastGoodFetchAtMsRef = useRef<number | null>(null);

  // Hydrate from localStorage cache on mount so returning users see the last
  // feed immediately while the fresh fetch is in flight. SSR-safe: only runs
  // after hydration so there's no hydration mismatch.
  useEffect(() => {
    if (feedRef.current) return; // SSR already hydrated us
    const cached = readCachedFeed();
    if (!cached) return;
    feedRef.current = cached;
    startTransition(() => {
      setFeed(cached);
      setStatus('stale');
      setLastUpdatedAt(cached.generatedAt);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
    let controller: AbortController | null = null;

    const pollIntervalMs = () => {
      const seconds = feedRef.current?.pollIntervalSeconds;
      if (typeof seconds === 'number' && seconds > 0) {
        return Math.max(1_000, Math.floor(seconds * 1_000));
      }
      return DEFAULT_POLL_INTERVAL_MS;
    };

    const scheduleNext = () => {
      if (cancelled) return;
      timeoutId = globalThis.setTimeout(() => {
        void runCycle();
      }, pollIntervalMs());
    };

    const runCycle = async () => {
      controller?.abort();
      controller = new AbortController();

      try {
        const response = await fetch(INNIES_LIVE_FEED_ROUTE, {
          cache: 'no-store',
          headers: { accept: 'application/json' },
          signal: controller.signal
        });
        const body = await readBody(response);

        if (!response.ok) {
          throw new Error(readErrorMessage(response.status, body));
        }

        if (!isFeed(body)) {
          throw new Error('Invalid innies live sessions payload');
        }

        if (cancelled) return;

        feedRef.current = body;
        lastGoodFetchAtMsRef.current = Date.now();
        writeCachedFeed(body);

        startTransition(() => {
          setFeed(body);
          setStatus('live');
          setError(null);
          setLastUpdatedAt(body.generatedAt);
        });
      } catch (fetchError) {
        if (cancelled) return;
        if (fetchError instanceof Error && fetchError.name === 'AbortError') return;

        const lastGoodMs = lastGoodFetchAtMsRef.current;
        const graceWindowMs = pollIntervalMs() * STALE_GRACE_MULTIPLIER;
        const withinGrace = Boolean(feedRef.current)
          && typeof lastGoodMs === 'number'
          && Date.now() - lastGoodMs <= graceWindowMs;

        startTransition(() => {
          setStatus(withinGrace ? 'stale' : 'degraded');
          setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch innies live sessions');
        });
      } finally {
        scheduleNext();
      }
    };

    void runCycle();

    return () => {
      cancelled = true;
      controller?.abort();
      if (timeoutId) globalThis.clearTimeout(timeoutId);
    };
  }, [refreshNonce]);

  return {
    feed,
    status,
    error,
    lastUpdatedAt,
    refresh: () => setRefreshNonce((value) => value + 1)
  };
}
