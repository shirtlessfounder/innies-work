'use client';

export const STATIC_TABS = [
  'landing-page.md',
  'watch-me-work.md',
  'leave-a-note.md'
 ] as const;

export type VscodeTab = (typeof STATIC_TABS)[number];

type TabBarProps = {
  activeTab: VscodeTab;
  onTabSelect: (tab: VscodeTab) => void;
};

export function TabBar({ activeTab, onTabSelect }: TabBarProps) {
  return (
    <div
      className="flex items-center overflow-x-auto [&::-webkit-scrollbar]:hidden"
      style={{
        fontFamily: 'Monaco, Menlo, "Courier New", monospace',
        fontSize: '13px',
        backgroundColor: '#181818',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}
    >
      {STATIC_TABS.map((tab, index) => {
        const isActive = activeTab === tab;

        return (
          <button
            key={tab}
            type="button"
            className="px-4 py-2 whitespace-nowrap transition-colors cursor-pointer"
            onClick={() => onTabSelect(tab)}
            style={{
              backgroundColor: isActive ? '#474748' : 'transparent',
              color: isActive ? '#E9E9E3' : '#858585',
              borderBottom: isActive ? '2px solid #FFFFFF' : 'none'
            }}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}
