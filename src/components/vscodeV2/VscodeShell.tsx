'use client';

import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Footer } from './Footer';
import { Header } from './Header';
import { LineNumbers } from './LineNumbers';
import { Sidebar } from './Sidebar';
import { TabContent } from './TabContent';
import { STATIC_TABS, type VscodeTab } from './TabBar';

const MIN_SIDEBAR_WIDTH = 220;
const MAX_SIDEBAR_WIDTH = 520;

function readInitialTabFromLocation(): VscodeTab | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const requestedTab = searchParams.get('tab');
  if (!requestedTab || !STATIC_TABS.includes(requestedTab as VscodeTab)) {
    return null;
  }

  return requestedTab as VscodeTab;
}

export function VscodeShell({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<VscodeTab>('landing-page.md');
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [lineCount, setLineCount] = useState(1);
  const mainRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(300);
  const showShellLineNumbers = activeTab !== 'leave-a-note.md';

  useEffect(() => {
    const initialTab = readInitialTabFromLocation();
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, []);

  useEffect(() => {
    const updateLineCount = () => {
      if (contentRef.current) {
        const contentHeight = contentRef.current.scrollHeight;
        const lineHeight = 24;
        const calculatedLines = Math.max(Math.ceil(contentHeight / lineHeight), 1);
        setLineCount(calculatedLines);
      }
    };

    const frameId = requestAnimationFrame(updateLineCount);
    window.addEventListener('resize', updateLineCount);

    let observer: MutationObserver | null = null;
    if (contentRef.current) {
      observer = new MutationObserver(updateLineCount);
      observer.observe(contentRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
      });
    }

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', updateLineCount);
      observer?.disconnect();
    };
  }, [activeTab, children]);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [activeTab]);

  useEffect(() => {
    if (!isResizingSidebar) {
      return;
    }

    const handleSidebarResize = (event: MouseEvent) => {
      const deltaX = event.clientX - resizeStartXRef.current;
      const nextWidth = resizeStartWidthRef.current + deltaX;
      setSidebarWidth(Math.min(Math.max(nextWidth, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH));
    };

    const stopSidebarResize = () => {
      setIsResizingSidebar(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleSidebarResize);
    window.addEventListener('mouseup', stopSidebarResize);

    return () => {
      window.removeEventListener('mousemove', handleSidebarResize);
      window.removeEventListener('mouseup', stopSidebarResize);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizingSidebar]);

  const startSidebarResize = (event: React.MouseEvent<HTMLDivElement>) => {
    resizeStartXRef.current = event.clientX;
    resizeStartWidthRef.current = sidebarWidth;
    setIsResizingSidebar(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#1F1F1F' }}>
      <Sidebar width={sidebarWidth} onResizeStart={startSidebarResize} />

      <main
        ref={mainRef}
        className="h-screen overflow-y-auto"
        style={{ marginLeft: `${sidebarWidth}px`, paddingBottom: '28px' }}
      >
        <Header activeTab={activeTab} onTabSelect={setActiveTab} />
        <div className="flex">
          {showShellLineNumbers ? <LineNumbers lineCount={lineCount} /> : null}
          <div
            ref={contentRef}
            className={
              showShellLineNumbers
                ? 'min-w-0 flex-1 px-8 py-12'
                : 'min-w-0 flex-1'
            }
          >
            <TabContent activeTab={activeTab}>{children}</TabContent>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
