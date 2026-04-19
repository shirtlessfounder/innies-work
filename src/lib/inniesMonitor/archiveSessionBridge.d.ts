export function filterArchiveSessionsForMonitor(input: {
  sessions?: Array<Record<string, unknown>>;
  buyerApiKeyIds?: Set<string>;
  now?: Date | number;
  lookbackMs?: number;
}): Array<Record<string, unknown>>;

export function synthesizeArchiveLiveTrail(input: {
  sessions?: Array<Record<string, unknown>>;
  archiveEventsBySession?: Map<string, { events?: Array<Record<string, unknown>> }>;
  existingLiveSessionKeys?: Set<string>;
  existingLiveSessions?: Array<Record<string, unknown>>;
  now?: Date | number;
  lookbackMs?: number;
}): {
  liveSessions: Array<Record<string, unknown>>;
  latestPrompts: Array<Record<string, unknown>>;
};
