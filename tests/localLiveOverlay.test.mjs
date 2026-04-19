import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildOpenclawSessionOverlay,
  buildOverlaySession,
  filterSessionsForLocalMonitor,
  mergeOverlaySessions,
  parseJournalLatencyBlocks,
  removeSupersededIdleSessions,
  selectJournalRequestIdsForOverlay,
} from '../src/lib/inniesMonitor/localLiveOverlay.mjs';

test('parseJournalLatencyBlocks extracts request ids and credential labels from stream-latency blocks', () => {
  const journalText = [
    "Apr 15 23:34:42 sf-prod bash[2026313]: [stream-latency] {",
    "Apr 15 23:34:42 sf-prod bash[2026313]:   requestId: 'req_1776310475101_92006',",
    "Apr 15 23:34:42 sf-prod bash[2026313]:   attemptNo: 1,",
    "Apr 15 23:34:42 sf-prod bash[2026313]:   credential_label: 'dylan-codex',",
    "Apr 15 23:34:42 sf-prod bash[2026313]:   upstream_status: 200,",
    "Apr 15 23:34:42 sf-prod bash[2026313]: }",
    "Apr 15 23:34:47 sf-prod bash[2026313]: [stream-latency] {",
    "Apr 15 23:34:47 sf-prod bash[2026313]:   requestId: 'req_1776310482248_28654',",
    "Apr 15 23:34:47 sf-prod bash[2026313]:   attemptNo: 1,",
    "Apr 15 23:34:47 sf-prod bash[2026313]:   credential_label: 'shirtless-2',",
    "Apr 15 23:34:47 sf-prod bash[2026313]:   upstream_status: 200,",
    "Apr 15 23:34:47 sf-prod bash[2026313]: }",
  ].join('\n');

  const blocks = parseJournalLatencyBlocks(journalText, { year: 2026 });

  assert.deepEqual(
    blocks.map((entry) => ({
      requestId: entry.requestId,
      credentialLabel: entry.credentialLabel,
      occurredAt: entry.occurredAt,
    })),
    [
      {
        requestId: 'req_1776310475101_92006',
        credentialLabel: 'dylan-codex',
        occurredAt: '2026-04-15T23:34:42.000Z',
      },
      {
        requestId: 'req_1776310482248_28654',
        credentialLabel: 'shirtless-2',
        occurredAt: '2026-04-15T23:34:47.000Z',
      },
    ],
  );
});

test('buildOverlaySession and mergeOverlaySessions surface a missing direct preferred-provider request', () => {
  const detail = {
    attempt: {
      requestId: 'req_1776310475101_92006',
      attemptNo: 1,
      apiKeyId: '59f27bcc-4d2b-49c8-ba7b-1e7d7b1db59d',
      provider: 'openai',
      model: 'gpt-5.4',
      startedAt: '2026-04-16T03:34:35.101Z',
      completedAt: '2026-04-16T03:34:42.809Z',
      requestSource: 'direct',
      providerSelectionReason: 'preferred_provider_selected',
    },
    request: [
      {
        side: 'request',
        ordinal: 0,
        role: 'user',
        content: {
          role: 'user',
          content: [{ type: 'text', text: 'ship the missing session' }],
        },
      },
      {
        side: 'response',
        ordinal: 0,
        role: 'assistant',
        content: {
          role: 'assistant',
          content: [{ type: 'text', text: 'session is visible now' }],
        },
      },
    ],
  };

  const overlay = buildOverlaySession(detail);

  assert.equal(overlay.sessionKey, 'cli:request:req_1776310475101_92006');
  assert.equal(overlay.buyerApiKeyId, '59f27bcc-4d2b-49c8-ba7b-1e7d7b1db59d');
  assert.equal(overlay.currentProvider, 'openai');
  assert.equal(overlay.currentModel, 'gpt-5.4');
  assert.deepEqual(
    overlay.entries.map((entry) => ({
      kind: entry.kind,
      text: entry.text,
      at: entry.at,
    })),
    [
      {
        kind: 'user',
        text: 'ship the missing session',
        at: '2026-04-16T03:34:42.809Z',
      },
      {
        kind: 'assistant_final',
        text: 'session is visible now',
        at: '2026-04-16T03:34:42.809Z',
      },
    ],
  );

  const mergedFeed = mergeOverlaySessions(
    {
      generatedAt: '2026-04-16T03:35:05.000Z',
      pollIntervalSeconds: 30,
      idleTimeoutSeconds: 900,
      historyWindowSeconds: 3600,
      orgSlug: 'innies',
      sessions: [
        {
          sessionKey: 'cli:request:req_1776310397912_73694',
          sessionType: 'cli',
          displayTitle: 'cli req_1776...3694',
          startedAt: '2026-04-16T03:33:17.911Z',
          endedAt: '2026-04-16T03:33:22.931Z',
          lastActivityAt: '2026-04-16T03:33:22.931Z',
          currentProvider: 'openai',
          currentModel: 'gpt-5.4-mini',
          providerSet: ['openai'],
          modelSet: ['gpt-5.4-mini'],
          entries: [],
        },
      ],
    },
    [overlay],
  );

  assert.deepEqual(
    mergedFeed.sessions.map((session) => session.sessionKey),
    [
      'cli:request:req_1776310475101_92006',
      'cli:request:req_1776310397912_73694',
    ],
  );
});

