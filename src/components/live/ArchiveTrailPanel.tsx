'use client';

import { useDeferredValue } from 'react';
import {
  INNIES_MONITOR_ACTIVITY_POLL_INTERVAL_MS,
  useInniesMonitorActivity,
} from '../../hooks/useInniesMonitorActivity';
import {
  deriveActivityRailSections,
  type ActivityRailEntry,
  type ActivityRailSection,
} from '../../features/innies-monitor/adapters/activityFeed';
import styles from '../../features/innies-monitor/inniesMonitor.module.css';

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return '--';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).replace(',', '');
}

function formatLocalTimeZoneAbbreviation(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return '';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZoneName: 'short',
  }).formatToParts(date);
  return parts.find((part) => part.type === 'timeZoneName')?.value?.trim() ?? '';
}

function formatWhen(value: string | null): string | null {
  if (!value) return null;
  return `${formatTimestamp(value)} ${formatLocalTimeZoneAbbreviation(value)}`;
}

function itemMeta(entry: ActivityRailEntry): string {
  const parts = [formatWhen(entry.occurredAt), entry.meta].filter((value): value is string => Boolean(value));
  return parts.join(' · ');
}

function panelSummary(input: {
  section: ActivityRailSection;
  error: string | null;
  lastSuccessfulUpdateAt: string | null;
}): string {
  const parts = [input.section.summary, `POLL ${INNIES_MONITOR_ACTIVITY_POLL_INTERVAL_MS / 1000}s`];
  const lastUpdated = formatWhen(input.lastSuccessfulUpdateAt);
  if (lastUpdated) {
    parts.push(`LAST ${lastUpdated}`);
  }
  if (input.error) {
    parts.push(input.error);
  }
  return parts.join(' · ');
}

function emptyState(input: {
  section: ActivityRailSection | null;
  error: string | null;
  liveStatus: string;
}) {
  if (input.liveStatus === 'loading') {
    return {
      eyebrow: 'loading',
      title: 'Waiting for the archive trail',
      detail: 'Archive summaries will appear once the merged monitor feed returns its first payload.',
      meta: `POLL ${INNIES_MONITOR_ACTIVITY_POLL_INTERVAL_MS / 1000}s`,
      tone: 'neutral' as const,
    };
  }

  return {
    eyebrow: input.liveStatus === 'degraded' ? 'degraded' : 'empty',
    title: input.section?.emptyTitle ?? 'No archive trail entries available',
    detail: input.error ?? input.section?.emptyDetail ?? 'Archive summaries are waiting on the admin feed.',
    meta: 'Archive context',
    tone: input.liveStatus === 'degraded' ? 'warn' as const : 'neutral' as const,
  };
}

export function ArchiveTrailPanel() {
  const activity = useInniesMonitorActivity();
  const sections = useDeferredValue(deriveActivityRailSections(activity.payload));
  const archiveSection = sections.find((section) => section.id === 'archive_trail') ?? null;
  const fallback = emptyState({
    section: archiveSection,
    error: activity.error,
    liveStatus: activity.liveStatus,
  });

  return (
    <section className={styles.groupPanel}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={styles.groupLabel}>ARCHIVE CONTEXT</div>
          <h2 className={styles.placeholderTitle}>archive trail</h2>
        </div>
        <div className={`${styles.moduleBadge} ${activity.liveStatus === 'live' ? styles.moduleBadgeLive : ''}`.trim()}>
          {activity.liveStatus.toUpperCase()}
        </div>
      </div>
      <p className={styles.groupDetail}>
        {archiveSection
          ? panelSummary({
            section: archiveSection,
            error: activity.error,
            lastSuccessfulUpdateAt: activity.lastSuccessfulUpdateAt,
          })
          : fallback.detail}
      </p>
      <div className={styles.cardStack}>
        {archiveSection && archiveSection.items.length > 0 ? (
          archiveSection.items.map((entry) => (
            <article className={styles.placeholderCard} data-tone={entry.tone} key={entry.id}>
              <div className={styles.placeholderEyebrow}>{entry.eyebrow}</div>
              <h3 className={styles.placeholderTitle}>{entry.title}</h3>
              {entry.detail ? <p className={styles.placeholderDetail}>{entry.detail}</p> : null}
              <div className={styles.placeholderMeta}>{itemMeta(entry)}</div>
            </article>
          ))
        ) : (
          <article className={styles.placeholderCard} data-tone={fallback.tone}>
            <div className={styles.placeholderEyebrow}>{fallback.eyebrow}</div>
            <h3 className={styles.placeholderTitle}>{fallback.title}</h3>
            <p className={styles.placeholderDetail}>{fallback.detail}</p>
            <div className={styles.placeholderMeta}>{fallback.meta}</div>
          </article>
        )}
      </div>
    </section>
  );
}
