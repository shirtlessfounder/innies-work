'use client';

import { startTransition, useDeferredValue, useEffect, useState } from 'react';
import {
  INNIES_MONITOR_ACTIVITY_POLL_INTERVAL_MS,
  useInniesMonitorActivity,
} from '../../../hooks/useInniesMonitorActivity';
import {
  deriveActivityRailSections,
  findPreferredActivityRailStream,
  type ActivityRailEntry,
  type ActivityRailSection,
  type ActivityRailStream,
} from '../adapters/activityFeed';
import styles from '../inniesMonitor.module.css';

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

function railTone(liveStatus: string): '' | string {
  return liveStatus === 'live' ? styles.moduleBadgeLive : '';
}

function railSummary(input: {
  activeSection: ActivityRailSection;
  error: string | null;
  lastSuccessfulUpdateAt: string | null;
}): string {
  const parts = [input.activeSection.summary, `POLL ${INNIES_MONITOR_ACTIVITY_POLL_INTERVAL_MS / 1000}s`];
  const lastUpdated = formatWhen(input.lastSuccessfulUpdateAt);
  if (lastUpdated) {
    parts.push(`LAST ${lastUpdated}`);
  }
  if (input.error) {
    parts.push(input.error);
  }
  return parts.join(' · ');
}

function itemMeta(entry: ActivityRailEntry): string {
  const parts = [formatWhen(entry.occurredAt), entry.meta].filter((value): value is string => Boolean(value));
  return parts.join(' · ');
}

function emptyState(input: {
  activeSection: ActivityRailSection;
  error: string | null;
  liveStatus: string;
}) {
  if (input.liveStatus === 'loading') {
    return {
      eyebrow: 'loading',
      title: 'Waiting for the activity feed',
      detail: 'The client is polling /api/innies/monitor/activity for the first payload.',
      meta: `POLL ${INNIES_MONITOR_ACTIVITY_POLL_INTERVAL_MS / 1000}s`,
      tone: 'neutral' as const,
    };
  }

  return {
    eyebrow: input.liveStatus === 'degraded' ? 'degraded' : 'empty',
    title: input.activeSection.emptyTitle,
    detail: input.error ?? input.activeSection.emptyDetail,
    meta: `Subview: ${input.activeSection.label}`,
    tone: input.liveStatus === 'degraded' ? 'warn' as const : 'neutral' as const,
  };
}

export function ActivityRailModule() {
  const activity = useInniesMonitorActivity();
  const sections = useDeferredValue(deriveActivityRailSections(activity.payload));
  const [selectedStream, setSelectedStream] = useState<ActivityRailStream>('live_sessions');

  useEffect(() => {
    const preferredStream = findPreferredActivityRailStream({
      current: selectedStream,
      sections,
    });

    if (preferredStream !== selectedStream) {
      startTransition(() => {
        setSelectedStream(preferredStream);
      });
    }
  }, [sections, selectedStream]);

  const activeSection = sections.find((section) => section.id === selectedStream) ?? sections[0];
  const fallback = activeSection
    ? emptyState({
      activeSection,
      error: activity.error,
      liveStatus: activity.liveStatus,
    })
    : null;

  return (
    <div className={styles.moduleFrame}>
      <header className={styles.moduleHeader}>
        <div>
          <div className={styles.moduleEyebrow}>LIVE ACTIVITY</div>
          <h2 className={styles.moduleTitle}>activity rail</h2>
        </div>
        <div className={`${styles.moduleBadge} ${railTone(activity.liveStatus)}`.trim()}>
          {activity.liveStatus.toUpperCase()}
        </div>
      </header>
      <div className={styles.dockTabs}>
        {sections.map((section) => (
          <button
            className={styles.dockTab}
            data-active={section.id === activeSection?.id}
            key={section.id}
            onClick={() => {
              startTransition(() => {
                setSelectedStream(section.id);
              });
            }}
            type="button"
          >
            <div className={styles.groupLabel}>{section.label}</div>
            <div className={styles.placeholderTitle}>{section.count}</div>
            <div className={styles.dockTabSummary}>{section.summary}</div>
          </button>
        ))}
      </div>
      <div className={styles.groupStack}>
        {activeSection ? (
          <section className={styles.groupPanel}>
            <div className={styles.groupLabel}>{activeSection.label}</div>
            <p className={styles.groupDetail}>
              {railSummary({
                activeSection,
                error: activity.error,
                lastSuccessfulUpdateAt: activity.lastSuccessfulUpdateAt,
              })}
            </p>
            <div className={styles.cardStack}>
              {activeSection.items.length > 0 ? (
                activeSection.items.map((entry) => (
                  <article className={styles.placeholderCard} data-tone={entry.tone} key={entry.id}>
                    <div className={styles.placeholderEyebrow}>{entry.eyebrow}</div>
                    <h3 className={styles.placeholderTitle}>{entry.title}</h3>
                    {entry.detail ? <p className={styles.placeholderDetail}>{entry.detail}</p> : null}
                    <div className={styles.placeholderMeta}>{itemMeta(entry)}</div>
                  </article>
                ))
              ) : fallback ? (
                <article className={styles.placeholderCard} data-tone={fallback.tone}>
                  <div className={styles.placeholderEyebrow}>{fallback.eyebrow}</div>
                  <h3 className={styles.placeholderTitle}>{fallback.title}</h3>
                  <p className={styles.placeholderDetail}>{fallback.detail}</p>
                  <div className={styles.placeholderMeta}>{fallback.meta}</div>
                </article>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
