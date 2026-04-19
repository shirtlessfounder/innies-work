import assert from 'node:assert/strict';
import test from 'node:test';

import {
  filterArchiveSessionsForMonitor,
  synthesizeArchiveLiveTrail,
} from '../src/lib/inniesMonitor/archiveSessionBridge.mjs';

test('filterArchiveSessionsForMonitor keeps only recent archive sessions for the configured buyer key', () => {
  const sessions = [
    {
      sessionKey: 'cli:idle:818d0cc7-7ed2-469f-b690-a977e72a921d:f3f97490-540f-4d13-ba1b-2ad1adff1ff1:req_live',
      sessionType: 'cli',
      startedAt: '2026-04-16T11:50:00.000Z',
      endedAt: '2026-04-16T12:00:00.000Z',
      providerSet: ['openai'],
      modelSet: ['gpt-5.4'],
    },
    {
      sessionKey: 'cli:idle:818d0cc7-7ed2-469f-b690-a977e72a921d:31a61174-2a31-490f-85c9-a77653f86312:req_other',
      sessionType: 'cli',
      startedAt: '2026-04-16T11:55:00.000Z',
      endedAt: '2026-04-16T12:01:00.000Z',
      providerSet: ['openai'],
      modelSet: ['gpt-5.4-mini'],
    },
    {
      sessionKey: 'cli:idle:818d0cc7-7ed2-469f-b690-a977e72a921d:f3f97490-540f-4d13-ba1b-2ad1adff1ff1:req_stale',
      sessionType: 'cli',
      startedAt: '2026-04-14T09:00:00.000Z',
      endedAt: '2026-04-14T10:00:00.000Z',
      providerSet: ['openai'],
      modelSet: ['gpt-5.4'],
    },
  ];

  const filtered = filterArchiveSessionsForMonitor({
    sessions,
    buyerApiKeyIds: new Set(['f3f97490-540f-4d13-ba1b-2ad1adff1ff1']),
    now: new Date('2026-04-16T12:05:00.000Z'),
    lookbackMs: 24 * 60 * 60 * 1000,
  });

  assert.deepEqual(
    filtered.map((session) => session.sessionKey),
    ['cli:idle:818d0cc7-7ed2-469f-b690-a977e72a921d:f3f97490-540f-4d13-ba1b-2ad1adff1ff1:req_live'],
  );
});

