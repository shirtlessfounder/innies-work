import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

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
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: input.fileName,
  }).outputText;

  writeFileSync(input.destinationPath, output, 'utf8');
}

async function loadCarouselModule() {
  const repoDir = fileURLToPath(new URL('..', import.meta.url));
  const tempDir = mkdtempSync(join(repoDir, '.tmp-live-sessions-carousel-'));

  try {
    const carouselSource = readSource('src/components/live/LiveSessionsCarousel.tsx')
      .replace("from '../../hooks/useInniesMonitorActivity';", "from './hookStub.mjs';")
      .replace("from './liveSessionsCarousel.module.css';", "from './styleStub.mjs';");

    compileTypeScriptModule({
      source: carouselSource,
      fileName: 'LiveSessionsCarousel.tsx',
      destinationPath: join(tempDir, 'LiveSessionsCarousel.mjs'),
    });

    writeFileSync(
      join(tempDir, 'hookStub.mjs'),
      [
        'export const INNIES_MONITOR_ACTIVITY_POLL_INTERVAL_MS = 7500;',
        'export function useInniesMonitorActivity() {',
        "  return { payload: null, liveStatus: 'loading', error: null, lastSuccessfulUpdateAt: null, refresh() {} };",
        '}',
        '',
      ].join('\n'),
      'utf8',
    );

    writeFileSync(join(tempDir, 'styleStub.mjs'), 'export default {};\n', 'utf8');

    const moduleUrl = `${pathToFileURL(join(tempDir, 'LiveSessionsCarousel.mjs')).href}?ts=${Date.now()}`;
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

test('buildLiveSessionCards excludes archive fallback sessions and sessions without a usable prompt trail', async () => {
  const { module, cleanup } = await loadCarouselModule();

  try {
    assert.equal(typeof module.buildLiveSessionCards, 'function');
    assert.equal(typeof module.isSyntheticArchiveLiveSession, 'function');

    const payload = {
      generatedAt: '2026-04-17T20:40:00.000Z',
      liveStatus: 'degraded',
      items: [
        {
          id: 'archive-live-session:cli:idle:buyer:req_archive',
          stream: 'live_sessions',
          kind: 'session',
          occurredAt: '2026-04-17T20:39:50.000Z',
          title: 'cli:idle:buyer:req_archive',
          detail: 'openai / gpt-5.4',
          sessionKey: 'cli:idle:buyer:req_archive',
          sessionType: 'cli',
          provider: 'openai',
          model: 'gpt-5.4',
          status: 'live',
          href: null,
        },
        {
          id: 'live-session:cli:openclaw:session-empty',
          stream: 'live_sessions',
          kind: 'session',
          occurredAt: '2026-04-17T20:39:40.000Z',
          title: 'empty lane',
          detail: 'openai / gpt-5.4',
          sessionKey: 'cli:openclaw:session-empty',
          sessionType: 'openclaw',
          provider: 'openai',
          model: 'gpt-5.4',
          status: 'live',
          href: null,
        },
        {
          id: 'live-session:cli:openclaw:session-real',
          stream: 'live_sessions',
          kind: 'session',
          occurredAt: '2026-04-17T20:39:30.000Z',
          title: 'real lane',
          detail: 'openai / gpt-5.4',
          sessionKey: 'cli:openclaw:session-real',
          sessionType: 'openclaw',
          provider: 'openai',
          model: 'gpt-5.4',
          status: 'live',
          href: null,
        },
        {
          id: 'archive-live-prompt:cli:idle:buyer:req_archive:user',
          stream: 'latest_prompts',
          kind: 'request_message',
          occurredAt: '2026-04-17T20:39:51.000Z',
          title: 'archived request',
          detail: 'openai / gpt-5.4',
          sessionKey: 'cli:idle:buyer:req_archive',
          sessionType: 'cli',
          provider: 'openai',
          model: 'gpt-5.4',
          status: null,
          href: null,
        },
        {
          id: 'tool-call:session-empty',
          stream: 'latest_prompts',
          kind: 'tool_call',
          occurredAt: '2026-04-17T20:39:41.000Z',
          title: 'search',
          detail: null,
          sessionKey: 'cli:openclaw:session-empty',
          sessionType: 'openclaw',
          provider: 'openai',
          model: 'gpt-5.4',
          status: null,
          href: null,
        },
        {
          id: 'tool-result:session-empty',
          stream: 'latest_prompts',
          kind: 'tool_result',
          occurredAt: '2026-04-17T20:39:42.000Z',
          title: 'result',
          detail: null,
          sessionKey: 'cli:openclaw:session-empty',
          sessionType: 'openclaw',
          provider: 'openai',
          model: 'gpt-5.4',
          status: null,
          href: null,
        },
        {
          id: 'user:session-real',
          stream: 'latest_prompts',
          kind: 'user',
          occurredAt: '2026-04-17T20:39:31.000Z',
          title: 'show me the real prompt trail',
          detail: null,
          sessionKey: 'cli:openclaw:session-real',
          sessionType: 'openclaw',
          provider: 'openai',
          model: 'gpt-5.4',
          status: null,
          href: null,
        },
        {
          id: 'assistant:session-real',
          stream: 'latest_prompts',
          kind: 'assistant_final',
          occurredAt: '2026-04-17T20:39:32.000Z',
          title: 'working through the real prompt trail',
          detail: null,
          sessionKey: 'cli:openclaw:session-real',
          sessionType: 'openclaw',
          provider: 'openai',
          model: 'gpt-5.4',
          status: null,
          href: null,
        },
      ],
    };

    const cards = module.buildLiveSessionCards(payload);
    assert.equal(module.isSyntheticArchiveLiveSession(payload.items[0]), true);
    assert.equal(module.isSyntheticArchiveLiveSession(payload.items[2]), false);
    assert.deepEqual(
      cards.map((card) => ({
        sessionId: card.session.id,
        sessionKey: card.session.sessionKey,
        trailKinds: card.trail.map((entry) => entry.kind),
        trailTitles: card.trail.map((entry) => entry.title),
      })),
      [
        {
          sessionId: 'live-session:cli:openclaw:session-real',
          sessionKey: 'cli:openclaw:session-real',
          trailKinds: ['user', 'assistant_final'],
          trailTitles: [
            'show me the real prompt trail',
            'working through the real prompt trail',
          ],
        },
      ],
    );
  } finally {
    cleanup();
  }
});
