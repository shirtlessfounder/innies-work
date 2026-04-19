'use client';

import type { CSSProperties } from 'react';
import { SessionsBoard } from './SessionsBoard';

const LIVE_TAB_SURFACE_STYLE = {
  '--console-line': '#E6E6E6',
  '--console-panel-table-top': 'rgba(248, 251, 253, 0.32)',
  '--console-panel-table-bottom': 'rgba(248, 251, 253, 0.18)',
  '--console-panel-strong': 'rgba(248, 251, 253, 0.82)',
  '--console-accent': '#0b7285',
  '--console-ink-soft': 'rgba(22, 51, 62, 0.68)',
  '--shell-line': 'rgba(20, 53, 64, 0.14)',
  '--shell-line-strong': 'rgba(20, 53, 64, 0.26)',
  '--shell-panel-strong': 'rgba(248, 251, 253, 0.88)',
  color: '#16333e'
} as CSSProperties;

export function InniesV2LiveSessionsTab() {
  return (
    <section className="w-full max-w-none px-1 pb-8" style={LIVE_TAB_SURFACE_STYLE}>
      <SessionsBoard />
    </section>
  );
}
