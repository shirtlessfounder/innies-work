'use client';

import { TabBar, type VscodeTab } from './TabBar';

type HeaderProps = {
  activeTab: VscodeTab;
  onTabSelect: (tab: VscodeTab) => void;
};

export function Header({ activeTab, onTabSelect }: HeaderProps) {
  return (
    <header
      className="sticky top-0 z-10"
      style={{
        backgroundColor: '#181818',
        borderBottom: '1px solid #2B2B2B'
      }}
    >
      <TabBar activeTab={activeTab} onTabSelect={onTabSelect} />
    </header>
  );
}
