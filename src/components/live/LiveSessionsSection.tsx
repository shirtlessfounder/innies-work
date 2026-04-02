'use client';

import { useEffect, useState } from 'react';
import {
  fetchPublicLiveSessions,
  type PublicLiveSessionsFeed,
} from '../../lib/liveSessions/publicFeed';
import { LiveSessionPanel } from './LiveSessionPanel';
import styles from './liveSessions.module.css';

const PUBLIC_LIVE_SESSIONS_POLL_MS = 30_000;

type LiveSessionsPhase = 'loading' | 'live' | 'empty' | 'stale' | 'error';

type LiveSessionsState = {
  phase: LiveSessionsPhase;
  feed: PublicLiveSessionsFeed | null;
  errorMessage: string | null;
  staleRefreshCount: number;
};

const INITIAL_STATE: LiveSessionsState = {
  phase: 'loading',
  feed: null,
  errorMessage: null,
  staleRefreshCount: 0,
};

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError';
}

function formatGeneratedLabel(value: string | null) {
  if (!value) {
    return 'awaiting first payload';
  }

  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return 'feed timestamp pending';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp);
}

function renderStatusCopy(state: LiveSessionsState, sessionCount: number) {
  switch (state.phase) {
    case 'loading':
      return {
        badge: 'SYNCING',
        tone: 'loading',
        note: 'dialing the public workspace feed',
      };
    case 'stale':
      return {
        badge: 'STALE',
        tone: 'stale',
        note: 'holding the last good panel wall for one missed refresh',
      };
    case 'error':
      return {
        badge: 'OFFLINE',
        tone: 'error',
        note: state.errorMessage ?? 'public live sessions unavailable',
      };
    case 'empty':
      return {
        badge: 'QUIET',
        tone: 'quiet',
        note: 'no active innies in the current poll window',
      };
    case 'live':
    default:
      return {
        badge: 'LIVE',
        tone: 'live',
        note: `${sessionCount} active session${sessionCount === 1 ? '' : 's'} in view`,
      };
  }
}

function StateFrame({ title, detail }: { title: string; detail: string }) {
  return (
    <div className={styles.stateFrame}>
      <div className={styles.stateFrameChrome}>
        <span className={`${styles.panelLight} ${styles.panelLightRed}`} aria-hidden="true" />
        <span className={`${styles.panelLight} ${styles.panelLightAmber}`} aria-hidden="true" />
        <span className={`${styles.panelLight} ${styles.panelLightGreen}`} aria-hidden="true" />
      </div>
      <div className={styles.stateFrameBody}>
        <p className={styles.stateFrameTitle}>{title}</p>
        <p className={styles.stateFrameDetail}>{detail}</p>
      </div>
    </div>
  );
}

export function LiveSessionsSection() {
  const [state, setState] = useState<LiveSessionsState>(INITIAL_STATE);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let currentController: AbortController | null = null;

    async function refreshLiveSessions() {
      currentController = new AbortController();

      try {
        const nextFeed = await fetchPublicLiveSessions(currentController.signal);

        if (!isMounted) {
          return;
        }

        setState({
          phase: nextFeed.sessions.length > 0 ? 'live' : 'empty',
          feed: nextFeed,
          errorMessage: null,
          staleRefreshCount: 0,
        });
      } catch (error) {
        if (!isMounted || isAbortError(error)) {
          return;
        }

        const errorMessage = error instanceof Error
          ? error.message
          : 'Unable to refresh public live sessions';

        setState((current) => {
          if (current.feed && current.staleRefreshCount === 0) {
            return {
              ...current,
              phase: 'stale',
              errorMessage,
              staleRefreshCount: current.staleRefreshCount + 1,
            };
          }

          return {
            phase: 'error',
            feed: null,
            errorMessage,
            staleRefreshCount: current.staleRefreshCount + 1,
          };
        });
      } finally {
        if (isMounted) {
          timeoutId = globalThis.setTimeout(() => {
            void refreshLiveSessions();
          }, PUBLIC_LIVE_SESSIONS_POLL_MS);
        }
      }
    }

    void refreshLiveSessions();

    return () => {
      isMounted = false;

      if (timeoutId !== null) {
        globalThis.clearTimeout(timeoutId);
      }

      currentController?.abort();
    };
  }, []);

  const sessions = state.feed?.sessions ?? [];
  const featuredSessions = sessions.slice(0, 3);
  const overflowSessions = sessions.slice(3);
  const statusCopy = renderStatusCopy(state, sessions.length);

  return (
    <section className={styles.liveSection} aria-labelledby="live-panel-wall-title">
      <div className={styles.sectionHeader}>
        <div className={styles.sectionCopy}>
          <p className={styles.sectionKicker}>public workspace</p>
          <h2 id="live-panel-wall-title" className={styles.sectionTitle}>
            live panel wall
          </h2>
          <p className={styles.sectionDescription}>
            newest active innies, surfaced as workspace panels instead of chat bubbles
          </p>
        </div>

        <div className={styles.sectionStatus} data-tone={statusCopy.tone}>
          <div className={styles.sectionStatusBadgeRow}>
            <span className={styles.sectionStatusBadge}>{statusCopy.badge}</span>
            <span className={styles.sectionStatusNote}>{statusCopy.note}</span>
          </div>
          <span className={styles.sectionStatusMeta}>
            feed @ {formatGeneratedLabel(state.feed?.generatedAt ?? null)}
          </span>
        </div>
      </div>

      {state.phase === 'loading' && !state.feed ? (
        <StateFrame
          title="syncing live innies workspace"
          detail="waiting for the first public feed payload"
        />
      ) : null}

      {state.phase === 'error' && !state.feed ? (
        <StateFrame
          title="public feed offline"
          detail={state.errorMessage ?? 'unable to load live sessions right now'}
        />
      ) : null}

      {state.feed && sessions.length === 0 ? (
        <StateFrame
          title="no active innies right now"
          detail="the panel wall stays mounted and will repopulate on the next active poll"
        />
      ) : null}

      {featuredSessions.length > 0 ? (
        <>
          <div className={styles.featuredGrid}>
            {featuredSessions.map((session) => (
              <LiveSessionPanel key={session.sessionKey} session={session} emphasis="featured" />
            ))}
          </div>

          {overflowSessions.length > 0 ? (
            <details className={styles.overflowDetails}>
              <summary className={styles.overflowSummary}>
                <span>more active sessions</span>
                <span className={styles.overflowCount}>{overflowSessions.length}</span>
              </summary>

              <div className={styles.overflowGrid}>
                {overflowSessions.map((session) => (
                  <LiveSessionPanel key={session.sessionKey} session={session} emphasis="overflow" />
                ))}
              </div>
            </details>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
