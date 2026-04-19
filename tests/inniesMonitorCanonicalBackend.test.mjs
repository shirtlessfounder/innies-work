import assert from 'node:assert/strict';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

import ts from 'typescript';

function fileUrl(relativePath) {
  return new URL(`../${relativePath}`, import.meta.url);
}

function readSource(relativePath) {
  return readFileSync(fileUrl(relativePath), 'utf8');
}

function compileTypeScriptModule(input) {
  const output = ts.transpileModule(input.source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: input.fileName,
  }).outputText;

  writeFileSync(input.destinationPath, output, 'utf8');
}

async function loadServerModule() {
  const tempDir = mkdtempSync(join(tmpdir(), 'innies-monitor-server-'));

  try {
    const backendClientSource = readSource('src/lib/inniesMonitor/backendMonitorClient.ts');
    compileTypeScriptModule({
      source: backendClientSource,
      fileName: 'backendMonitorClient.ts',
      destinationPath: join(tempDir, 'backendMonitorClient.mjs'),
    });

    const serverSource = readSource('src/lib/inniesMonitor/server.ts')
      .replaceAll("from './backendMonitorClient';", "from './backendMonitorClient.mjs';")
      .replaceAll("from './backendMonitorClient'", "from './backendMonitorClient.mjs'");
    compileTypeScriptModule({
      source: serverSource,
      fileName: 'server.ts',
      destinationPath: join(tempDir, 'server.mjs'),
    });

    copyFileSync(fileUrl('src/lib/inniesMonitor/archiveSessionBridge.mjs'), join(tempDir, 'archiveSessionBridge.mjs'));

    const moduleUrl = `${pathToFileURL(join(tempDir, 'server.mjs')).href}?ts=${Date.now()}`;
    const module = await import(moduleUrl);
    return {
      module,
      cleanup: () => rmSync(tempDir, { recursive: true, force: true }),
    };
  } catch (error) {
    rmSync(tempDir, { recursive: true, force: true });
    throw error;
  }
}

function withEnv(patch) {
  const previous = new Map();

  for (const [key, value] of Object.entries(patch)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  return () => {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}

const CANONICAL_PAYLOAD = {
  generatedAt: '2026-04-16T15:00:00.000Z',
  liveStatus: 'live',
  items: [
    {
      id: 'live-session:lane_001',
      stream: 'live_sessions',
      kind: 'session',
      occurredAt: '2026-04-16T14:59:59.000Z',
      title: 'cli lane_001',
      detail: 'openai / gpt-5.4',
      sessionKey: 'cli:openclaw:session_001',
      sessionType: 'cli',
      provider: 'openai',
      model: 'gpt-5.4',
      status: 'live',
      href: null,
    },
    {
      id: 'lane-event:req_001:request:user:1',
      stream: 'latest_prompts',
      kind: 'user',
      occurredAt: '2026-04-16T14:59:55.000Z',
      title: 'ship the canonical lane',
      detail: 'cli lane_001',
      sessionKey: 'cli:openclaw:session_001',
      sessionType: 'cli',
      provider: 'openai',
      model: 'gpt-5.4',
      status: null,
      href: null,
    },
    {
      id: 'archive-attempt:req_001:1',
      stream: 'archive_trail',
      kind: 'attempt_status',
      occurredAt: '2026-04-16T14:59:58.000Z',
      title: 'Attempt success',
      detail: 'openai / gpt-5.4',
      sessionKey: 'cli:openclaw:session_001',
      sessionType: 'cli',
      provider: 'openai',
      model: 'gpt-5.4',
      status: 'success',
      href: null,
    },
  ],
};

function createLegacyPublicLiveFeed() {
  const now = Date.now();

  return {
    generatedAt: new Date(now).toISOString(),
    pollIntervalSeconds: 30,
    sessions: [
      {
        sessionKey: 'cli:request:req_legacy',
        sessionType: 'cli',
        displayTitle: 'cli req_legacy',
        startedAt: new Date(now - 90_000).toISOString(),
        lastActivityAt: new Date(now - 30_000).toISOString(),
        currentProvider: 'openai',
        currentModel: 'gpt-5.4-mini',
        entries: [
          {
            entryId: 'legacy-user-1',
            kind: 'user',
            at: new Date(now - 60_000).toISOString(),
            text: 'keep the fallback path',
          },
          {
            entryId: 'legacy-assistant-1',
            kind: 'assistant_final',
            at: new Date(now - 30_000).toISOString(),
            text: 'fallback is still available',
          },
        ],
      },
    ],
  };
}

function createJsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  });
}

