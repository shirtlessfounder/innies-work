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

type RenderedEntry =
  | { id: string; kind: 'system' | 'user' | 'assistant'; text: string; at: string }
  | { id: string; kind: 'tool_call'; text: string; at: string }
  | { id: string; kind: 'tool_result'; text: string; at: string };

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

function partsToText(parts: InniesLiveMessagePart[] | undefined): string {
  if (!parts) return '';
  const textBits: string[] = [];
  for (const part of parts) {
    switch (part.type) {
      case 'text':
        if (typeof part.text === 'string' && part.text.length > 0) textBits.push(part.text);
        break;
      case 'json':
        textBits.push(safeStringify(part.value));
        break;
      case 'tool_call':
      case 'tool_result':
        // handled separately below
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
    entries.push({ id: `${idBase}:text`, kind, text, at });
  }

  for (const part of parts) {
    if (part.type === 'tool_call') {
      const args = safeStringify(part.arguments ?? {});
      entries.push({
        id: `${idBase}:tool:${part.id ?? 'anon'}`,
        kind: 'tool_call',
        text: `→ ${part.name ?? '(tool)'}(${args})`,
        at
      });
    } else if (part.type === 'tool_result') {
      entries.push({
        id: `${idBase}:toolres:${part.toolUseId ?? 'anon'}`,
        kind: 'tool_result',
        text: typeof part.content === 'string' ? part.content : safeStringify(part.content),
        at
      });
    }
  }

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
  const provider = session.providerSet[0] ?? 'session';
  return `${provider} · ${head}`;
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
          <span className={styles.panelTitleMain}>{buildDisplayTitle(session)}</span>
          <span className={styles.panelLiveBadge}>LIVE</span>
        </div>
        <div className={styles.panelMeta}>
          <span>{formatRelative(session.lastActivityAt)}</span>
          <span className={styles.panelMetaDivider}>·</span>
          <span>{session.turnCount} turn{session.turnCount === 1 ? '' : 's'}</span>
        </div>
        <div className={styles.panelChips}>
          {session.providerSet.map((provider) => (
            <span key={provider} className={styles.chip}>{provider}</span>
          ))}
          {session.modelSet.map((model) => (
            <span key={model} className={styles.chip}>{model}</span>
          ))}
        </div>
      </header>

      <div ref={bodyRef} className={styles.panelBody} onScroll={handleScroll}>
        {flattened.length === 0 ? (
          <div className={styles.empty}>no transcript rows yet</div>
        ) : (
          flattened.map((group, idx) => (
            <section key={`${session.sessionKey}:${idx}`}>
              {idx > 0 ? <div className={styles.turnSeparator}>{group.turnLabel}</div> : null}
              {group.entries.map((entry) => (
                <div
                  key={entry.id}
                  className={styles.entryRow}
                  data-side={entry.kind === 'assistant' ? 'response' : 'request'}
                  data-role={entry.kind}
                >
                  <span className={styles.entryLabel}>{entry.kind.replace('_', ' ')}</span>
                  {entry.kind === 'tool_call' || entry.kind === 'tool_result' ? (
                    <pre className={styles.entryTool}>{entry.text}</pre>
                  ) : (
                    <p className={styles.entryText} data-role={entry.kind}>{entry.text}</p>
                  )}
                </div>
              ))}
            </section>
          ))
        )}
      </div>
    </article>
  );
}
