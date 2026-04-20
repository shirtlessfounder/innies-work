'use client';

import type * as React from 'react';
import { ACTIVITY_BAR_WIDTH, ActivityBar } from './ActivityBar';
import { FileExplorer } from './FileExplorer';

export function Sidebar({
  onResizeStart,
  width,
  isMobile = false,
  isExplorerOpen = true,
  onToggleExplorer
}: {
  onResizeStart: (event: React.MouseEvent<HTMLDivElement>) => void;
  width: number;
  isMobile?: boolean;
  isExplorerOpen?: boolean;
  onToggleExplorer?: () => void;
}) {
  const showExplorer = !isMobile || isExplorerOpen;
  const asideWidth = isMobile && !isExplorerOpen ? ACTIVITY_BAR_WIDTH : width;

  return (
    <aside
      className="fixed left-0 top-0 h-screen overflow-visible flex"
      style={{
        width: `${asideWidth}px`,
        borderRight: '1px solid #2B2B2B',
        zIndex: 11
      }}
    >
      <ActivityBar onToggleExplorer={isMobile ? onToggleExplorer : undefined} />
      {showExplorer ? <FileExplorer /> : null}
      {!isMobile ? (
        <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize" onMouseDown={onResizeStart} />
      ) : null}
    </aside>
  );
}
