'use client';

import { useDeferredValue, useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  INNIES_MONITOR_ACTIVITY_POLL_INTERVAL_MS,
  useInniesMonitorActivity,
  type InniesMonitorActivityItem,
  type InniesMonitorActivityPayload,
} from '../../hooks/useInniesMonitorActivity';
import styles from './liveSessionsCarousel.module.css';

const LIVE_SESSIONS_SURFACE_STYLE = {
  '--shell-line': 'var(--console-line)',
  '--shell-panel-strong': 'rgba(248, 251, 253, 0.82)',
} as CSSProperties;

type LiveSessionCard = {
  session: InniesMonitorActivityItem;
  trail: InniesMonitorActivityItem[];
};

function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

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

function labelForKind(kind: InniesMonitorActivityItem['kind']): string {
  switch (kind) {
    case 'assistant_final':
      return 'assistant';
    case 'provider_switch':
      return 'switch';
    case 'attempt_status':
      return 'attempt';
    case 'request_message':
      return 'request';
    case 'response_message':
      return 'response';
    case 'session':
      return 'session';
    case 'user':
    default:
      return 'user';
  }
}

function messageDetail(message: InniesMonitorActivityItem): string | null {
  if (message.kind === 'provider_switch' || message.kind === 'attempt_status') {
    return message.detail;
  }
  return null;
}

function sessionHeaderMeta(card: LiveSessionCard): string {
  return `${formatCount(card.trail.length)} MESSAGES`;
}

function sessionSourceLabel(session: InniesMonitorActivityItem): string {
  return session.sessionType === 'openclaw' ? 'openclaw' : 'cli';
}

function sessionAgentLabel(session: InniesMonitorActivityItem): string {
  const provider = session.provider?.trim().toLowerCase() ?? '';
  const model = session.model?.trim().toLowerCase() ?? '';
  const combined = `${provider} ${model}`;

  if (combined.includes('claude') || combined.includes('anthropic')) {
    return 'claude';
  }

  if (combined.includes('codex') || combined.includes('openai') || combined.includes('gpt')) {
    return 'codex';
  }

  return provider || model || 'agent';
}

function sessionHeaderTitle(card: LiveSessionCard): string {
  return `${sessionSourceLabel(card.session)} · ${sessionAgentLabel(card.session)}`;
}

function sessionHeaderDetail(card: LiveSessionCard): string {
  const parts = [
    card.session.provider,
    card.session.model,
    formatWhen(card.session.occurredAt),
  ].filter((value): value is string => Boolean(value));

  return parts.join(' · ');
}

function messageTimestampLabel(value: string): string {
  return formatWhen(value) ?? '--';
}

function messageActorLabel(card: LiveSessionCard, message: InniesMonitorActivityItem): string {
  switch (message.kind) {
    case 'user':
      return sessionSourceLabel(card.session).toUpperCase();
    case 'assistant_final':
      return sessionAgentLabel(card.session).toUpperCase();
    default:
      return labelForKind(message.kind).toUpperCase();
  }
}

function buildLiveSessionCards(payload: InniesMonitorActivityPayload | null): LiveSessionCard[] {
  if (!payload) return [];

  const liveSessions = payload.items.filter((item) => item.stream === 'live_sessions');
  const latestPrompts = payload.items.filter((item) => item.stream === 'latest_prompts');

  return liveSessions.map((session) => ({
    session,
    trail: latestPrompts
      .filter((item) => item.sessionKey === session.sessionKey)
      .filter((item) => item.kind !== 'tool_call')
      .filter((item) => item.kind !== 'tool_result')
      .sort((left, right) => Date.parse(left.occurredAt) - Date.parse(right.occurredAt)),
  }));
}

function liveSessionCardKey(card: LiveSessionCard): string {
  return card.session.sessionKey ?? card.session.id;
}

function latestActivityTimestamp(card: LiveSessionCard): string {
  return card.trail.at(-1)?.occurredAt ?? card.session.occurredAt;
}

function latestActivityTimestampMs(card: LiveSessionCard): number {
  const parsed = Date.parse(latestActivityTimestamp(card));
  return Number.isFinite(parsed) ? parsed : 0;
}

function EmptyStateCard(input: {
  error: string | null;
  liveStatus: string;
}) {
  const eyebrow = input.liveStatus === 'loading'
    ? 'loading'
    : input.liveStatus === 'degraded'
      ? 'degraded'
      : 'empty';
  const title = input.liveStatus === 'loading'
    ? 'Waiting for the activity feed'
    : 'No live sessions in the current window';
  const detail = input.liveStatus === 'loading'
    ? 'The client is polling /api/innies/monitor/activity for the first payload.'
    : input.error ?? 'The public live session feed has not emitted any active lanes yet.';
  const meta = input.liveStatus === 'loading'
    ? `POLL ${INNIES_MONITOR_ACTIVITY_POLL_INTERVAL_MS / 1000}s`
    : 'Awaiting active session traffic.';

  return (
    <article className={`${styles.card} shrink-0 flex flex-col`} data-tone="neutral">
      <div className={styles.cardHeader}>
        <h3 className="font-ibm-plex-mono text-[13px] leading-[1.45] tracking-[0.14em] uppercase text-[rgb(22,51,62)] break-all">
          {title}
        </h3>
        <p className="mt-2 font-ibm-plex-mono text-[12px] leading-[1.55] text-[rgba(22,51,62,0.68)] break-all whitespace-pre-wrap">
          {detail}
        </p>
        <div className="mt-2 font-ibm-plex-mono text-[11px] tracking-[0.14em] uppercase text-[rgba(22,51,62,0.6)] break-all">
          {eyebrow} · {meta}
        </div>
      </div>
    </article>
  );
}

