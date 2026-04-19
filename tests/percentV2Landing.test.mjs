import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

function fileUrl(relativePath) {
  return new URL(`../${relativePath}`, import.meta.url);
}

function readSource(relativePath) {
  assert.equal(existsSync(fileUrl(relativePath)), true, `${relativePath} should exist`);
  return readFileSync(fileUrl(relativePath), 'utf8');
}

test('v2 scaffold files exist', () => {
  assert.equal(existsSync(fileUrl('src/app/v2/page.tsx')), true);
  assert.equal(existsSync(fileUrl('src/app/v2/layout.tsx')), true);
  assert.equal(existsSync(fileUrl('src/components/vscodeV2/TabContent.tsx')), true);
  assert.equal(existsSync(fileUrl('tailwind.config.js')), true);
  assert.equal(existsSync(fileUrl('postcss.config.mjs')), true);
});

test('v2 route carries the shirtless founder hero + mission + product table', () => {
  const pageSource = readSource('src/app/v2/page.tsx');

  // /v2 is served standalone (no VscodeShell) as a minimal landing mirror.
  // The same copy is also the `children` of VscodeShell at / (src/app/page.tsx).
  assert.ok(pageSource.includes("import Image from 'next/image';"));
  assert.ok(pageSource.includes('Shirtless Founder'));
  assert.ok(pageSource.includes('aria-label="Shirtless Founder"'));
  assert.ok(pageSource.includes('<span>Shirtless</span>'));
  assert.ok(pageSource.includes('<span>Founder</span>'));
  assert.ok(pageSource.includes('/vscode-v2/images/shirtless-founder-avatar.jpeg'));
  assert.ok(pageSource.includes('safiro-medium.otf'));
  // Section headers from the current copy (mission replaced the old what-am-i-doing + thesis pair)
  assert.ok(pageSource.includes('Mission'));
  assert.ok(!pageSource.includes('What am I doing?'));
  assert.ok(!pageSource.includes('Thesis'));
  assert.ok(pageSource.includes('amplifies the uniqueness'));
  assert.ok(pageSource.includes('Try out and'));
  // Product rows (pipe-delimited, not a <LandingProductsTable>)
  assert.ok(pageSource.includes('talk-to-my-agent'));
  assert.ok(pageSource.includes('auto-biographer'));
  assert.ok(pageSource.includes('slate-agent'));
  assert.ok(pageSource.includes('agentmeets'));
});

test('v2 shell preserves the vscode-style editor chrome', () => {
  const layoutSource = readSource('src/app/v2/layout.tsx');
  const lineNumbersSource = readSource('src/components/vscodeV2/LineNumbers.tsx');
  const shellSource = readSource('src/components/vscodeV2/VscodeShell.tsx');
  const sidebarSource = readSource('src/components/vscodeV2/Sidebar.tsx');
  const tabContentSource = readSource('src/components/vscodeV2/TabContent.tsx');

  assert.ok(layoutSource.includes('Z Combinator'));
  assert.ok(shellSource.includes('Sidebar'));
  assert.ok(shellSource.includes('LineNumbers'));
  assert.ok(shellSource.includes('Footer'));
  assert.ok(shellSource.includes("const [activeTab, setActiveTab] = useState<VscodeTab>('landing-page.md');"));
  assert.ok(shellSource.includes('const [sidebarWidth, setSidebarWidth] = useState(300);'));
  assert.ok(shellSource.includes('const [isResizingSidebar, setIsResizingSidebar] = useState(false);'));
  assert.ok(shellSource.includes('const mainRef = useRef<HTMLElement>(null);'));
  assert.ok(shellSource.includes('const MIN_SIDEBAR_WIDTH = 220;'));
  assert.ok(shellSource.includes('const MAX_SIDEBAR_WIDTH = 520;'));
  assert.ok(shellSource.includes('const startSidebarResize = (event: React.MouseEvent<HTMLDivElement>) => {'));
  assert.ok(shellSource.includes("document.body.style.cursor = 'col-resize'"));
  assert.ok(shellSource.includes("window.addEventListener('mousemove', handleSidebarResize)"));
  assert.ok(shellSource.includes("window.addEventListener('mouseup', stopSidebarResize)"));
  assert.ok(shellSource.includes('setSidebarWidth(Math.min(Math.max(nextWidth, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH));'));
  assert.ok(shellSource.includes("mainRef.current?.scrollTo({ top: 0, behavior: 'auto' });"));
  assert.ok(shellSource.includes('<Header activeTab={activeTab} onTabSelect={setActiveTab} />'));
  assert.ok(shellSource.includes('<TabContent activeTab={activeTab}>{children}</TabContent>'));
  assert.ok(shellSource.includes('width={sidebarWidth}'));
  assert.ok(shellSource.includes('onResizeStart={startSidebarResize}'));
  assert.ok(shellSource.includes('ref={mainRef}'));
  assert.ok(shellSource.includes("style={{ marginLeft: `${sidebarWidth}px`, paddingBottom: '28px' }}"));
  assert.ok(shellSource.includes("backgroundColor: '#1F1F1F'"));
  assert.ok(shellSource.includes("const showShellLineNumbers = activeTab !== 'leave-a-note.md';"));
  assert.ok(shellSource.includes('showShellLineNumbers'));
  // Content wrapper gets `min-w-0` so horizontally-scrollable tabs (like
  // watch-me-work.md's carousel) can actually scroll within the shell
  // instead of bursting past the viewport via the default flex-item
  // `min-width: auto` behavior.
  assert.ok(shellSource.includes("'min-w-0 flex-1 px-8 py-12'"));
  assert.ok(shellSource.includes("'min-w-0 flex-1'"));
  assert.ok(lineNumbersSource.includes('fontFamily: \'Monaco, Menlo, "Courier New", monospace\''));
  assert.ok(lineNumbersSource.includes("fontSize: '13px'"));
  assert.ok(lineNumbersSource.includes("width: '48px'"));
  assert.ok(lineNumbersSource.includes("borderRight: '1px solid #2B2B2B'"));
  assert.ok(sidebarSource.includes('className="fixed left-0 top-0 h-screen overflow-visible flex"'));
  assert.ok(sidebarSource.includes('width: `${width}px`'));
  assert.ok(sidebarSource.includes('className="absolute right-0 top-0 h-full w-1 cursor-col-resize"'));
  assert.ok(sidebarSource.includes('cursor-col-resize'));
  assert.ok(sidebarSource.includes('onMouseDown={onResizeStart}'));
  assert.ok(!sidebarSource.includes('shrink-0 cursor-col-resize'));
  assert.ok(tabContentSource.includes("if (activeTab === 'landing-page.md')"));
  assert.ok(tabContentSource.includes("import { InniesV2LiveSessionsTab } from '../live/InniesV2LiveSessionsTab';"));
  assert.ok(tabContentSource.includes("if (activeTab === 'watch-me-work.md')"));
  assert.ok(tabContentSource.includes('return <InniesV2LiveSessionsTab key={activeTab} />;'));
  assert.ok(tabContentSource.includes('return <>{children}</>;'));
  assert.ok(tabContentSource.includes('return <div key={activeTab} className="max-w-5xl" />;'));
  assert.ok(!tabContentSource.includes('Shirtless Founder'));
  assert.ok(!tabContentSource.includes('What is ZC?'));
});