test('getInniesMonitorActivityFeed passes through canonical backend ids and null archive hrefs when flagged on', async () => {
  const restoreEnv = withEnv({
    INNIES_MONITOR_USE_CANONICAL_BACKEND: '1',
    INNIES_ADMIN_API_BASE_URL: 'https://admin.example',
    INNIES_ADMIN_API_KEY: 'admin-key',
    INNIES_ADMIN_API_TIMEOUT_MS: '15000',
    INNIES_API_BASE_URL: undefined,
    INNIES_BASE_URL: undefined,
    LIVE_OVERLAY_LOOKBACK_MS: undefined,
    LIVE_OVERLAY_BUYER_API_KEY_IDS: undefined,
  });
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push(url);
    assert.equal(url, 'https://admin.example/v1/admin/monitor/activity');
    assert.equal(init?.headers?.accept, 'application/json');
    assert.equal(init?.headers?.['x-api-key'], 'admin-key');
    return createJsonResponse(CANONICAL_PAYLOAD);
  };

  const { module, cleanup } = await loadServerModule();

  try {
    const payload = await module.getInniesMonitorActivityFeed();
    assert.deepEqual(payload, CANONICAL_PAYLOAD);
    assert.deepEqual(calls, ['https://admin.example/v1/admin/monitor/activity']);
  } finally {
    cleanup();
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test('getInniesMonitorActivityFeed stays on the legacy stitched path when the canonical backend flag is off', async () => {
  const restoreEnv = withEnv({
    INNIES_MONITOR_USE_CANONICAL_BACKEND: undefined,
    INNIES_ADMIN_API_BASE_URL: 'https://admin.example',
    INNIES_ADMIN_API_KEY: 'admin-key',
    INNIES_ADMIN_API_TIMEOUT_MS: '15000',
    INNIES_API_BASE_URL: 'https://public.example',
    INNIES_BASE_URL: undefined,
    LIVE_OVERLAY_LOOKBACK_MS: undefined,
    LIVE_OVERLAY_BUYER_API_KEY_IDS: undefined,
  });
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (input) => {
    const url = String(input);
    calls.push(url);

    if (url === 'https://public.example/v1/public/innies/live-sessions') {
      return createJsonResponse(createLegacyPublicLiveFeed());
    }

    if (url.startsWith('https://admin.example/v1/admin/archive/sessions?')) {
      return createJsonResponse({ sessions: [] });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  const { module, cleanup } = await loadServerModule();

  try {
    const payload = await module.getInniesMonitorActivityFeed();
    assert.equal(payload.liveStatus, 'live');
    assert.ok(payload.items.some((item) => item.id === 'live-session:cli:request:req_legacy'));
    assert.ok(payload.items.some((item) => item.id === 'legacy-user-1'));
    assert.ok(payload.items.some((item) => item.id === 'legacy-assistant-1'));
    assert.ok(!calls.includes('https://admin.example/v1/admin/monitor/activity'));
  } finally {
    cleanup();
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});

test('getInniesMonitorActivityFeed falls back to the legacy stitched path when the canonical backend route fails', async () => {
  const restoreEnv = withEnv({
    INNIES_MONITOR_USE_CANONICAL_BACKEND: 'true',
    INNIES_ADMIN_API_BASE_URL: 'https://admin.example',
    INNIES_ADMIN_API_KEY: 'admin-key',
    INNIES_ADMIN_API_TIMEOUT_MS: '15000',
    INNIES_API_BASE_URL: 'https://public.example',
    INNIES_BASE_URL: undefined,
    LIVE_OVERLAY_LOOKBACK_MS: undefined,
    LIVE_OVERLAY_BUYER_API_KEY_IDS: undefined,
  });
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (input) => {
    const url = String(input);
    calls.push(url);

    if (url === 'https://admin.example/v1/admin/monitor/activity') {
      return createJsonResponse({ message: 'backend route unavailable' }, 503);
    }

    if (url === 'https://public.example/v1/public/innies/live-sessions') {
      return createJsonResponse(createLegacyPublicLiveFeed());
    }

    if (url.startsWith('https://admin.example/v1/admin/archive/sessions?')) {
      return createJsonResponse({ sessions: [] });
    }

    throw new Error(`Unexpected fetch: ${url}`);
  };

  const { module, cleanup } = await loadServerModule();

  try {
    const payload = await module.getInniesMonitorActivityFeed();
    assert.equal(calls[0], 'https://admin.example/v1/admin/monitor/activity');
    assert.ok(calls.includes('https://public.example/v1/public/innies/live-sessions'));
    assert.ok(calls.some((url) => url.startsWith('https://admin.example/v1/admin/archive/sessions?')));
    assert.ok(payload.items.some((item) => item.id === 'live-session:cli:request:req_legacy'));
    assert.ok(payload.items.every((item) => item.href === null));
  } finally {
    cleanup();
    globalThis.fetch = originalFetch;
    restoreEnv();
  }
});