function LiveSessionCardItem(input: {
  card: LiveSessionCard;
  cardKey: string;
}) {
  const { card, cardKey } = input;
  const latestMessageId = card.trail.at(-1)?.id ?? null;
  const lastMessageIdRef = useRef<string | null>(null);
  const [flashedMessageId, setFlashedMessageId] = useState<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = transcriptRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [card.trail]);

  useEffect(() => {
    if (latestMessageId === null) {
      lastMessageIdRef.current = null;
      setFlashedMessageId(null);
      return;
    }

    if (lastMessageIdRef.current === null) {
      lastMessageIdRef.current = latestMessageId;
      return;
    }

    if (lastMessageIdRef.current !== latestMessageId) {
      lastMessageIdRef.current = latestMessageId;
      setFlashedMessageId(latestMessageId);
      return;
    }

    lastMessageIdRef.current = latestMessageId;
  }, [latestMessageId]);

  useEffect(() => {
    if (flashedMessageId === null) return;

    const timeoutId = window.setTimeout(() => {
      setFlashedMessageId((current) => (current === latestMessageId ? null : current));
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [flashedMessageId, latestMessageId]);

  return (
    <article
      className={`${styles.card} shrink-0 flex flex-col`}
      data-session-key={cardKey}
      data-tone={card.session.status === 'live' ? 'live' : 'neutral'}
    >
      <div ref={transcriptRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col">
          <div className={styles.cardHeader}>
            <div className="flex items-start gap-3">
              <h3 className={styles.cardTitle}>{sessionHeaderTitle(card)}</h3>
              <div className="ml-auto shrink-0 text-right font-ibm-plex-mono text-[11px] tracking-[0.14em] uppercase text-[rgba(22,51,62,0.6)]">
                {sessionHeaderMeta(card)}
              </div>
            </div>
            <p className={styles.cardHeaderDetail}>{sessionHeaderDetail(card)}</p>
          </div>

          <div className="min-h-0 flex-1 flex flex-col justify-end">
            {card.trail.length > 0 ? card.trail.map((message) => (
              <div
                className={`${styles.messageRow} ${message.id === flashedMessageId ? styles.rowDeltaFlash : ''}`.trim()}
                key={message.id}
              >
                <div className="flex items-center gap-3 font-ibm-plex-mono text-[11px] tracking-[0.14em] uppercase text-[rgba(22,51,62,0.58)]">
                  <span className="min-w-0 break-all">{messageActorLabel(card, message)}</span>
                  <span className="ml-auto shrink-0 text-right">{messageTimestampLabel(message.occurredAt)}</span>
                </div>
                <p className="mt-2 font-ibm-plex-mono text-[12px] leading-[1.55] text-[rgb(22,51,62)] break-all whitespace-pre-wrap">
                  {message.title}
                </p>
                {messageDetail(message) ? (
                  <div className={styles.messageDetail}>
                    {messageDetail(message)}
                  </div>
                ) : null}
              </div>
            )) : (
              <div className={styles.messageRow}>
                <div className="font-ibm-plex-mono text-[11px] tracking-[0.14em] uppercase text-[rgba(22,51,62,0.58)] break-all">
                  STATUS
                </div>
                <p className="mt-2 font-ibm-plex-mono text-[12px] leading-[1.55] text-[rgba(22,51,62,0.68)] break-all">
                  No prompt trail yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function LiveSessionsCarousel() {
  const activity = useInniesMonitorActivity();
  const deferredPayload = useDeferredValue(activity.payload);
  const [focusedSessionKey, setFocusedSessionKey] = useState<string | null>(null);
  const liveCards = buildLiveSessionCards(deferredPayload);
  const renderedCards = [...liveCards].sort((left, right) => {
    const timestampDelta = latestActivityTimestampMs(right) - latestActivityTimestampMs(left);
    if (timestampDelta !== 0) return timestampDelta;
    return liveSessionCardKey(left).localeCompare(liveSessionCardKey(right));
  });
  const focusedCards = focusedSessionKey
    ? renderedCards.filter((card) => liveSessionCardKey(card) === focusedSessionKey)
    : [];
  const visibleCards = focusedCards.length > 0 ? focusedCards : renderedCards;
  const headerMeta = `${formatCount(renderedCards.length)} ${renderedCards.length === 1 ? 'SESSION' : 'SESSIONS'}`;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    const nextFocusedSessionKey = searchParams.get('sessionKey');
    setFocusedSessionKey(nextFocusedSessionKey?.trim() || null);
  }, []);

  return (
    <section className={styles.surface} style={LIVE_SESSIONS_SURFACE_STYLE}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>{'> LIVE CLI SESSIONS'}</div>
        <div className={styles.sectionMeta}>{headerMeta}</div>
      </div>

      <div
        className="overflow-x-auto scroll-smooth pb-1"
        style={{ overflowAnchor: 'none' }}
      >
        <div className="flex min-w-max gap-3 pr-3">
          {visibleCards.length > 0 ? visibleCards.map((card) => {
            const cardKey = liveSessionCardKey(card);

            return (
              <LiveSessionCardItem
                card={card}
                cardKey={cardKey}
                key={cardKey}
              />
            );
          }) : (
            <EmptyStateCard error={activity.error} liveStatus={activity.liveStatus} />
          )}
        </div>
      </div>
    </section>
  );
}