test('selectJournalRequestIdsForOverlay keeps recent missing request ids without relying on timezone math', () => {
  const blocks = [
    {
      requestId: 'req_visible',
      credentialLabel: 'shirtless-2',
      occurredAt: '2026-04-15T23:42:54.000Z',
    },
    {
      requestId: 'req_missing_newer',
      credentialLabel: 'dylan-codex',
      occurredAt: '2026-04-15T23:43:12.000Z',
    },
    {
      requestId: 'req_missing_latest',
      credentialLabel: 'dylan-codex',
      occurredAt: '2026-04-15T23:49:05.000Z',
    },
  ];

  const requestIds = selectJournalRequestIdsForOverlay({
    journalBlocks: blocks,
    existingSessionKeys: new Set(['cli:request:req_visible']),
    maxMissingRequests: 4,
  });

  assert.deepEqual(requestIds, ['req_missing_latest', 'req_missing_newer']);
});

test('filterSessionsForLocalMonitor keeps only sessions for the configured buyer key within the lookback window', () => {
  const sessions = [
    {
      sessionKey: 'cli:request:req_keep_latest',
      buyerApiKeyId: '59f27bcc-4d2b-49c8-ba7b-1e7d7b1db59d',
      endedAt: '2026-04-16T03:30:00.000Z',
    },
    {
      sessionKey: 'cli:request:req_keep_recent',
      buyerApiKeyId: '59f27bcc-4d2b-49c8-ba7b-1e7d7b1db59d',
      lastActivityAt: '2026-04-16T03:00:00.000Z',
    },
    {
      sessionKey: 'cli:request:req_drop_other_buyer',
      buyerApiKeyId: '31a61174-2a31-490f-85c9-a77653f86312',
      lastActivityAt: '2026-04-16T03:10:00.000Z',
    },
    {
      sessionKey: 'cli:request:req_drop_stale',
      buyerApiKeyId: '59f27bcc-4d2b-49c8-ba7b-1e7d7b1db59d',
      lastActivityAt: '2026-04-14T23:59:59.000Z',
    },
  ];

  const filtered = filterSessionsForLocalMonitor({
    sessions,
    buyerApiKeyIds: new Set(['59f27bcc-4d2b-49c8-ba7b-1e7d7b1db59d']),
    now: new Date('2026-04-16T04:00:00.000Z'),
    lookbackMs: 24 * 60 * 60 * 1000,
  });

  assert.deepEqual(
    filtered.map((session) => session.sessionKey),
    ['cli:request:req_keep_latest', 'cli:request:req_keep_recent'],
  );
});