test('v2 assets and vscode shell icons exist', () => {
  assert.equal(existsSync(fileUrl('public/vscode-v2/logos/z-logo-white.png')), true);
  assert.equal(existsSync(fileUrl('public/vscode-v2/logos/z-logo-black.png')), true);
  assert.equal(existsSync(fileUrl('public/vscode-v2/fonts/safiro-medium.otf')), true);
  assert.equal(existsSync(fileUrl('public/vscode-v2/images/shirtless-founder-avatar.jpeg')), true);
});

test('v2 sidebar preserves activity bar and explorer structure', () => {
  const activityBarSource = readSource('src/components/vscodeV2/ActivityBar.tsx');
  const fileExplorerSource = readSource('src/components/vscodeV2/FileExplorer.tsx');
  const headerSource = readSource('src/components/vscodeV2/Header.tsx');
  const sidebarSource = readSource('src/components/vscodeV2/Sidebar.tsx');

  assert.ok(sidebarSource.includes('ActivityBar'));
  assert.ok(sidebarSource.includes('FileExplorer'));
  assert.ok(activityBarSource.includes("backgroundColor: '#0E0E0E'"));
  assert.ok(headerSource.includes('className="sticky top-0 z-10"'));
  assert.ok(sidebarSource.includes('zIndex: 11'));
  assert.ok(fileExplorerSource.includes('EXPLORER'));
  assert.ok(fileExplorerSource.includes('projects'));
  assert.ok(fileExplorerSource.includes('slate-agent'));
  assert.ok(fileExplorerSource.includes('innies'));
  assert.ok(fileExplorerSource.includes('combinator'));
  assert.ok(fileExplorerSource.includes('agentmeets'));
  assert.ok(fileExplorerSource.includes('name="agentmeets"'));
  assert.ok(!fileExplorerSource.includes('name="agent-meets"'));
  assert.ok(fileExplorerSource.includes('auto-biographer'));
  assert.ok(fileExplorerSource.includes('old-builds'));
  assert.ok(fileExplorerSource.includes('moltmarkets'));
  assert.ok(fileExplorerSource.includes('links'));
  assert.ok(fileExplorerSource.includes('output'));
  assert.ok(fileExplorerSource.includes('socials'));
  assert.ok(fileExplorerSource.includes('personal'));
  assert.ok(fileExplorerSource.includes('friends'));
  assert.ok(fileExplorerSource.includes('hands'));
  assert.ok(fileExplorerSource.includes('oogway'));
  assert.ok(fileExplorerSource.includes('aelix'));
  assert.ok(!fileExplorerSource.includes('shirtless-projects'));
  assert.ok(!fileExplorerSource.includes('shirtless-socials'));
  assert.ok(fileExplorerSource.includes('slate-agent.git'));
  assert.ok(fileExplorerSource.includes('slate-agent.com/launch'));
  assert.ok(fileExplorerSource.indexOf('slate-agent.com/launch') < fileExplorerSource.indexOf('slate-agent.git'));
  assert.ok(fileExplorerSource.includes('innies.computer'));
  assert.ok(fileExplorerSource.includes('innies.git'));
  assert.ok(fileExplorerSource.includes('combinator.trade'));
  assert.ok(fileExplorerSource.includes('combinator.git'));
  assert.ok(fileExplorerSource.includes('programs.git'));
  assert.ok(fileExplorerSource.includes('innies.live'));
  assert.ok(fileExplorerSource.includes('agentmeets.git'));
  assert.ok(!fileExplorerSource.includes('innies-oss.git'));
  assert.ok(!fileExplorerSource.includes('agentmeets-oss.git'));
  assert.ok(fileExplorerSource.includes('ambient-memory-log.git'));
  assert.ok(fileExplorerSource.includes('auto-biographer.git'));
  assert.ok(fileExplorerSource.includes('x-team-capture.git'));
  assert.ok(fileExplorerSource.includes('slack-link-capture.git'));
  assert.ok(fileExplorerSource.includes('devscan.git'));
  assert.ok(fileExplorerSource.includes('moltmarkets-api.git'));
  assert.ok(fileExplorerSource.includes('moltmarkets-agent-skill.git'));
  assert.ok(fileExplorerSource.includes('gitpost.git'));
  assert.ok(fileExplorerSource.includes('launchontwitch.git'));
  assert.ok(fileExplorerSource.includes('telegram-ipa.git'));
  assert.ok(!fileExplorerSource.includes('page.tsx'));
  assert.ok(!fileExplorerSource.includes('layout.tsx'));
  assert.ok(!fileExplorerSource.includes('globals.css'));
  assert.ok(!fileExplorerSource.includes('package.json'));
  assert.ok(!fileExplorerSource.includes('README.md'));
  assert.ok(fileExplorerSource.includes('github.com/shirtlessfounder'));
  assert.ok(fileExplorerSource.includes('x.com/bicep_pump'));
  assert.ok(fileExplorerSource.includes('t.me/shirtlessfounder'));
  assert.ok(fileExplorerSource.includes('substack.com/@dylanvu'));
  assert.ok(fileExplorerSource.includes('goodreads.com/dylanvu'));
  assert.ok(fileExplorerSource.includes('soundcloud.com/shirtlessdj'));
  assert.ok(fileExplorerSource.includes('spotify.com/user/duydyvu'));
  assert.ok(fileExplorerSource.includes('t.me/handsdiff'));
  assert.ok(fileExplorerSource.includes('github.com/handsdiff'));
  assert.ok(fileExplorerSource.includes('x.com/handsdiff'));
  assert.ok(fileExplorerSource.includes('t.me/oogway_defi'));
  assert.ok(fileExplorerSource.includes('x.com/oogway_defi'));
  assert.ok(fileExplorerSource.includes('github.com/spiceoogway'));
  assert.ok(fileExplorerSource.includes('substack.com/@oogwaydefi'));
  assert.ok(fileExplorerSource.includes('x.com/aelix0x'));
  assert.ok(fileExplorerSource.includes('t.me/aelix1001'));
  assert.ok(fileExplorerSource.includes('github.com/alexjaniak'));
  assert.ok(fileExplorerSource.indexOf("folderKey: 'output'") < fileExplorerSource.indexOf("{ href: 'https://github.com/shirtlessfounder', icon: 'github' }"));
  assert.ok(fileExplorerSource.indexOf("{ href: 'https://github.com/shirtlessfounder', icon: 'github' }") < fileExplorerSource.indexOf("folderKey: 'socials'"));
  assert.ok(fileExplorerSource.indexOf("folderKey: 'socials'") < fileExplorerSource.indexOf("{ href: 'https://x.com/bicep_pump', icon: 'x' }"));
  assert.ok(fileExplorerSource.indexOf("{ href: 'https://x.com/bicep_pump', icon: 'x' }") < fileExplorerSource.indexOf("{ href: 'https://t.me/shirtlessfounder', icon: 'telegram' }"));
  assert.ok(fileExplorerSource.indexOf("{ href: 'https://t.me/shirtlessfounder', icon: 'telegram' }") < fileExplorerSource.indexOf("folderKey: 'personal'"));
  assert.ok(fileExplorerSource.indexOf("folderKey: 'personal'") < fileExplorerSource.indexOf("{ href: 'https://substack.com/@dylanvu', icon: 'substack' }"));
  assert.ok(fileExplorerSource.indexOf("{ href: 'https://substack.com/@dylanvu', icon: 'substack' }") < fileExplorerSource.indexOf("{ href: 'https://goodreads.com/dylanvu', icon: 'goodreads' }"));
  assert.ok(fileExplorerSource.indexOf("{ href: 'https://goodreads.com/dylanvu', icon: 'goodreads' }") < fileExplorerSource.indexOf("{ href: 'https://soundcloud.com/shirtlessdj', icon: 'soundcloud' }"));
  assert.ok(fileExplorerSource.indexOf("{ href: 'https://soundcloud.com/shirtlessdj', icon: 'soundcloud' }") < fileExplorerSource.indexOf("{ href: 'https://open.spotify.com/user/duydyvu', icon: 'spotify' }"));
  assert.ok(fileExplorerSource.indexOf('name="links"') < fileExplorerSource.indexOf('name="friends"'));
  assert.ok(fileExplorerSource.indexOf("folderKey: 'hands'") < fileExplorerSource.indexOf("folderKey: 'oogway'"));
  assert.ok(fileExplorerSource.indexOf("folderKey: 'oogway'") < fileExplorerSource.indexOf("folderKey: 'aelix'"));
  assert.ok(fileExplorerSource.indexOf("folderKey: 'hands'") < fileExplorerSource.indexOf("{ href: 'https://t.me/handsdiff', icon: 'telegram' }"));
  assert.ok(fileExplorerSource.indexOf("{ href: 'https://t.me/handsdiff', icon: 'telegram' }") < fileExplorerSource.indexOf("{ href: 'https://github.com/handsdiff', icon: 'github' }"));
  assert.ok(fileExplorerSource.indexOf("{ href: 'https://github.com/handsdiff', icon: 'github' }") < fileExplorerSource.indexOf("{ href: 'https://x.com/handsdiff', icon: 'x' }"));
  assert.ok(fileExplorerSource.indexOf("{ href: 'https://x.com/handsdiff', icon: 'x' }") < fileExplorerSource.indexOf("folderKey: 'oogway'"));
  assert.ok(fileExplorerSource.indexOf("folderKey: 'oogway'") < fileExplorerSource.indexOf("{ href: 'https://t.me/oogway_defi', icon: 'telegram' }"));
  assert.ok(fileExplorerSource.indexOf("{ href: 'https://t.me/oogway_defi', icon: 'telegram' }") < fileExplorerSource.indexOf("{ href: 'https://x.com/oogway_defi', icon: 'x' }"));
  assert.ok(fileExplorerSource.indexOf("{ href: 'https://x.com/oogway_defi', icon: 'x' }") < fileExplorerSource.indexOf("{ href: 'https://github.com/spiceoogway', icon: 'github' }"));
  assert.ok(fileExplorerSource.indexOf("{ href: 'https://github.com/spiceoogway', icon: 'github' }") < fileExplorerSource.indexOf("{ href: 'https://substack.com/@oogwaydefi', icon: 'substack' }"));
  assert.ok(fileExplorerSource.indexOf("{ href: 'https://substack.com/@oogwaydefi', icon: 'substack' }") < fileExplorerSource.indexOf("folderKey: 'aelix'"));
  assert.ok(fileExplorerSource.indexOf("folderKey: 'aelix'") < fileExplorerSource.indexOf("{ href: 'https://x.com/aelix0x', icon: 'x' }"));
  assert.ok(fileExplorerSource.indexOf("{ href: 'https://x.com/aelix0x', icon: 'x' }") < fileExplorerSource.indexOf("{ href: 'https://t.me/aelix1001', icon: 'telegram' }"));
  assert.ok(fileExplorerSource.indexOf("{ href: 'https://t.me/aelix1001', icon: 'telegram' }") < fileExplorerSource.indexOf("{ href: 'https://github.com/alexjaniak', icon: 'github' }"));
  assert.ok(fileExplorerSource.includes('https://github.com/handsdiff/activeclaw'));
  assert.ok(fileExplorerSource.includes('https://www.combinator.trade/launch-agent'));
  assert.ok(fileExplorerSource.includes('https://innies.computer'));
  assert.ok(fileExplorerSource.includes('https://github.com/shirtlessfounder/innies'));
  assert.ok(fileExplorerSource.includes('https://www.combinator.trade/'));
  assert.ok(fileExplorerSource.includes('https://github.com/zcombinatorio/combinator'));
  assert.ok(fileExplorerSource.includes('https://github.com/zcombinatorio/programs'));
  assert.ok(fileExplorerSource.includes('https://innies.live'));
  assert.ok(fileExplorerSource.includes('https://github.com/alexjaniak/AgentMeets'));
  assert.ok(fileExplorerSource.includes('https://github.com/shirtlessfounder/auto-biographer'));
  assert.ok(fileExplorerSource.includes('https://github.com/shirtlessfounder/ambient-memory-log'));
  assert.ok(fileExplorerSource.includes('https://github.com/shirtlessfounder/x-team-capture'));
  assert.ok(fileExplorerSource.includes('https://github.com/shirtlessfounder/slack-link-capture'));
  assert.ok(fileExplorerSource.includes('https://github.com/shirtlessfounder/devscan'));
  assert.ok(fileExplorerSource.includes('https://github.com/shirtlessfounder/moltmarkets-api'));
  assert.ok(fileExplorerSource.includes('https://github.com/shirtlessfounder/moltmarkets-agent-skill'));
  assert.ok(fileExplorerSource.includes('https://github.com/shirtlessfounder/gitpost'));
  assert.ok(fileExplorerSource.includes('https://github.com/shirtlessfounder/launchontwitch'));
  assert.ok(fileExplorerSource.includes('https://github.com/zcombinatorio/ipa'));
  assert.ok(fileExplorerSource.includes('https://github.com/shirtlessfounder'));
  assert.ok(fileExplorerSource.includes('https://x.com/bicep_pump'));
  assert.ok(fileExplorerSource.includes('https://t.me/shirtlessfounder'));
  assert.ok(fileExplorerSource.includes('https://substack.com/@dylanvu'));
  assert.ok(fileExplorerSource.includes('https://goodreads.com/dylanvu'));
  assert.ok(fileExplorerSource.includes('https://soundcloud.com/shirtlessdj'));
  assert.ok(fileExplorerSource.includes('https://open.spotify.com/user/duydyvu'));
  assert.ok(fileExplorerSource.includes('https://t.me/handsdiff'));
  assert.ok(fileExplorerSource.includes("hoverNote?: string;"));
  assert.ok(fileExplorerSource.includes("hoverNote: 'an agent that follows what you\\'re thinking, doing and shipping and posts about it'"));
  assert.ok(fileExplorerSource.includes("hoverNote: 'records, uploads, transcribes and labels all spoken words in an office setting as context for agents'"));
  assert.ok(fileExplorerSource.includes("hoverNote: 'scrapes specified team members\\' x posts as context for agents'"));
  assert.ok(fileExplorerSource.includes("hoverNote: 'scrapes all links shared in a slack workspace as context for agents'"));
  assert.ok(fileExplorerSource.includes("const moltmarketsTooltipNote = 'agent-only prediction markets'"));
  assert.ok(fileExplorerSource.includes("hoverNote: 'memecoin dev leaderboard and analytics dashboard'"));
  assert.ok(fileExplorerSource.includes("hoverNote: 'autoposts on x every time you commit and push code changes'"));
  assert.ok(fileExplorerSource.includes("hoverNote: 'launch a memecoin with a stream clip link directly from chat'"));
  assert.ok(fileExplorerSource.includes("hoverNote: 'track memecoin mention confluence across the telegram group chats you\\'ve joined'"));
  assert.ok(fileExplorerSource.includes("const activeHermesTooltipNote = 'a proactive, digitally embodied hermes agent fork with access to in-network messaging'"));
  assert.ok(fileExplorerSource.includes("const inniesTooltipNote = 'pool tokens into one key for extended claude/codex capacity'"));
  assert.ok(fileExplorerSource.includes("const agentMeetsTooltipNote = 'create DM chat room with invite links for any two agents'"));
  assert.ok(fileExplorerSource.includes("const combinatorTooltipNote = 'multi-option futarchy infrastructure for your launchpad, project, or token'"));
  assert.ok(fileExplorerSource.includes('setHoveredProjectEntryPosition(moltmarketsTooltipNote, target);'));
  assert.ok(fileExplorerSource.includes('setHoveredProjectEntryPosition(activeHermesTooltipNote, target);'));
  assert.ok(fileExplorerSource.includes('setHoveredProjectEntryPosition(inniesTooltipNote, target);'));
  assert.ok(fileExplorerSource.includes('setHoveredProjectEntryPosition(agentMeetsTooltipNote, target);'));
  assert.ok(fileExplorerSource.includes('setHoveredProjectEntryPosition(combinatorTooltipNote, target);'));
  assert.equal((fileExplorerSource.match(/onHoverStart=\{setMoltmarketsTooltip\}/g) ?? []).length, 2);
  assert.equal((fileExplorerSource.match(/onHoverStart=\{setActiveHermesTooltip\}/g) ?? []).length, 2);
  assert.equal((fileExplorerSource.match(/onHoverStart=\{setInniesTooltip\}/g) ?? []).length, 2);
  assert.equal((fileExplorerSource.match(/onHoverStart=\{setAgentMeetsTooltip\}/g) ?? []).length, 2);
  assert.equal((fileExplorerSource.match(/onHoverStart=\{setCombinatorTooltip\}/g) ?? []).length, 2);
  assert.equal((fileExplorerSource.match(/onHoverEnd=\{clearHoveredProjectEntry\}/g) ?? []).length, 10);
  assert.ok(!fileExplorerSource.includes('const activeHermesLaunchRowRef = useRef<HTMLDivElement | null>(null);'));
  assert.ok(!fileExplorerSource.includes('const inniesFolderRowRef = useRef<HTMLDivElement | null>(null);'));
  assert.ok(!fileExplorerSource.includes('const agentMeetsFolderRowRef = useRef<HTMLDivElement | null>(null);'));
  assert.ok(!fileExplorerSource.includes('const combinatorFolderRowRef = useRef<HTMLDivElement | null>(null);'));
  assert.ok(!fileExplorerSource.includes("expandedFolders['slate-agent'] ? activeHermesLaunchRowRef.current ?? target : target"));
  assert.ok(!fileExplorerSource.includes('setHoveredProjectEntryPosition(inniesTooltipNote, inniesFolderRowRef.current ?? target);'));
  assert.ok(!fileExplorerSource.includes('setHoveredProjectEntryPosition(agentMeetsTooltipNote, agentMeetsFolderRowRef.current ?? target);'));
  assert.ok(!fileExplorerSource.includes('setHoveredProjectEntryPosition(combinatorTooltipNote, combinatorFolderRowRef.current ?? target);'));
  assert.ok(!fileExplorerSource.includes("rowRef={entry.name === 'slate-agent.com/launch' ? activeHermesLaunchRowRef : undefined}"));
  assert.ok(!fileExplorerSource.includes('rowRef={inniesFolderRowRef}'));
  assert.ok(!fileExplorerSource.includes('rowRef={agentMeetsFolderRowRef}'));
  assert.ok(!fileExplorerSource.includes('rowRef={combinatorFolderRowRef}'));
  assert.ok(!fileExplorerSource.includes('const inniesWebsiteRowRef = useRef<HTMLDivElement | null>(null);'));
  assert.ok(!fileExplorerSource.includes('const agentMeetsWebsiteRowRef = useRef<HTMLDivElement | null>(null);'));
  assert.ok(!fileExplorerSource.includes('const combinatorWebsiteRowRef = useRef<HTMLDivElement | null>(null);'));
  assert.ok(!fileExplorerSource.includes("expandedFolders.innies ? inniesWebsiteRowRef.current ?? target : target"));
  assert.ok(!fileExplorerSource.includes("expandedFolders['agent-meets'] ? agentMeetsWebsiteRowRef.current ?? target : target"));
  assert.ok(!fileExplorerSource.includes("expandedFolders.combinator ? combinatorWebsiteRowRef.current ?? target : target"));
  assert.ok(!fileExplorerSource.includes("rowRef={entry.name === 'innies.computer' ? inniesWebsiteRowRef : undefined}"));
  assert.ok(!fileExplorerSource.includes("rowRef={entry.name === 'innies.live' ? agentMeetsWebsiteRowRef : undefined}"));
  assert.ok(!fileExplorerSource.includes("rowRef={entry.name === 'combinator.trade' ? combinatorWebsiteRowRef : undefined}"));
  assert.ok(fileExplorerSource.includes('className="group relative block min-w-0"'));
  assert.ok(fileExplorerSource.includes('const explorerViewportRef = useRef<HTMLDivElement>(null);'));
  assert.ok(fileExplorerSource.includes('const [hoveredProjectEntry, setHoveredProjectEntry] = useState<'));
  assert.ok(fileExplorerSource.includes('className="relative min-w-0 flex-1 overflow-visible"'));
  assert.ok(fileExplorerSource.includes('className="h-full overflow-x-hidden overflow-y-auto"'));
  assert.ok(fileExplorerSource.includes("paddingBottom: '28px'"));
  assert.ok(fileExplorerSource.includes('top: entryRect.top - containerRect.top + (entryRect.height / 2)'));
  assert.ok(fileExplorerSource.includes('hoveredProjectEntry ? ('));
  assert.ok(fileExplorerSource.includes("backgroundColor: '#181818'"));
  assert.ok(fileExplorerSource.includes('position: \'absolute\''));
  assert.ok(fileExplorerSource.includes('left: \'calc(100% + 12px)\''));
  assert.ok(fileExplorerSource.includes('width: \'220px\''));
  assert.ok(fileExplorerSource.includes('text-[13px]'));
  assert.ok(fileExplorerSource.includes("borderColor: '#2B2B2B'"));
  assert.ok(fileExplorerSource.includes('fontFamily: \'Monaco, Menlo, "Courier New", monospace\''));
  assert.ok(fileExplorerSource.includes('borderBottom: \'8px solid transparent\''));
  assert.ok(fileExplorerSource.includes('borderTop: \'8px solid transparent\''));
  assert.ok(fileExplorerSource.includes('borderRight: \'8px solid #2B2B2B\''));
  assert.ok(fileExplorerSource.includes('borderRight: \'8px solid #181818\''));
  assert.ok(!fileExplorerSource.includes('shadow-[0_10px_24px_rgba(0,0,0,0.35)]'));
  assert.ok(fileExplorerSource.includes('zIndex: 20'));
  assert.ok(fileExplorerSource.includes('https://github.com/handsdiff'));
  assert.ok(fileExplorerSource.includes('https://x.com/handsdiff'));
  assert.ok(fileExplorerSource.includes('https://t.me/oogway_defi'));
  assert.ok(fileExplorerSource.includes('https://x.com/oogway_defi'));
  assert.ok(fileExplorerSource.includes('https://github.com/spiceoogway'));
  assert.ok(fileExplorerSource.includes('https://substack.com/@oogwaydefi'));
  assert.ok(fileExplorerSource.includes('https://x.com/aelix0x'));
  assert.ok(fileExplorerSource.includes('https://t.me/aelix1001'));
  assert.ok(fileExplorerSource.includes('https://github.com/alexjaniak'));
  assert.ok(fileExplorerSource.includes('const normalizedHref = socialFile.href.includes(\'open.spotify.com/\')'));
  assert.ok(fileExplorerSource.includes("normalizedHref.replace(/^https?:\\/\\//, '')"));
  assert.ok(fileExplorerSource.includes("socialFile.href.includes('open.spotify.com/')"));
  assert.ok(fileExplorerSource.includes("socialFile.href.replace(/^https?:\\/\\/open\\./, 'https://')"));
  assert.ok(fileExplorerSource.includes("{socialFile.label ?? normalizedHref.replace(/^https?:\\/\\//, '')}"));
  assert.ok(!fileExplorerSource.includes("'spotify.com...'"));
  assert.ok(!fileExplorerSource.includes("label: 'spotify.com...'"));
  assert.ok(fileExplorerSource.includes("import { useRef, useState, type Ref } from 'react';"));
  assert.ok(fileExplorerSource.includes('const [expandedFolders, setExpandedFolders] = useState({'));
  assert.ok(fileExplorerSource.includes('projects: true'));
  assert.ok(fileExplorerSource.includes("'slate-agent': true"));
  assert.ok(fileExplorerSource.includes('innies: false'));
  assert.ok(fileExplorerSource.includes('combinator: false'));
  assert.ok(fileExplorerSource.includes("'agent-meets': false"));
  assert.ok(fileExplorerSource.includes("'auto-biographer': true"));
  assert.ok(fileExplorerSource.includes("'old-builds': false"));
  assert.ok(fileExplorerSource.includes('moltmarkets: false'));
  assert.ok(fileExplorerSource.includes('links: true'));
  assert.ok(fileExplorerSource.includes('output: true'));
  assert.ok(fileExplorerSource.includes('socials: true'));
  assert.ok(fileExplorerSource.includes('personal: false'));
  assert.ok(fileExplorerSource.includes('friends: true'));
  assert.ok(fileExplorerSource.includes('hands: false'));
  assert.ok(fileExplorerSource.includes('oogway: false'));
  assert.ok(fileExplorerSource.includes('aelix: false'));
  assert.ok(fileExplorerSource.includes('const toggleFolder = (folderKey: ExpandableFolderKey) => {'));
  assert.match(fileExplorerSource, /<FolderRow\s+name="friends"\s+expanded=\{expandedFolders\.friends\}\s+onClick=\{\(\) => toggleFolder\('friends'\)\}\s+\/>/);
  assert.ok(fileExplorerSource.includes('type="button"'));
  assert.ok(fileExplorerSource.includes('aria-expanded={expanded}'));
  assert.ok(fileExplorerSource.includes('folderHref ? ('));
  assert.ok(fileExplorerSource.includes("icon: 'globe'"));
  assert.ok(fileExplorerSource.includes("icon: 'github'"));
  assert.ok(fileExplorerSource.includes("icon: 'x'"));
  assert.ok(fileExplorerSource.includes("icon: 'telegram'"));
  assert.ok(fileExplorerSource.includes("icon: 'substack'"));
  assert.ok(fileExplorerSource.includes("icon: 'goodreads'"));
  assert.ok(fileExplorerSource.includes("icon: 'soundcloud'"));
  assert.ok(fileExplorerSource.includes("icon: 'spotify'"));
  assert.ok(fileExplorerSource.includes('type ExplorerIconName ='));
  assert.ok(fileExplorerSource.includes('function ExplorerIcon({ icon }: { icon: ExplorerIconName }) {'));
  assert.ok(fileExplorerSource.includes("case 'github':"));
  assert.ok(fileExplorerSource.includes("case 'x':"));
  assert.ok(fileExplorerSource.includes("case 'telegram':"));
  assert.ok(fileExplorerSource.includes("case 'substack':"));
  assert.ok(fileExplorerSource.includes("case 'goodreads':"));
  assert.ok(fileExplorerSource.includes("case 'soundcloud':"));
  assert.ok(fileExplorerSource.includes("case 'spotify':"));
  assert.ok(fileExplorerSource.includes("const leafIconSlotClassName = 'mr-1 inline-flex h-4 w-4 shrink-0 items-center justify-center text-white';"));
  assert.ok(fileExplorerSource.includes('<ExplorerIcon icon={entry.icon} />'));
  assert.ok(fileExplorerSource.includes('socialFile.icon ? <ExplorerIcon icon={socialFile.icon} /> : <GlobeIcon />'));
  assert.ok(fileExplorerSource.includes('<span className={leafIconSlotClassName}>'));
  const githubIconSource = fileExplorerSource.slice(
    fileExplorerSource.indexOf('function GithubIcon() {'),
    fileExplorerSource.indexOf('function XIcon() {')
  );
  const globeIconSource = fileExplorerSource.slice(
    fileExplorerSource.indexOf('function GlobeIcon() {'),
    fileExplorerSource.indexOf('function GithubIcon() {')
  );
  const goodreadsIconSource = fileExplorerSource.slice(
    fileExplorerSource.indexOf('function GoodreadsIcon() {'),
    fileExplorerSource.indexOf('function SoundcloudIcon() {')
  );
  const soundcloudIconSource = fileExplorerSource.slice(
    fileExplorerSource.indexOf('function SoundcloudIcon() {'),
    fileExplorerSource.indexOf('function SpotifyIcon() {')
  );
  assert.ok(fileExplorerSource.includes("import { CiGlobe } from 'react-icons/ci';"));
  assert.ok(fileExplorerSource.includes("import { FaXTwitter } from 'react-icons/fa6';"));
  assert.ok(fileExplorerSource.includes("import { TbBrandTelegram } from 'react-icons/tb';"));
  assert.ok(fileExplorerSource.includes('<CiGlobe size={16} className={iconClassName} />'));
  assert.ok(fileExplorerSource.includes('<FaXTwitter size={12}'));
  assert.ok(fileExplorerSource.includes('<TbBrandTelegram size={13}'));
  assert.ok(githubIconSource.includes('width="14"'));
  assert.ok(githubIconSource.includes('height="14"'));
  assert.ok(githubIconSource.includes('viewBox="0 0 24 24"'));
  assert.ok(githubIconSource.includes('fill="none"'));
  assert.ok(githubIconSource.includes('stroke="currentColor"'));
  assert.ok(githubIconSource.includes('fillRule="evenodd"'));
  assert.ok(githubIconSource.includes('clipRule="evenodd"'));
  assert.ok(goodreadsIconSource.includes('viewBox="0 0 24 24"'));
  assert.ok(goodreadsIconSource.includes('width="14"'));
  assert.ok(goodreadsIconSource.includes('height="14"'));
  assert.ok(goodreadsIconSource.includes('fill="currentColor"'));
  assert.ok(!goodreadsIconSource.includes('<circle'));
  assert.ok(soundcloudIconSource.includes('width="17"'));
  assert.ok(soundcloudIconSource.includes('height="17"'));
  assert.ok(fileExplorerSource.includes('function GlobeIcon() {'));
  assert.ok(globeIconSource.includes('return <CiGlobe size={16} className={iconClassName} />;'));
  assert.ok(fileExplorerSource.includes('<circle cx="8" cy="8" r="5.25"'));
  assert.ok(fileExplorerSource.includes('inline-flex h-4 w-4 shrink-0 items-center justify-center text-white'));
  assert.ok(fileExplorerSource.includes('flex items-center py-1 cursor-pointer min-w-0'));
  assert.ok(fileExplorerSource.includes('text-white flex-1 min-w-0 truncate'));
  assert.ok(fileExplorerSource.includes('className="flex-1 min-w-0 truncate"'));
  assert.ok(fileExplorerSource.includes("indentClass = 'pl-9'"));
  assert.ok(fileExplorerSource.includes('cursor-pointer min-w-0 ${indentClass} text-gray-300'));
  assert.ok(fileExplorerSource.includes('indentClass="pl-14"'));
  assert.ok(fileExplorerSource.includes("event.currentTarget.style.backgroundColor = '#474748'"));
  assert.ok(fileExplorerSource.indexOf('name="auto-biographer"') < fileExplorerSource.indexOf('name="innies"'));
  assert.ok(fileExplorerSource.indexOf('name="auto-biographer"') < fileExplorerSource.indexOf('name="slate-agent"'));
  assert.ok(fileExplorerSource.indexOf('name="slate-agent"') < fileExplorerSource.indexOf('name="innies"'));
  assert.ok(fileExplorerSource.indexOf('name="innies"') < fileExplorerSource.indexOf('name="agentmeets"'));
  assert.ok(fileExplorerSource.indexOf('name="agentmeets"') < fileExplorerSource.indexOf('name="combinator"'));
  assert.ok(fileExplorerSource.indexOf('name="combinator"') < fileExplorerSource.indexOf('name="old-builds"'));
  assert.ok(fileExplorerSource.indexOf('combinator.trade') < fileExplorerSource.indexOf('combinator.git'));
  assert.ok(fileExplorerSource.indexOf('combinator.git') < fileExplorerSource.indexOf('programs.git'));
  assert.ok(fileExplorerSource.indexOf('auto-biographer.git') < fileExplorerSource.indexOf('ambient-memory-log.git'));
  assert.ok(fileExplorerSource.indexOf('ambient-memory-log.git') < fileExplorerSource.indexOf('x-team-capture.git'));
  assert.ok(fileExplorerSource.indexOf('x-team-capture.git') < fileExplorerSource.indexOf('slack-link-capture.git'));
  assert.ok(fileExplorerSource.indexOf('name="old-builds"') < fileExplorerSource.indexOf('name="moltmarkets"'));
  assert.ok(fileExplorerSource.indexOf('moltmarkets-api.git') < fileExplorerSource.indexOf('moltmarkets-agent-skill.git'));
  assert.ok(fileExplorerSource.indexOf('name="moltmarkets"') < fileExplorerSource.indexOf('{deprecatedEntries.map((entry) => ('));
  assert.ok(fileExplorerSource.indexOf('devscan.git') < fileExplorerSource.indexOf('gitpost.git'));
  assert.ok(fileExplorerSource.indexOf('gitpost.git') < fileExplorerSource.indexOf('launchontwitch.git'));
  assert.ok(!fileExplorerSource.includes('isFileHovered'));
  assert.ok(!fileExplorerSource.includes('Shirtless Founder projects and placeholder socials live in this explorer.'));
  assert.ok(!fileExplorerSource.includes('github.url'));
  assert.ok(!fileExplorerSource.includes('twitter.url'));
  assert.ok(!fileExplorerSource.includes('telegram.url'));
  assert.ok(!fileExplorerSource.includes('substack.url'));
  assert.ok(!fileExplorerSource.includes('goodreads.url'));
  assert.ok(!fileExplorerSource.includes('soundcloud.url'));
  assert.ok(!fileExplorerSource.includes('twitter.html'));
  assert.ok(!fileExplorerSource.includes('telegram.html'));
  assert.ok(!fileExplorerSource.includes('github.html'));
  assert.ok(!fileExplorerSource.includes('z-combinator'));
});

