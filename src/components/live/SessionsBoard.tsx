'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const sessions = useMemo(() => feed?.sessions ?? [], [feed]);
  const totalTurns = useMemo(
    () => sessions.reduce((sum, session) => sum + (session.turnCount ?? 0), 0),
    [sessions]
  );
  const statusLabel = STATUS_LABEL[status] ?? status;

  const recomputeScrollAffordance = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < maxScroll - 2);
  }, []);

  useEffect(() => {
    recomputeScrollAffordance();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', recomputeScrollAffordance, { passive: true });
    window.addEventListener('resize', recomputeScrollAffordance);
    return () => {
      el.removeEventListener('scroll', recomputeScrollAffordance);
      window.removeEventListener('resize', recomputeScrollAffordance);
    };
  }, [recomputeScrollAffordance, sessions.length]);

  const scrollByPanel = useCallback((direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const firstPanel = el.querySelector<HTMLElement>(`.${styles.panel}`);
    const step = firstPanel ? firstPanel.offsetWidth : el.clientWidth;
    el.scrollBy({ left: direction === 'right' ? step : -step, behavior: 'smooth' });
  }, []);

  const hasCarousel = sessions.length > 0;

  return (
    <div className={styles.board}>
      <div className={styles.statusRow}>
        <span className={styles.statusPrefix}>{'//'}</span>
        <span className={styles.statusDot} data-status={status} aria-hidden="true" />
        <span className={styles.statusValue}>{statusLabel}</span>
        {feed ? (
          <>
            <span className={styles.statusDivider}>·</span>
            <span>{sessions.length} cli session{sessions.length === 1 ? '' : 's'}</span>
            <span className={styles.statusDivider}>·</span>
            <span>{totalTurns} turn{totalTurns === 1 ? '' : 's'}</span>
            <span className={styles.statusDivider}>·</span>
            <span>window {feed.windowHours}h</span>
            <span className={styles.statusDivider}>·</span>
            <span>updated {formatGeneratedAt(lastUpdatedAt)}</span>
          </>
        ) : null}
        {hasCarousel ? (
          <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: '0.35rem' }}>
            <button
              type="button"
              className={styles.navButton}
              onClick={() => scrollByPanel('left')}
              disabled={!canScrollLeft}
              aria-label="scroll to previous session"
            >
              ←
            </button>
            <button
              type="button"
              className={styles.navButton}
              onClick={() => scrollByPanel('right')}
              disabled={!canScrollRight}
              aria-label="scroll to next session"
            >
              →
            </button>
            <button type="button" onClick={refresh} className={styles.refreshButton}>
              refresh
            </button>
          </span>
        ) : (
          <button type="button" onClick={refresh} className={styles.refreshButton}>
            refresh
          </button>
        )}
      </div>

      {error ? <div className={styles.errorBanner}>{error}</div> : null}

      {sessions.length === 0 && status !== 'loading' ? (
        <div className={styles.empty}>
          {'//'} no live innies sessions in the last {feed?.windowHours ?? 24}h. start an{' '}
          <code>innies codex</code> or <code>innies claude</code> session — new blocks appear automatically.
        </div>
      ) : (
        <div className={styles.carouselWrap}>
          <div ref={scrollRef} className={styles.grid}>
            {sessions.map((session) => (
              <SessionPanel key={session.sessionKey} session={session} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
