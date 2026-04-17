import type {
  InniesMonitorActivityItem,
  InniesMonitorActivityPayload,
  InniesMonitorActivityStream,
} from '../../../hooks/useInniesMonitorActivity';

export type ActivityRailTone = 'neutral' | 'live' | 'warn';
export type ActivityRailStream = InniesMonitorActivityStream;

export type ActivityRailEntry = {
  id: string;
  eyebrow: string;
  title: string;
  detail: string | null;
  meta: string | null;
  occurredAt: string;
  tone: ActivityRailTone;
};

export type ActivityRailSection = {
  id: ActivityRailStream;
  label: string;
  summary: string;
  emptyTitle: string;
  emptyDetail: string;
  count: number;
  items: ActivityRailEntry[];
};

const STREAM_ORDER: ActivityRailStream[] = [
  'live_sessions',
  'latest_prompts',
  'archive_trail',
];

const STREAM_META: Record<ActivityRailStream, Omit<ActivityRailSection, 'count' | 'items'>> = {
  live_sessions: {
    id: 'live_sessions',
    label: 'LIVE SESSIONS',
    summary: 'Newest active Innies lanes and the latest session-level heartbeat per run.',
    emptyTitle: 'No live sessions in the current window',
    emptyDetail: 'The public live session feed has not emitted any active lanes yet.',
  },
  latest_prompts: {
    id: 'latest_prompts',
    label: 'LATEST PROMPTS',
    summary: 'User prompts, tool calls, assistant finals, and provider switches from the live feed.',
    emptyTitle: 'No prompt trail items available',
    emptyDetail: 'Prompt and tool activity will land here as the live sessions feed updates.',
  },
  archive_trail: {
    id: 'archive_trail',
    label: 'ARCHIVE TRAIL',
    summary: 'Recent archived session summaries and bounded event fan-out for historical context.',
    emptyTitle: 'No archive trail entries available',
    emptyDetail: 'Archive summaries and event samples will show up here when the admin feed responds.',
  },
};

function cleanValue(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function compactLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function kindLabel(item: InniesMonitorActivityItem): string {
  switch (item.kind) {
    case 'session':
      return item.stream === 'archive_trail' ? 'archive session' : 'live session';
    case 'assistant_final':
      return 'assistant final';
    case 'tool_call':
      return 'tool call';
    case 'tool_result':
      return 'tool result';
    case 'provider_switch':
      return 'provider switch';
    case 'request_message':
      return 'archive request';
    case 'response_message':
      return 'archive response';
    case 'attempt_status':
      return 'attempt status';
    case 'user':
    default:
      return 'user prompt';
  }
}

function describeProviderModel(item: InniesMonitorActivityItem): string | null {
  const parts = [cleanValue(item.provider), cleanValue(item.model)].filter((value): value is string => Boolean(value));
  return parts.length > 0 ? parts.join(' / ') : null;
}

function itemTone(item: InniesMonitorActivityItem): ActivityRailTone {
  const normalizedStatus = cleanValue(item.status)?.toLowerCase();
  if (normalizedStatus === 'failed' || normalizedStatus === 'error' || normalizedStatus === 'partial') {
    return 'warn';
  }

  if (item.stream === 'live_sessions' || item.kind === 'provider_switch') {
    return 'live';
  }

  return 'neutral';
}

function itemMeta(item: InniesMonitorActivityItem): string | null {
  const parts = [
    cleanValue(item.sessionType)?.toUpperCase() ?? null,
    cleanValue(item.sessionKey),
    describeProviderModel(item),
    cleanValue(item.status)?.toUpperCase() ?? null,
  ].filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(' · ') : null;
}

function itemDetail(item: InniesMonitorActivityItem): string | null {
  return cleanValue(item.detail) ?? describeProviderModel(item);
}

function toEntry(item: InniesMonitorActivityItem): ActivityRailEntry {
  return {
    id: item.id,
    eyebrow: compactLabel(kindLabel(item)),
    title: item.title,
    detail: itemDetail(item),
    meta: itemMeta(item),
    occurredAt: item.occurredAt,
    tone: itemTone(item),
  };
}

export function deriveActivityRailSections(
  payload: InniesMonitorActivityPayload | null,
): ActivityRailSection[] {
  return STREAM_ORDER.map((stream) => {
    const items = (payload?.items ?? [])
      .filter((item) => item.stream === stream)
      .map((item) => toEntry(item));

    return {
      ...STREAM_META[stream],
      count: items.length,
      items,
    };
  });
}

export function findPreferredActivityRailStream(input: {
  current: ActivityRailStream;
  sections: ActivityRailSection[];
}): ActivityRailStream {
  const currentSection = input.sections.find((section) => section.id === input.current);
  if (currentSection && currentSection.count > 0) {
    return currentSection.id;
  }

  const firstPopulatedSection = input.sections.find((section) => section.count > 0);
  return firstPopulatedSection?.id ?? input.current;
}