test('v2 header renders the landing, watch-me-work, and notes tabs with markdown labels', () => {
  const headerSource = readSource('src/components/vscodeV2/Header.tsx');
  const tabBarSource = readSource('src/components/vscodeV2/TabBar.tsx');

  assert.ok(headerSource.includes('TabBar'));
  assert.ok(headerSource.includes('activeTab'));
  assert.ok(headerSource.includes('onTabSelect'));
  assert.ok(tabBarSource.includes('landing-page.md'));
  assert.ok(tabBarSource.includes('watch-me-work.md'));
  assert.ok(tabBarSource.includes('leave-a-note.md'));
  assert.ok(tabBarSource.includes('const isActive = activeTab === tab;'));
  assert.ok(tabBarSource.includes('onTabSelect(tab)'));
  assert.ok(tabBarSource.indexOf('landing-page.md') < tabBarSource.indexOf('watch-me-work.md'));
  assert.ok(tabBarSource.indexOf('watch-me-work.md') < tabBarSource.indexOf('leave-a-note.md'));
  assert.ok(!tabBarSource.includes('notes.md'));
  assert.ok(!tabBarSource.includes('analytics.md'));
  assert.ok(!tabBarSource.includes('landing-page.zc'));
  assert.ok(!tabBarSource.includes('faq.zc'));
  assert.ok(!tabBarSource.includes('projects.zc'));
  assert.ok(!tabBarSource.includes('launch.zc'));
  assert.ok(!tabBarSource.includes('swap.zc'));
  assert.ok(!tabBarSource.includes('stake.zc'));
  assert.ok(!tabBarSource.includes('claim.zc'));
});

