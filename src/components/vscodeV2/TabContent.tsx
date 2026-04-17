import type { ReactNode } from 'react';
import { InniesV2LiveSessionsTab } from '../live/InniesV2LiveSessionsTab';
import { SharedNotesTab } from './SharedNotesTab';
import type { VscodeTab } from './TabBar';

type TabContentProps = {
  activeTab: VscodeTab;
  children: ReactNode;
};

export function TabContent({ activeTab, children }: TabContentProps) {
  if (activeTab === 'landing-page.md') {
    return <>{children}</>;
  }

  if (activeTab === 'watch-me-work.md') {
    return <InniesV2LiveSessionsTab key={activeTab} />;
  }

  if (activeTab === 'leave-a-note.md') {
    return <SharedNotesTab key={activeTab} />;
  }

  return <div key={activeTab} className="max-w-5xl" />;
}
