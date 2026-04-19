'use client';

import { useEffect, useMemo, useRef } from 'react';
import type {
  InniesLiveMessage,
  InniesLiveMessagePart,
  InniesLiveSession,
  InniesLiveTurn
} from '../../lib/inniesLive/feedTypes';
import styles from './sessionsBoard.module.css';

type SessionPanelProps = {
  session: InniesLiveSession;
};

type RenderedEntry = {
  id: string;
  kind: 'system' | 'user' | 'assistant';
  text: string;
  at: string;
  model: string | null;
};

/**
 * Collapse a raw provider model string into the shortest conventional
 * nickname a human would use in chat: `gpt-5.4`, `opus`, `sonnet`, etc.
 * Falls back to the raw string (truncated) when it doesn't match any
 * known family.
 */
function formatModelLabel(rawModel: string | null | undefined): string {
  if (!rawModel) return 'assistant';
  const model = rawModel.toLowerCase();

  // Anthropic families (`claude-3-5-sonnet-20241022`, `claude-opus-4-*`).
  if (model.includes('opus')) return 'opus';
  if (model.includes('sonnet')) return 'sonnet';
  if (model.includes('haiku')) return 'haiku';

  // OpenAI families: preserve the generation prefix (`gpt-4`, `gpt-5.4`,
  // `gpt-4o`, `o1`, `o3`).
  const gptMatch = model.match(/^gpt-(\d+(?:\.\d+)?(?:-[a-z]+)?)/);
  if (gptMatch) return `gpt-${gptMatch[1]}`;
  const oSeriesMatch = model.match(/^(o\d+(?:-[a-z]+)?)/);
  if (oSeriesMatch) return oSeriesMatch[1];

  // Fallback: last 14 chars so ids stay legible without overflowing the
  // label column.
  return rawModel.length <= 14 ? rawModel : `…${rawModel.slice(-13)}`;
}

function formatClock(value: string): string {
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return '--';
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(ts);
}

function formatRelative(value: string): string {
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return '--';
  const delta = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (delta < 60) return 'just now';
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(ts);
}

function isReasoningJsonPart(part: InniesLiveMessagePart): boolean {
  if (part.type !== 'json') return false;
  const value = part.value;
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    record.type === 'reasoning'
    || record.type === 'thinking'
    || record.type === 'redacted_thinking'
    || typeof record.encrypted_content === 'string'
    || typeof record.signature === 'string'
  );
}