test('synthesizeArchiveLiveTrail promotes a recent cli:idle archive session into live_sessions and latest_prompts', () => {
  const sessions = [
    {
      sessionKey: 'cli:idle:818d0cc7-7ed2-469f-b690-a977e72a921d:f3f97490-540f-4d13-ba1b-2ad1adff1ff1:req_live',
      sessionType: 'cli',
      startedAt: '2026-04-16T11:50:00.000Z',
      endedAt: '2026-04-16T12:00:00.000Z',
      providerSet: ['openai'],
      modelSet: ['gpt-5.4'],
      previewSample: {
        promptPreview: 'ship the local live carousel',
      },
    },
  ];

  const archiveEventsBySession = new Map([
    ['cli:idle:818d0cc7-7ed2-469f-b690-a977e72a921d:f3f97490-540f-4d13-ba1b-2ad1adff1ff1:req_live', {
      sessionKey: 'cli:idle:818d0cc7-7ed2-469f-b690-a977e72a921d:f3f97490-540f-4d13-ba1b-2ad1adff1ff1:req_live',
      events: [
        {
          eventType: 'request_message',
          eventTime: '2026-04-16T11:59:57.000Z',
          requestId: 'req_live',
          attemptNo: 1,
          role: 'system',
          content: {
            role: 'system',
            content: [
              {
                text: 'You are Codex',
                type: 'text',
              },
            ],
          },
          provider: 'openai',
          model: 'gpt-5.4',
        },
        {
          eventType: 'request_message',
          eventTime: '2026-04-16T11:59:58.000Z',
          requestId: 'req_live',
          attemptNo: 1,
          role: 'user',
          content: 'ship the local live carousel',
          provider: 'openai',
          model: 'gpt-5.4',
        },
        {
          eventType: 'response_message',
          eventTime: '2026-04-16T12:00:00.000Z',
          requestId: 'req_live',
          attemptNo: 1,
          role: 'assistant',
          content: 'working on it',
          provider: 'openai',
          model: 'gpt-5.4',
          status: 'success',
        },
      ],
    }],
  ]);

  const synthesized = synthesizeArchiveLiveTrail({
    sessions,
    archiveEventsBySession,
    existingLiveSessionKeys: new Set(),
    now: new Date('2026-04-16T12:05:00.000Z'),
    lookbackMs: 24 * 60 * 60 * 1000,
  });

  assert.deepEqual(
    synthesized.liveSessions.map((item) => ({
      stream: item.stream,
      kind: item.kind,
      sessionKey: item.sessionKey,
      status: item.status,
      occurredAt: item.occurredAt,
    })),
    [
      {
        stream: 'live_sessions',
        kind: 'session',
        sessionKey: 'cli:idle:818d0cc7-7ed2-469f-b690-a977e72a921d:f3f97490-540f-4d13-ba1b-2ad1adff1ff1:req_live',
        status: 'live',
        occurredAt: '2026-04-16T12:00:00.000Z',
      },
    ],
  );
  assert.deepEqual(
    synthesized.latestPrompts.map((item) => ({
      stream: item.stream,
      kind: item.kind,
      sessionKey: item.sessionKey,
      title: item.title,
    })),
    [
      {
        stream: 'latest_prompts',
        kind: 'request_message',
        sessionKey: 'cli:idle:818d0cc7-7ed2-469f-b690-a977e72a921d:f3f97490-540f-4d13-ba1b-2ad1adff1ff1:req_live',
        title: 'ship the local live carousel',
      },
      {
        stream: 'latest_prompts',
        kind: 'response_message',
        sessionKey: 'cli:idle:818d0cc7-7ed2-469f-b690-a977e72a921d:f3f97490-540f-4d13-ba1b-2ad1adff1ff1:req_live',
        title: 'working on it',
      },
    ],
  );
});

test('synthesizeArchiveLiveTrail prefers the latest archived request detail when bounded session events are stale', () => {
  const sessionKey = 'cli:idle:818d0cc7-7ed2-469f-b690-a977e72a921d:f3f97490-540f-4d13-ba1b-2ad1adff1ff1:req_live';
  const sessions = [
    {
      sessionKey,
      sessionType: 'cli',
      startedAt: '2026-04-16T11:50:00.000Z',
      endedAt: '2026-04-16T12:10:00.000Z',
      providerSet: ['openai'],
      modelSet: ['gpt-5.4'],
      previewSample: {
        promptPreview: 'show the newest lane text',
        responsePreview: 'rendering the newest lane text now',
        latestRequestId: 'req_latest',
        latestAttemptNo: 1,
      },
    },
  ];

  const archiveEventsBySession = new Map([
    [sessionKey, {
      sessionKey,
      events: [
        {
          eventType: 'request_message',
          eventTime: '2026-04-16T12:00:00.000Z',
          requestId: 'req_old',
          attemptNo: 1,
          role: 'user',
          content: 'stale archive event',
          provider: 'openai',
          model: 'gpt-5.4',
        },
        {
          eventType: 'response_message',
          eventTime: '2026-04-16T12:00:01.000Z',
          requestId: 'req_old',
          attemptNo: 1,
          role: 'assistant',
          content: 'stale archive response',
          provider: 'openai',
          model: 'gpt-5.4',
        },
      ],
    }],
  ]);

  const latestRequestDetailsBySession = new Map([
    [sessionKey, {
      attempt: {
        requestId: 'req_latest',
        attemptNo: 1,
        provider: 'openai',
        model: 'gpt-5.4',
        startedAt: '2026-04-16T12:09:55.000Z',
        completedAt: '2026-04-16T12:10:00.000Z',
        status: 'success',
      },
      request: [
        {
          side: 'request',
          ordinal: 0,
          role: 'system',
          contentType: 'text',
          content: 'ignore system prompt',
        },
        {
          side: 'request',
          ordinal: 1,
          role: 'user',
          contentType: 'text',
          content: 'show the newest lane text',
        },
      ],
      response: [
        {
          side: 'response',
          ordinal: 0,
          role: 'assistant',
          contentType: 'text',
          content: 'rendering the newest lane text now',
        },
      ],
    }],
  ]);

  const synthesized = synthesizeArchiveLiveTrail({
    sessions,
    archiveEventsBySession,
    latestRequestDetailsBySession,
    existingLiveSessionKeys: new Set(),
    now: new Date('2026-04-16T12:10:05.000Z'),
    lookbackMs: 24 * 60 * 60 * 1000,
  });

  assert.deepEqual(
    synthesized.liveSessions.map((item) => ({
      sessionKey: item.sessionKey,
      occurredAt: item.occurredAt,
      provider: item.provider,
      model: item.model,
    })),
    [
      {
        sessionKey,
        occurredAt: '2026-04-16T12:10:00.000Z',
        provider: 'openai',
        model: 'gpt-5.4',
      },
    ],
  );
  assert.deepEqual(
    synthesized.latestPrompts.map((item) => ({
      kind: item.kind,
      title: item.title,
      occurredAt: item.occurredAt,
    })),
    [
      {
        kind: 'request_message',
        title: 'show the newest lane text',
        occurredAt: '2026-04-16T12:09:55.000Z',
      },
      {
        kind: 'response_message',
        title: 'rendering the newest lane text now',
        occurredAt: '2026-04-16T12:10:00.000Z',
      },
    ],
  );
});