test('v2 footer removes the token CTA and social links while preserving the shell bar', () => {
  const footerSource = readSource('src/components/vscodeV2/Footer.tsx');

  assert.ok(footerSource.includes('function InniesEyeIcon() {'));
  assert.ok(footerSource.includes('aria-label="Innies eye logo"'));
  assert.ok(footerSource.includes('width="22"'));
  assert.ok(footerSource.includes('height="14"'));
  assert.ok(footerSource.includes('stroke="#0E0E0E"'));
  assert.ok(footerSource.includes('width: `${ACTIVITY_BAR_WIDTH}px`'));
  assert.ok(!footerSource.includes("import Image from 'next/image';"));
  assert.ok(!footerSource.includes('/images/innies-eye-logo-green-square.svg'));
  assert.ok(!footerSource.includes('function ShirtlessOutlineIcon() {'));
  assert.ok(!footerSource.includes('aria-label="Shirtless outline"'));
  assert.ok(!footerSource.includes('/vscode-v2/logos/z-logo-black.png'));
  assert.ok(!footerSource.includes('GVvPZpC6ymCoiHzYJ7CWZ8LhVn9tL2AUpRjSAsLh6jZC'));
  assert.ok(!footerSource.includes('https://docs.zcombinator.io'));
  assert.ok(!footerSource.includes('https://github.com/zcombinatorio/zcombinator'));
  assert.ok(!footerSource.includes('https://x.com/zcombinatorio'));
  assert.ok(!footerSource.includes('https://discord.gg/MQfcX9QM2r'));
});

