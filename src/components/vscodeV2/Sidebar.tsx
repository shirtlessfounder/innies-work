'use client';

import type * as React from 'react';
import { ActivityBar } from './ActivityBar';
import { FileExplorer } from './FileExplorer';

export function Sidebar({
  onResizeStart,
  width
}: {
  onResizeStart: (event: React.MouseEvent<HTMLDivElement>) => void;
  width: number;
}) {
  return (
    <aside
      className="fixed left-0 top-0 h-screen overflow-visible flex"
      style={{
        width: `${width}px`,
        borderRight: '1px solid #2B2B2B',
        zIndex: 11
      }}
    >
      <ActivityBar />
      <FileExplorer />
      <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize" onMouseDown={onResizeStart} />
    </aside>
  );
}
