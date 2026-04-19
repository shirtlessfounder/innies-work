'use client';

import type { CSSProperties } from 'react';
import { SessionsBoard } from './SessionsBoard';
import type { InniesLiveFeed } from '../../lib/inniesLive/feedTypes';

// The watch-me-work tab renders inside the vscode shell's editor pane (dark
// `#1F1F1F` bg, Monaco/Menlo mono text, line numbers on the left). We
// intentionally do NOT introduce card chrome, rounded corners, or light
// surfaces here — each session reads as a block of code-style log content
// in the editor itself. The `--console-line` var stays so that any
// downstream styles keyed off it (and tests that assert its presence)
// continue to work.
const LIVE_TAB_SURFACE_STYLE = {
  '--console-line': '#E6E6E6'
} as CSSProperties;

type InniesV2LiveSessionsTabProps = {
  initialFeed?: InniesLiveFeed | null;
};

export function InniesV2LiveSessionsTab({ initialFeed = null }: InniesV2LiveSessionsTabProps = {}) {
  return (
    <section className="w-full max-w-none" style={LIVE_TAB_SURFACE_STYLE}>
      <SessionsBoard initialFeed={initialFeed} />
    </section>
  );
}