test('filterSessionsForLocalMonitor derives buyer key from idle session keys when upstream omits it', () => {
  const sessions = [
    {
      sessionKey: 'cli:idle:818d0cc7-7ed2-469f-b690-a977e72a921d:f3f97490-540f-4d13-ba1b-2ad1adff1ff1:a6f4acf4-a6e1-404d-9310-d5a3be3a3ac2',
      buyerApiKeyId: null,
      lastActivityAt: '2026-04-16T14:08:41.281Z',
    },
    {
      sessionKey: 'cli:idle:818d0cc7-7ed2-469f-b690-a977e72a921d:31a61174-2a31-490f-85c9-a77653f86312:other-lane',
      buyerApiKeyId: null,
      lastActivityAt: '2026-04-16T14:09:41.281Z',
    },
  ];

  const filtered = filterSessionsForLocalMonitor({
    sessions,
    buyerApiKeyIds: new Set(['f3f97490-540f-4d13-ba1b-2ad1adff1ff1']),
    now: new Date('2026-04-16T15:00:00.000Z'),
    lookbackMs: 24 * 60 * 60 * 1000,
  });

  assert.deepEqual(
    filtered.map((session) => session.sessionKey),
    ['cli:idle:818d0cc7-7ed2-469f-b690-a977e72a921d:f3f97490-540f-4d13-ba1b-2ad1adff1ff1:a6f4acf4-a6e1-404d-9310-d5a3be3a3ac2'],
  );
});

test('buildOpenclawSessionOverlay groups multiple request attempts under one live session lane', () => {
  const overlay = buildOpenclawSessionOverlay({
    openclawSessionId: 'c7a0a23e-4ed8-4cba-9675-34a2fc943655',
    buyerApiKeyId: 'f3f97490-540f-4d13-ba1b-2ad1adff1ff1',
    attempts: [
      {
        requestAttemptArchiveId: '501',
        requestId: 'req_1',
        attemptNo: 1,
        startedAt: '2026-04-16T15:37:28.430Z',
        completedAt: '2026-04-16T15:37:42.496Z',
        provider: 'openai',
        model: 'gpt-5.4',
        messages: [
          {
            side: 'request',
            ordinal: 0,
            role: 'system',
            normalizedPayload: {
              role: 'system',
              content: [{ type: 'text', text: 'ignore this system prompt' }],
            },
          },
          {
            side: 'request',
            ordinal: 1,
            role: 'user',
            normalizedPayload: {
              role: 'user',
              content: [{ type: 'text', text: 'first prompt' }],
            },
          },
          {
            side: 'response',
            ordinal: 0,
            role: 'assistant',
            normalizedPayload: {
              role: 'assistant',
              content: [{ type: 'text', text: 'first answer' }],
            },
          },
        ],
      },
      {
        requestAttemptArchiveId: '502',
        requestId: 'req_2',
        attemptNo: 1,
        startedAt: '2026-04-16T15:37:42.701Z',
        completedAt: '2026-04-16T15:37:59.133Z',
        provider: 'openai',
        model: 'gpt-5.4',
        messages: [
          {
            side: 'request',
            ordinal: 0,
            role: 'user',
            normalizedPayload: {
              role: 'user',
              content: [{ type: 'text', text: 'second prompt' }],
            },
          },
          {
            side: 'response',
            ordinal: 0,
            role: 'assistant',
            normalizedPayload: {
              role: 'assistant',
              content: [{ type: 'text', text: 'second answer' }],
            },
          },
        ],
      },
    ],
  });

  assert.equal(overlay.sessionKey, 'cli:openclaw:c7a0a23e-4ed8-4cba-9675-34a2fc943655');
  assert.equal(overlay.buyerApiKeyId, 'f3f97490-540f-4d13-ba1b-2ad1adff1ff1');
  assert.equal(overlay.startedAt, '2026-04-16T15:37:28.430Z');
  assert.equal(overlay.lastActivityAt, '2026-04-16T15:37:59.133Z');
  assert.deepEqual(
    overlay.entries.map((entry) => entry.entryId),
    [
      'local-entry:archive:501:request:1:1:user',
      'local-entry:archive:501:response:0:2:assistant_final',
      'local-entry:archive:502:request:0:0:user',
      'local-entry:archive:502:response:0:1:assistant_final',
    ],
  );
  assert.equal(new Set(overlay.entries.map((entry) => entry.entryId)).size, overlay.entries.length);
  assert.deepEqual(
    overlay.entries.map((entry) => ({
      kind: entry.kind,
      text: entry.text,
      at: entry.at,
    })),
    [
      {
        kind: 'user',
        text: 'first prompt',
        at: '2026-04-16T15:37:28.430Z',
      },
      {
        kind: 'assistant_final',
        text: 'first answer',
        at: '2026-04-16T15:37:42.496Z',
      },
      {
        kind: 'user',
        text: 'second prompt',
        at: '2026-04-16T15:37:42.701Z',
      },
      {
        kind: 'assistant_final',
        text: 'second answer',
        at: '2026-04-16T15:37:59.133Z',
      },
    ],
  );
});

