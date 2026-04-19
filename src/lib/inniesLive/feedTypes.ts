// Mirrors the shape returned by Innies GET /v1/admin/me/live-sessions.
// Keep these types aligned with
// innies/api/src/services/adminLive/myLiveSessionsTypes.ts.

export type InniesLiveMessagePart =
  | { type: 'text'; text: string }
  | { type: 'tool_call'; id: string | null; name: string | null; arguments: unknown }
  | { type: 'tool_result'; toolUseId: string | null; content: unknown }
  | { type: 'json'; value: unknown };

export type InniesLiveMessage = {
  side: 'request' | 'response';
  ordinal: number;
  role: string | null;
  contentType: string;
  normalizedPayload: { role?: string; content?: InniesLiveMessagePart[] } & Record<string, unknown>;
};

export type InniesLiveTurn = {
  archiveId: string;
  requestId: string;
  attemptNo: number;
  provider: string;
  model: string;
  streaming: boolean;
  status: 'success' | 'failed' | 'partial';
  upstreamStatus: number | null;
  startedAt: string;
  completedAt: string | null;
  messages: InniesLiveMessage[];
};

export type InniesLiveSession = {
  sessionKey: string;
  apiKeyId: string;
  startedAt: string;
  lastActivityAt: string;
  turnCount: number;
  providerSet: string[];
  modelSet: string[];
  turns: InniesLiveTurn[];
};

export type InniesLiveFeed = {
  generatedAt: string;
  windowHours: number;
  pollIntervalSeconds: number;
  apiKeyIds: string[];
  sessions: InniesLiveSession[];
};

export const INNIES_LIVE_FEED_ROUTE = '/api/innies/live-sessions';