test('v2 notes tab uses an integrated IDE-style editor with gated realtime updates', () => {
  const packageSource = readSource('package.json');
  const tabContentSource = readSource('src/components/vscodeV2/TabContent.tsx');
  const notesTabSource = readSource('src/components/vscodeV2/SharedNotesTab.tsx');
  const monacoNotesEditorSource = readSource('src/components/vscodeV2/MonacoSharedNotesEditor.tsx');

  assert.ok(packageSource.includes('@monaco-editor/react'));
  assert.ok(tabContentSource.includes("if (activeTab === 'leave-a-note.md')"));
  assert.ok(tabContentSource.includes('return <SharedNotesTab key={activeTab} />;'));

  // Notes backend now lives on innies-api.exe.xyz — the Vercel
  // /api/v2/notes{,/stream} routes and src/lib/v2Notes/* were removed.
  // SharedNotesTab must point at NEXT_PUBLIC_INNIES_API_BASE_URL + /v2/notes
  // for browser fetches / EventSource; Vercel serverless can't hold the
  // LISTEN/NOTIFY SSE stream open reliably.
  assert.equal(existsSync(fileUrl('src/app/api/v2/notes')), false, 'Next.js notes route should be removed');
  assert.equal(existsSync(fileUrl('src/lib/v2Notes')), false, 'Next.js notes lib should be removed');

  assert.ok(notesTabSource.includes("'use client';"));
  assert.ok(notesTabSource.includes("NEXT_PUBLIC_INNIES_API_BASE_URL"));
  assert.ok(notesTabSource.includes("sharedNotesBaseUrl('/v2/notes')"));
  assert.ok(notesTabSource.includes("sharedNotesBaseUrl('/v2/notes/stream')"));
  assert.ok(notesTabSource.includes("const [canConnectRealtime, setCanConnectRealtime] = useState(false);"));
  assert.ok(notesTabSource.includes('if (!canConnectRealtime) {'));
  assert.ok(notesTabSource.includes('setCanConnectRealtime(true);'));
  assert.ok(notesTabSource.includes('setCanConnectRealtime(false);'));
  assert.ok(notesTabSource.includes("import { MonacoSharedNotesEditor } from './MonacoSharedNotesEditor';"));
  assert.ok(notesTabSource.includes('<MonacoSharedNotesEditor'));
  assert.ok(!notesTabSource.includes('const textareaRef = useRef<HTMLTextAreaElement>(null);'));
  assert.ok(!notesTabSource.includes('function getLineStarts(content: string) {'));
  assert.ok(!notesTabSource.includes('function getCaretPosition('));
  assert.ok(!notesTabSource.includes('function getOffsetForPosition('));
  assert.ok(notesTabSource.includes('remote update available'));
  assert.ok(notesTabSource.includes('const hasPendingDraft = contentRef.current !== nextDocument.content;'));
  assert.ok(notesTabSource.includes('setContent(hasPendingDraft ? contentRef.current : nextDocument.content);'));
  assert.ok(notesTabSource.includes("setStatus(hasPendingDraft ? 'saving...' : 'saved');"));
  assert.ok(notesTabSource.includes('}, [canConnectRealtime]);'));
  assert.ok(monacoNotesEditorSource.includes("'use client';"));
  assert.ok(monacoNotesEditorSource.includes("from '@monaco-editor/react'"));
  assert.ok(monacoNotesEditorSource.includes('fallbackLineNumbers('));
  assert.ok(monacoNotesEditorSource.includes("wordWrap: 'on'"));
  assert.ok(monacoNotesEditorSource.includes('minimap: { enabled: false }'));
  assert.ok(monacoNotesEditorSource.includes('glyphMargin: false'));
  assert.ok(monacoNotesEditorSource.includes('folding: false'));
  assert.ok(monacoNotesEditorSource.includes("lineNumbers: 'off'"));
  assert.ok(monacoNotesEditorSource.includes('lineNumbersMinChars: 0'));
  assert.ok(monacoNotesEditorSource.includes('lineDecorationsWidth: 0'));
  assert.ok(monacoNotesEditorSource.includes('automaticLayout: true'));
  assert.ok(monacoNotesEditorSource.includes('scrollBeyondLastLine: false'));
  assert.ok(monacoNotesEditorSource.includes('const gutterTopOffset = 3;'));
  assert.ok(monacoNotesEditorSource.includes('top: gutterTopOffset'));
  assert.ok(monacoNotesEditorSource.includes('editor.getModel()?.getLineCount()'));
  assert.ok(monacoNotesEditorSource.includes('editor.getTopForLineNumber(lineNumber)'));
  assert.ok(monacoNotesEditorSource.includes('editor.onDidScrollChange'));
  assert.ok(monacoNotesEditorSource.includes('translateY(-${gutterScrollTop}px)'));
  assert.ok(monacoNotesEditorSource.includes('const editorContentInsetLeft = 16;'));
  assert.ok(monacoNotesEditorSource.includes('paddingLeft: `${editorContentInsetLeft}px`'));
  assert.ok(monacoNotesEditorSource.includes("const editorFontFamily = 'Monaco, Menlo, \"Courier New\", monospace';"));
  assert.ok(monacoNotesEditorSource.includes("path=\"file:///v2/leave-a-note.md\""));
  assert.ok(!notesTabSource.includes('placeholder="// shared scratchpad"'));
});

test('v2 notes tab flushes unsaved drafts on blur and page lifecycle transitions', () => {
  const notesTabSource = readSource('src/components/vscodeV2/SharedNotesTab.tsx');

  assert.ok(notesTabSource.includes('keepalive: true'));
  assert.ok(notesTabSource.includes("window.addEventListener('pagehide', handlePageHide);"));
  assert.ok(notesTabSource.includes("document.addEventListener('visibilitychange', handleVisibilityChange);"));
  assert.ok(notesTabSource.includes('void persistSharedNotesRef.current({ immediate: true, keepalive: true });'));
  assert.ok(notesTabSource.includes('void persistSharedNotesRef.current({ immediate: true });'));
});
