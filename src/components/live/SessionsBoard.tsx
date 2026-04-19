'use client';

import { useMemo } from 'react';
import { useMyInniesSessions } from '../../hooks/useMyInniesSessions';
import { SessionPanel } from './SessionPanel';
import styles from './sessionsBoard.module.css';

const STATUS_LABEL: Record<string, string> = {
  loading: 'connecting',
  live: 'live',
  stale: 'stale (retrying)',
  degraded: 'disconnected'
};

function formatGeneratedAt(value: string | null): string {
  if (!value) return '--';
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return '--';
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit'
  }).format(ts);
}

export function SessionsBoard() {
  const { feed, status, error, lastUpdatedAt, refresh } = useMyInniesSessions();

  const sessions = useMemo(() => feed?.sessions ?? [], [feed]);

  return (
    <div className={styles.board}>
      <div className={styles.statusRow}>
        <span className={styles.statusDot} data-status={status} aria-hidden="true" />
        <span>{STATUS_LABEL[status] ?? status}</span>
        {feed ? (
          <>
            <span>·</span>
            <span>{sessions.length} session{sessions.length === 1 ? '' : 's'}</span>
            <span>·</span>
            <span>window {feed.windowHours}h</span>
            <span>·</span>
            <span>updated {formatGeneratedAt(lastUpdatedAt)}</span>
          </>
        ) : null}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={refresh}
            style={{
              background: 'transparent',
              border: '1px solid rgba(20, 53, 64, 0.18)',
              borderRadius: '0.3rem',
              fontSize: '0.7rem',
              padding: '0.15rem 0.5rem',
              cursor: 'pointer',
              color: 'inherit'
            }}
          >
            refresh
          </button>
        </span>
      </div>

      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      {sessions.length === 0 && status !== 'loading' ? (
        <div className={styles.empty}>
          No live innies sessions in the last {feed?.windowHours ?? 24}h.
          Start an `innies codex` or `innies claude` session — new panels appear automatically.
        </div>
      ) : (
        <div className={styles.grid}>
          {sessions.map((session) => (
            <SessionPanel key={session.sessionKey} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}