test('buildOpenclawSessionOverlay keeps synthesized local entry ids unique across repeated retries for one request', () => {
  const overlay = buildOpenclawSessionOverlay({
    openclawSessionId: '6f693ceb-5a04-4f8a-9d09-53a2f3122577',
    buyerApiKeyId: 'f3f97490-540f-4d13-ba1b-2ad1adff1ff1',
    attempts: [
      {
        requestAttemptArchiveId: '610',
        requestId: 'req_retry',
        attemptNo: 1,
        startedAt: '2026-04-16T16:01:00.000Z',
        completedAt: '2026-04-16T16:01:03.000Z',
        provider: 'openai',
        model: 'gpt-5.4',
        messages: [
          {
            side: 'request',
            ordinal: 0,
            role: 'user',
            normalizedPayload: {
              role: 'user',
              content: [{ type: 'text', text: 'first retry prompt' }],
            },
          },
          {
            side: 'response',
            ordinal: 0,
            role: 'assistant',
            normalizedPayload: {
              role: 'assistant',
              content: [{ type: 'text', text: 'first retry answer' }],
            },
          },
        ],
      },
      {
        requestAttemptArchiveId: '611',
        requestId: 'req_retry',
        attemptNo: 2,
        startedAt: '2026-04-16T16:01:05.000Z',
        completedAt: '2026-04-16T16:01:08.000Z',
        provider: 'openai',
        model: 'gpt-5.4',
        messages: [
          {
            side: 'request',
            ordinal: 0,
            role: 'user',
            normalizedPayload: {
              role: 'user',
              content: [{ type: 'text', text: 'second retry prompt' }],
            },
          },
          {
            side: 'response',
            ordinal: 0,
            role: 'assistant',
            normalizedPayload: {
              role: 'assistant',
              content: [{ type: 'text', text: 'second retry answer' }],
            },
          },
        ],
      },
    ],
  });

  assert.deepEqual(
    overlay.entries.map((entry) => entry.entryId),
    [
      'local-entry:archive:610:request:0:0:user',
      'local-entry:archive:610:response:0:1:assistant_final',
      'local-entry:archive:611:request:0:0:user',
      'local-entry:archive:611:response:0:1:assistant_final',
    ],
  );
  assert.equal(new Set(overlay.entries.map((entry) => entry.entryId)).size, overlay.entries.length);
});

