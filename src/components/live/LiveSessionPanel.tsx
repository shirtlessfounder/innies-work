'use client';

import { useEffect, useRef } from 'react';
import type { PublicLiveSession, PublicLiveSessionEntry } from '../../lib/liveSessions/publicFeed';
import styles from './liveSessions.module.css';

const ENTRY_LABELS: Record<PublicLiveSessionEntry['kind'], string> = {
  user: 'user',
  assistant_final: 'assistant final',
};

function formatClockLabel(value: string) {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return 'time pending';
  }

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp);
}

function formatActivityLabel(value: string) {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return 'activity unknown';
  }

  const deltaSeconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));

  if (deltaSeconds < 60) {
    return 'active just now';
  }

  if (deltaSeconds < 3600) {
    return `active ${Math.floor(deltaSeconds / 60)}m ago`;
  }

  if (deltaSeconds < 86400) {
    return `active ${Math.floor(deltaSeconds / 3600)}h ago`;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp);
}

function renderEntryContent(entry: PublicLiveSessionEntry) {
  switch (entry.kind) {
    case 'user':
    case 'assistant_final':
      return <p className={styles.entryText}>{entry.text || 'no public text'}</p>;
    default:
      return null;
  }
}

type LiveSessionPanelProps = {
  session: PublicLiveSession;
  emphasis?: 'featured' | 'overflow';
};

export function LiveSessionPanel({ session, emphasis = 'featured' }: LiveSessionPanelProps) {
  const panelBodyRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoFollowRef = useRef(true);
  const latestEntryId = session.entries.at(-1)?.entryId ?? '';

  useEffect(() => {
    const panelBody = panelBodyRef.current;
    if (!panelBody || !shouldAutoFollowRef.current) {
      return;
    }

    panelBody.scrollTop = panelBody.scrollHeight;
  }, [latestEntryId]);

  function handlePanelBodyScroll() {
    const panelBody = panelBodyRef.current;
    if (!panelBody) {
      return;
    }

    const distanceFromBottom = panelBody.scrollHeight - panelBody.scrollTop - panelBody.clientHeight;
    shouldAutoFollowRef.current = distanceFromBottom <= 24;
  }

  return (
    <article className={styles.panel} data-emphasis={emphasis}>
      <div className={styles.panelChrome}>
        <div className={styles.panelTraffic} aria-hidden="true">
          <span className={`${styles.panelLight} ${styles.panelLightRed}`} />
          <span className={`${styles.panelLight} ${styles.panelLightAmber}`} />
          <span className={`${styles.panelLight} ${styles.panelLightGreen}`} />
        </div>

        <div className={styles.panelHeading}>
          <div className={styles.panelHeadingTop}>
            <h3 className={styles.panelTitle}>{session.displayTitle}</h3>
            <span className={styles.panelLiveBadge}>LIVE</span>
          </div>

          <div className={styles.panelMeta}>
            <span>{formatActivityLabel(session.lastActivityAt)}</span>
            <span className={styles.panelMetaDivider} aria-hidden="true">
              /
            </span>
            <span>{session.sessionType}</span>
          </div>

          <div className={styles.panelChips}>
            {session.currentProvider ? (
              <span className={styles.providerChip}>{session.currentProvider}</span>
            ) : null}
            {session.currentModel ? (
              <span className={styles.modelChip}>{session.currentModel}</span>
            ) : null}
          </div>
        </div>
      </div>

      <div ref={panelBodyRef} className={styles.panelBody} onScroll={handlePanelBodyScroll}>
        {session.entries.length > 0 ? (
          session.entries.map((entry) => (
            <section key={entry.entryId} className={styles.entryRow} data-kind={entry.kind}>
              <div className={styles.entryHeader}>
                <span className={styles.entryLabel}>{ENTRY_LABELS[entry.kind]}</span>
                <time className={styles.entryTime} dateTime={entry.at}>
                  {formatClockLabel(entry.at)}
                </time>
              </div>
              {renderEntryContent(entry)}
            </section>
          ))
        ) : (
          <section className={styles.entryRow} data-kind="assistant_final">
            <div className={styles.entryHeader}>
              <span className={styles.entryLabel}>workspace idle</span>
            </div>
            <p className={styles.entryText}>no public transcript rows yet</p>
          </section>
        )}
      </div>
    </article>
  );
}