test('synthesizeArchiveLiveTrail skips a collapsed cli:idle archive lane when overlapping cli:openclaw live sessions already exist for that buyer key', () => {
  const sessionKey = 'cli:idle:818d0cc7-7ed2-469f-b690-a977e72a921d:f3f97490-540f-4d13-ba1b-2ad1adff1ff1:req_live';
  const sessions = [
    {
      sessionKey,
      sessionType: 'cli',
      startedAt: '2026-04-16T15:19:30.672Z',
      endedAt: '2026-04-16T15:38:24.874Z',
      providerSet: ['openai'],
      modelSet: ['gpt-5.4'],
      previewSample: {
        promptPreview: 'working in here .config/superpowers/worktrees/innies-work/percent-v2-clone/src',
      },
    },
  ];

  const synthesized = synthesizeArchiveLiveTrail({
    sessions,
    archiveEventsBySession: new Map(),
    latestRequestDetailsBySession: new Map(),
    existingLiveSessionKeys: new Set(),
    existingLiveSessions: [
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
    now: new Date('2026-04-16T15:40:00.000Z'),
    lookbackMs: 24 * 60 * 60 * 1000,
  });

  assert.deepEqual(synthesized.liveSessions, []);
  assert.deepEqual(synthesized.latestPrompts, []);
});

test('synthesizeArchiveLiveTrail does not let fallback cli:request sessions suppress archived cli:idle lanes', () => {
  const sessionKey = 'cli:idle:818d0cc7-7ed2-469f-b690-a977e72a921d:f3f97490-540f-4d13-ba1b-2ad1adff1ff1:req_live';
  const sessions = [
    {
      sessionKey,
      sessionType: 'cli',
      startedAt: '2026-04-16T15:19:30.672Z',
      endedAt: '2026-04-16T15:38:24.874Z',
      providerSet: ['openai'],
      modelSet: ['gpt-5.4'],
      previewSample: {
        promptPreview: 'local fallback should not become the architecture',
      },
    },
  ];

  const synthesized = synthesizeArchiveLiveTrail({
    sessions,
    archiveEventsBySession: new Map(),
    latestRequestDetailsBySession: new Map(),
    existingLiveSessionKeys: new Set(),
    existingLiveSessions: [
      {
        sessionKey: 'cli:request:req_local_overlay',
        buyerApiKeyId: 'f3f97490-540f-4d13-ba1b-2ad1adff1ff1',
        startedAt: '2026-04-16T15:37:28.430Z',
        lastActivityAt: '2026-04-16T15:38:24.874Z',
      },
    ],
    now: new Date('2026-04-16T15:40:00.000Z'),
    lookbackMs: 24 * 60 * 60 * 1000,
  });

  assert.deepEqual(
    synthesized.liveSessions.map((item) => item.sessionKey),
    [sessionKey],
  );
});