test('removeSupersededIdleSessions drops the collapsed buyer-key idle lane when reconstructed live sessions overlap it', () => {
  const sessions = [
    {
      sessionKey: 'cli:idle:818d0cc7-7ed2-469f-b690-a977e72a921d:f3f97490-540f-4d13-ba1b-2ad1adff1ff1:req_1776352770672_21808',
      buyerApiKeyId: 'f3f97490-540f-4d13-ba1b-2ad1adff1ff1',
      startedAt: '2026-04-16T15:19:30.672Z',
      lastActivityAt: '2026-04-16T15:38:24.874Z',
    },
    {
      sessionKey: 'cli:idle:818d0cc7-7ed2-469f-b690-a977e72a921d:31a61174-2a31-490f-85c9-a77653f86312:req_other',
      buyerApiKeyId: '31a61174-2a31-490f-85c9-a77653f86312',
      startedAt: '2026-04-16T15:20:00.000Z',
      lastActivityAt: '2026-04-16T15:38:00.000Z',
    },
    {
      sessionKey: 'cli:request:req_unrelated',
      buyerApiKeyId: 'f3f97490-540f-4d13-ba1b-2ad1adff1ff1',
      startedAt: '2026-04-16T15:00:00.000Z',
      lastActivityAt: '2026-04-16T15:00:05.000Z',
    },
  ];

  const filtered = removeSupersededIdleSessions({
    sessions,
    overlaySessions: [
      {
        sessionKey: 'cli:openclaw:c7a0a23e-4ed8-4cba-9675-34a2fc943655',
        buyerApiKeyId: 'f3f97490-540f-4d13-ba1b-2ad1adff1ff1',
        startedAt: '2026-04-16T15:37:28.430Z',
        lastActivityAt: '2026-04-16T15:38:24.874Z',
      },
      {
        sessionKey: 'cli:openclaw:3dd95f58-126c-4c08-b92b-b0a1a198d261',
        buyerApiKeyId: 'f3f97490-540f-4d13-ba1b-2ad1adff1ff1',
        startedAt: '2026-04-16T15:37:21.093Z',
        lastActivityAt: '2026-04-16T15:38:12.699Z',
      },
    ],
  });

  assert.deepEqual(
    filtered.map((session) => session.sessionKey),
    [
      'cli:idle:818d0cc7-7ed2-469f-b690-a977e72a921d:31a61174-2a31-490f-85c9-a77653f86312:req_other',
      'cli:request:req_unrelated',
    ],
  );
});

test('removeSupersededIdleSessions drops the prod-shaped collapsed idle lane even when upstream omits buyerApiKeyId', () => {
  const sessions = [
    {
      sessionKey: 'cli:idle:818d0cc7-7ed2-469f-b690-a977e72a921d:f3f97490-540f-4d13-ba1b-2ad1adff1ff1:req_1776352770672_21808',
      buyerApiKeyId: null,
      startedAt: '2026-04-16T15:19:30.672Z',
      lastActivityAt: '2026-04-16T16:17:44.672Z',
    },
    {
      sessionKey: 'cli:idle:818d0cc7-7ed2-469f-b690-a977e72a921d:31a61174-2a31-490f-85c9-a77653f86312:req_other',
      buyerApiKeyId: null,
      startedAt: '2026-04-16T15:20:00.000Z',
      lastActivityAt: '2026-04-16T16:17:00.000Z',
    },
  ];

  const filtered = removeSupersededIdleSessions({
    sessions,
    overlaySessions: [
      {
        sessionKey: 'cli:openclaw:e3073a5c-ebf0-4ee1-9f2b-86b2714042d0',
        buyerApiKeyId: 'f3f97490-540f-4d13-ba1b-2ad1adff1ff1',
        startedAt: '2026-04-16T16:10:19.000Z',
        lastActivityAt: '2026-04-16T16:18:14.000Z',
      },
      {
        sessionKey: 'cli:openclaw:3dd95f58-126c-4c08-b92b-b0a1a198d261',
        buyerApiKeyId: 'f3f97490-540f-4d13-ba1b-2ad1adff1ff1',
        startedAt: '2026-04-16T15:37:21.093Z',
        lastActivityAt: '2026-04-16T16:15:03.000Z',
      },
      {
        sessionKey: 'cli:openclaw:7ab3ddb9-d641-48c8-8240-d1851d3e2735',
        buyerApiKeyId: 'f3f97490-540f-4d13-ba1b-2ad1adff1ff1',
        startedAt: '2026-04-16T15:54:29.000Z',
        lastActivityAt: '2026-04-16T16:10:34.000Z',
      },
    ],
  });

  assert.deepEqual(
    filtered.map((session) => session.sessionKey),
    [
      'cli:idle:818d0cc7-7ed2-469f-b690-a977e72a921d:31a61174-2a31-490f-85c9-a77653f86312:req_other',
    ],
  );
});