function partsToText(parts: InniesLiveMessagePart[] | undefined): string {
  if (!parts) return '';
  const textBits: string[] = [];
  for (const part of parts) {
    switch (part.type) {
      case 'text':
        if (typeof part.text === 'string' && part.text.length > 0) textBits.push(part.text);
        break;
      case 'json':
        // Hide codex "reasoning" blocks (encrypted, non-human-readable chain-of-thought).
        if (isReasoningJsonPart(part)) break;
        textBits.push(safeStringify(part.value));
        break;
      case 'tool_call':
      case 'tool_result':
        // Tool activity is intentionally hidden from the panel transcript.
        break;
      default:
        break;
    }
  }
  return textBits.join('\n');
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function messageToEntries(turn: InniesLiveTurn, message: InniesLiveMessage): RenderedEntry[] {
  const at = turn.completedAt ?? turn.startedAt;
  const role = (message.normalizedPayload.role ?? message.role ?? '').toLowerCase();
  const parts = (message.normalizedPayload.content as InniesLiveMessagePart[] | undefined) ?? [];

  const idBase = `${turn.archiveId}:${message.side}:${message.ordinal}`;
  const entries: RenderedEntry[] = [];

  const text = partsToText(parts);
  if (text.length > 0) {
    const kind: RenderedEntry['kind'] =
      role === 'system' ? 'system'
      : role === 'assistant' || message.side === 'response' ? 'assistant'
      : 'user';
    entries.push({ id: `${idBase}:text`, kind, text, at, model: turn.model ?? null });
  }

  // Tool calls and tool results are intentionally not rendered in the panel
  // — they're implementation detail, not part of the user-facing conversation.

  return entries;
}

/**
 * Flatten a session's turns into a render-ready transcript.
 * - For turn 0: show every message.
 * - For turn N>0: only show messages whose (side, ordinal) didn't appear in turn N-1.
 *   Since innies dedupes messages by content_hash across turns and codex/claude
 *   conversations are append-only, this effectively shows only the NEW user prompt
 *   and the NEW response per turn.
 */
function flattenSession(session: InniesLiveSession): Array<{
  turnLabel: string;
  entries: RenderedEntry[];
}> {
  const result: Array<{ turnLabel: string; entries: RenderedEntry[] }> = [];
  let priorMaxOrdinal: Record<'request' | 'response', number> = { request: -1, response: -1 };

  session.turns.forEach((turn, index) => {
    const entries: RenderedEntry[] = [];
    for (const message of turn.messages) {
      const prior = priorMaxOrdinal[message.side];
      if (index > 0 && message.ordinal <= prior) continue; // already rendered in an earlier turn
      entries.push(...messageToEntries(turn, message));
    }

    // Update priorMaxOrdinal after rendering
    for (const message of turn.messages) {
      if (message.ordinal > priorMaxOrdinal[message.side]) {
        priorMaxOrdinal[message.side] = message.ordinal;
      }
    }

    if (entries.length > 0) {
      result.push({
        turnLabel: `turn ${index + 1} · ${formatClock(turn.startedAt)}`,
        entries
      });
    }
  });

  return result;
}

function buildDisplayTitle(session: InniesLiveSession): string {
  if (session.sessionKey.startsWith('archive:')) {
    return `legacy ${session.sessionKey.slice(8, 16)}`;
  }
  const head = session.sessionKey.slice(0, 8);
  // Use the model nickname (opus / gpt-5.4 / …) instead of the raw provider
  // so the header carries the same label the transcript rows use.
  const modelLabel = formatModelLabel(session.modelSet[0] ?? null);
  return `${modelLabel} · ${head}`;
}

export function SessionPanel({ session }: SessionPanelProps) {
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const shouldAutoFollowRef = useRef(true);

  const flattened = useMemo(() => flattenSession(session), [session]);
  const entryCount = flattened.reduce((sum, group) => sum + group.entries.length, 0);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el || !shouldAutoFollowRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [entryCount]);

  function handleScroll() {
    const el = bodyRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoFollowRef.current = distanceFromBottom <= 24;
  }

  return (
    <article className={styles.panel}>
      <header className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <span>{'//'} session</span>
          <span className={styles.panelTitleMain}>{buildDisplayTitle(session)}</span>
          <span className={styles.panelMetaDivider}>·</span>
          <span>{formatRelative(session.lastActivityAt)}</span>
        </div>
      </header>

      <div ref={bodyRef} className={styles.panelBody} onScroll={handleScroll}>
        {flattened.length === 0 ? (
          <div className={styles.empty}>{'//'} no transcript rows yet</div>
        ) : (
          flattened.map((group, idx) => (
            <section key={`${session.sessionKey}:${idx}`}>
              {idx > 0 ? (
                <div className={styles.turnSeparator}>{'//'} {group.turnLabel}</div>
              ) : null}
              {group.entries.map((entry) => {
                const label =
                  entry.kind === 'user'
                    ? 'shirtless'
                    : entry.kind === 'assistant'
                    ? formatModelLabel(entry.model)
                    : entry.kind;
                return (
                  <div
                    key={entry.id}
                    className={styles.entryRow}
                    data-side={entry.kind === 'assistant' ? 'response' : 'request'}
                    data-role={entry.kind}
                  >
                    <span className={styles.entryLabel}>{label}{'>'}</span>
                    <p className={styles.entryText} data-role={entry.kind}>{entry.text}</p>
                  </div>
                );
              })}
            </section>
          ))
        )}
      </div>
    </article>
  );
}
