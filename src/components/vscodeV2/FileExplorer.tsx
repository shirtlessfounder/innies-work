'use client';

import { CiGlobe } from 'react-icons/ci';
import { FaXTwitter } from 'react-icons/fa6';
import { TbBrandTelegram } from 'react-icons/tb';
import { useRef, useState, type Ref } from 'react';

type ExpandableFolderKey = 'projects' | 'auto-biographer' | 'slate-agent' | 'innies' | 'combinator' | 'agent-meets' | 'old-builds' | 'moltmarkets' | 'links' | 'output' | 'socials' | 'personal' | 'friends' | 'hands' | 'oogway' | 'aelix';
type ExplorerIconName = 'file' | 'globe' | 'github' | 'x' | 'telegram' | 'substack' | 'goodreads' | 'soundcloud' | 'spotify';

type ExplorerLink = {
  href: string;
  icon?: ExplorerIconName;
  label?: string;
  hoverNote?: string;
};

type ProjectEntry = ExplorerLink & {
  icon: ExplorerIconName;
  name: string;
};

type HoveredProjectEntry = {
  note: string;
  top: number;
};

type RowHoverHandler = (target: HTMLDivElement) => void;

type LinkFolder = {
  folderKey: Extract<ExpandableFolderKey, 'output' | 'socials' | 'personal'>;
  folderName: string;
  files: ExplorerLink[];
};

type FriendFolder = {
  folderKey: Extract<ExpandableFolderKey, 'hands' | 'oogway' | 'aelix'>;
  folderName: string;
  files: ExplorerLink[];
};

const repoHref = 'https://github.com/zcombinatorio/zcombinator';
const iconClassName = 'text-white';
const leafIconSlotClassName = 'mr-1 inline-flex h-4 w-4 shrink-0 items-center justify-center text-white';

function FolderChevron({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      className="mr-1 shrink-0"
      style={{
        transform: `rotate(${expanded ? '90deg' : '0deg'})`,
        transition: 'transform 0.1s'
      }}
    >
      <path d="M6 4L10 8L6 12" stroke="#C5C5C5" strokeWidth="1" fill="none" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className="mr-1 shrink-0">
      <path d="M1 2H6L7 3H15V14H1V2Z" fill="#C5C5C5" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className={iconClassName}>
      <rect x="3" y="2" width="10" height="12" stroke="currentColor" strokeWidth="1" fill="none" />
      <line x1="5" y1="5" x2="11" y2="5" stroke="currentColor" />
      <line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" />
      <line x1="5" y1="11" x2="9" y2="11" stroke="currentColor" />
    </svg>
  );
}

function GlobeIcon() {
  return <CiGlobe size={16} className={iconClassName} />;
}

function GithubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className={iconClassName}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.475 2 2 6.475 2 12C2 16.425 4.8625 20.1625 8.8375 21.4875C9.3375 21.575 9.525 21.275 9.525 21.0125C9.525 20.775 9.5125 19.9875 9.5125 19.15C7 19.6125 6.35 18.5375 6.15 17.975C6.0375 17.6875 5.55 16.8 5.125 16.5625C4.775 16.375 4.275 15.9125 5.1125 15.9C5.9 15.8875 6.4625 16.625 6.65 16.925C7.55 18.4375 8.9875 18.0125 9.5625 17.75C9.65 17.1 9.9125 16.6625 10.2 16.4125C7.975 16.1625 5.65 15.3 5.65 11.475C5.65 10.3875 6.0375 9.4875 6.675 8.7875C6.575 8.5375 6.225 7.5125 6.775 6.1375C6.775 6.1375 7.6125 5.875 9.525 7.1625C10.325 6.9375 11.175 6.825 12.025 6.825C12.875 6.825 13.725 6.9375 14.525 7.1625C16.4375 5.8625 17.275 6.1375 17.275 6.1375C17.825 7.5125 17.475 8.5375 17.375 8.7875C18.0125 9.4875 18.4 10.375 18.4 11.475C18.4 15.3125 16.0625 16.1625 13.8375 16.4125C14.2 16.725 14.5125 17.325 14.5125 18.2625C14.5125 19.6 14.5 20.675 14.5 21.0125C14.5 21.275 14.6875 21.5875 15.1875 21.4875C17.1727 20.8173 18.8977 19.5415 20.1198 17.8395C21.3419 16.1376 21.9995 14.0953 22 12C22 6.475 17.525 2 12 2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function XIcon() {
  return <FaXTwitter size={12} className={iconClassName} />;
}

function TelegramIcon() {
  return <TbBrandTelegram size={13} strokeWidth={1.6} className={iconClassName} />;
}

function SubstackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className={iconClassName}>
      <path d="M3 4H13" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M3 6H13" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M3 8H13" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M4 8V12.5H12V8" stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinejoin="round" />
    </svg>
  );
}

function GoodreadsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className={iconClassName}>
      <path
        d="M17.346.026c.422-.083.859.037 1.179.325.346.284.55.705.557 1.153-.023.457-.247.88-.612 1.156l-2.182 1.748a.601.601 0 0 0-.255.43.52.52 0 0 0 .11.424 5.886 5.886 0 0 1 .832 6.58c-1.394 2.79-4.503 3.99-7.501 2.927a.792.792 0 0 0-.499-.01c-.224.07-.303.18-.453.383l-.014.02-.941 1.254s-.792.985.457.935c3.027-.119 3.817-.119 5.439-.01 2.641.18 3.806 1.903 3.806 3.275 0 1.623-1.036 3.383-3.809 3.383a117.46 117.46 0 0 0-5.517-.03c-.31.005-.597.013-.835.02-.228.006-.41.011-.52.011-.712 0-1.648-.186-1.66-1.068-.008-.729.624-1.12 1.11-1.172.43-.045.815.007 1.24.064.252.034.518.07.815.088.185.011.366.025.552.038.53.038 1.102.08 1.926.087.427.005.759.01 1.025.015.695.012.941.016 1.28-.015 1.248-.112 1.832-.61 1.832-1.376 0-.805-.584-1.264-1.698-1.414-1.564-.213-2.33-.163-3.72-.074a87.66 87.66 0 0 1-1.669.095c-.608.029-2.449.026-2.682-1.492-.053-.416-.073-1.116.807-2.325l.75-1.003c.36-.49.582-.898.053-1.559 0 0-.39-.468-.52-.638-1.215-1.587-1.512-4.08-.448-6.114 1.577-3.011 5.4-4.26 8.37-2.581.253.143.438.203.655.163.201-.032.27-.167.363-.344.02-.04.042-.082.067-.126.004-.01.241-.465.535-1.028l.734-1.41a1.493 1.493 0 0 1 1.041-.785ZM9.193 13.243c1.854.903 3.912.208 5.254-2.47 1.352-2.699.827-5.11-1.041-6.023C10.918 3.537 8.81 5.831 8.017 7.41c-1.355 2.698-.717 4.886 1.147 5.818Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SoundcloudIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 16 16" className={iconClassName}>
      <path d="M3.5 10.8V7.8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M5 10.8V6.8" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M6.5 10.8V6.2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M8 10.8V6.4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M8 10.8H12C13.1 10.8 14 9.92 14 8.85C14 7.78 13.11 6.9 12.02 6.9C11.7 5.72 10.62 4.85 9.35 4.85C8.79 4.85 8.28 5.02 7.85 5.32" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SpotifyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className={iconClassName}>
      <circle cx="8" cy="8" r="5.25" stroke="currentColor" strokeWidth="1" fill="none" />
      <path d="M5.1 6.6C7 5.95 9.2 6.1 10.9 7" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M5.7 8.6C7.15 8.1 8.8 8.2 10.05 8.85" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M6.2 10.35C7.15 10.02 8.2 10.08 9.05 10.5" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function ExplorerIcon({ icon }: { icon: ExplorerIconName }) {
  switch (icon) {
    case 'file':
      return <FileIcon />;
    case 'github':
      return <GithubIcon />;
    case 'x':
      return <XIcon />;
    case 'telegram':
      return <TelegramIcon />;
    case 'substack':
      return <SubstackIcon />;
    case 'goodreads':
      return <GoodreadsIcon />;
    case 'soundcloud':
      return <SoundcloudIcon />;
    case 'spotify':
      return <SpotifyIcon />;
    case 'globe':
    default:
      return <GlobeIcon />;
  }
}

function FolderRow({
  expanded = false,
  folderHref,
  indentClass = '',
  marginClass = '',
  name,
  onClick,
  onHoverEnd,
  onHoverStart,
  rowRef
}: {
  expanded?: boolean;
  folderHref?: string;
  indentClass?: string;
  marginClass?: string;
  name: string;
  onClick?: () => void;
  onHoverEnd?: () => void;
  onHoverStart?: RowHoverHandler;
  rowRef?: Ref<HTMLDivElement>;
}) {
  const rowClassName = ['flex items-center py-1 cursor-pointer min-w-0', indentClass, marginClass]
    .filter(Boolean)
    .join(' ');

  const content = (
    <div
      ref={rowRef}
      className={rowClassName}
      style={{ transition: 'background-color 0.1s' }}
      onMouseEnter={(event) => {
        event.currentTarget.style.backgroundColor = '#474748';
        onHoverStart?.(event.currentTarget);
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.backgroundColor = 'transparent';
        onHoverEnd?.();
      }}
    >
      <FolderChevron expanded={expanded} />
      <FolderIcon />
      <span className="text-white flex-1 min-w-0 truncate">{name}</span>
    </div>
  );

  return folderHref ? (
    <a href={folderHref} target="_blank" rel="noopener noreferrer" className="block min-w-0">
      {content}
    </a>
  ) : (
    <button type="button" aria-expanded={expanded} onClick={onClick} className="block w-full min-w-0 text-left">
      {content}
    </button>
  );
}

function ProjectEntryRow({
  entry,
  indentClass = 'pl-9',
  onHoverEnd,
  onHoverStart,
  rowRef
}: {
  entry: ProjectEntry;
  indentClass?: string;
  onHoverEnd?: () => void;
  onHoverStart?: RowHoverHandler;
  rowRef?: Ref<HTMLDivElement>;
}) {
  return (
    <a href={entry.href} target="_blank" rel="noopener noreferrer" className="group relative block min-w-0">
      <div
        ref={rowRef}
        className={`flex items-center py-1 cursor-pointer min-w-0 ${indentClass} text-gray-300`}
        style={{ transition: 'background-color 0.1s' }}
        onMouseEnter={(event) => {
          event.currentTarget.style.backgroundColor = '#474748';
          onHoverStart?.(event.currentTarget);
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.backgroundColor = 'transparent';
          onHoverEnd?.();
        }}
      >
        <span className={leafIconSlotClassName}>
          <ExplorerIcon icon={entry.icon} />
        </span>
        <span className="flex-1 min-w-0 truncate">{entry.name}</span>
      </div>
    </a>
  );
}

function LinkFileRow({
  indentClass = 'pl-9',
  socialFile
}: {
  indentClass?: string;
  socialFile: ExplorerLink;
}) {
  const normalizedHref = socialFile.href.includes('open.spotify.com/')
    ? socialFile.href.replace(/^https?:\/\/open\./, 'https://')
    : socialFile.href;

  return (
    <a href={socialFile.href} target="_blank" rel="noopener noreferrer" className="block">
      <div
        className={`flex items-center py-1 cursor-pointer min-w-0 ${indentClass} text-gray-300`}
        style={{ transition: 'background-color 0.1s' }}
        onMouseEnter={(event) => {
          event.currentTarget.style.backgroundColor = '#474748';
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <span className={leafIconSlotClassName}>
          {socialFile.icon ? <ExplorerIcon icon={socialFile.icon} /> : <GlobeIcon />}
        </span>
        <span className="flex-1 min-w-0 truncate">{socialFile.label ?? normalizedHref.replace(/^https?:\/\//, '')}</span>
      </div>
    </a>
  );
}

export function FileExplorer() {
  const explorerViewportRef = useRef<HTMLDivElement>(null);
  const activeHermesTooltipNote = 'a proactive, digitally embodied hermes agent fork with access to in-network messaging';
  const inniesTooltipNote = 'pool tokens into one key for extended claude/codex capacity';
  const combinatorTooltipNote = 'multi-option futarchy infrastructure for your launchpad, project, or token';
  const agentMeetsTooltipNote = 'create DM chat room with invite links for any two agents';
  const moltmarketsTooltipNote = 'agent-only prediction markets';
  const autoBiographerEntries: ProjectEntry[] = [
    {
      href: 'https://github.com/shirtlessfounder/auto-biographer',
      icon: 'github',
      name: 'auto-biographer.git',
      hoverNote: 'an agent that follows what you\'re thinking, doing and shipping and posts about it'
    },
    {
      href: 'https://github.com/shirtlessfounder/ambient-memory-log',
      icon: 'github',
      name: 'ambient-memory-log.git',
      hoverNote: 'records, uploads, transcribes and labels all spoken words in an office setting as context for agents'
    },
    {
      href: 'https://github.com/shirtlessfounder/x-team-capture',
      icon: 'github',
      name: 'x-team-capture.git',
      hoverNote: 'scrapes specified team members\' x posts as context for agents'
    },
    {
      href: 'https://github.com/shirtlessfounder/slack-link-capture',
      icon: 'github',
      name: 'slack-link-capture.git',
      hoverNote: 'scrapes all links shared in a slack workspace as context for agents'
    }
  ];
  const projectEntries: ProjectEntry[] = [
    {
      href: 'https://innies.computer',
      icon: 'globe',
      name: 'innies.computer'
    },
    {
      href: 'https://github.com/shirtlessfounder/innies',
      icon: 'github',
      name: 'innies.git'
    }
  ];
  const activeclawHermesEntries: ProjectEntry[] = [
    {
      href: 'https://slate-sal.exe.xyz/hermes-provisioner/',
      icon: 'globe',
      name: 'slate-agent.com/launch'
    },
    {
      href: 'https://github.com/handsdiff/activeclaw',
      icon: 'github',
      name: 'slate-agent.git'
    }
  ];
  const agentMeetsEntries: ProjectEntry[] = [
    {
      href: 'https://innies.live',
      icon: 'globe',
      name: 'innies.live'
    },
    {
      href: 'https://github.com/alexjaniak/AgentMeets',
      icon: 'github',
      name: 'agentmeets.git'
    }
  ];
  const combinatorEntries: ProjectEntry[] = [
    {
      href: 'https://www.combinator.trade/',
      icon: 'globe',
      name: 'combinator.trade'
    },
    {
      href: 'https://github.com/zcombinatorio/combinator',
      icon: 'github',
      name: 'combinator.git'
    },
    {
      href: 'https://github.com/zcombinatorio/programs',
      icon: 'github',
      name: 'programs.git'
    }
  ];
  const deprecatedEntries: ProjectEntry[] = [
    {
      href: 'https://github.com/shirtlessfounder/devscan',
      icon: 'github',
      name: 'devscan.git',
      hoverNote: 'memecoin dev leaderboard and analytics dashboard'
    },
    {
      href: 'https://github.com/shirtlessfounder/gitpost',
      icon: 'github',
      name: 'gitpost.git',
      hoverNote: 'autoposts on x every time you commit and push code changes'
    },
    {
      href: 'https://github.com/shirtlessfounder/launchontwitch',
      icon: 'github',
      name: 'launchontwitch.git',
      hoverNote: 'launch a memecoin with a stream clip link directly from chat'
    },
    {
      href: 'https://github.com/zcombinatorio/ipa',
      icon: 'github',
      name: 'telegram-ipa.git',
      hoverNote: 'track memecoin mention confluence across the telegram group chats you\'ve joined'
    }
  ];
  const moltmarketsEntries: ProjectEntry[] = [
    {
      href: 'https://github.com/shirtlessfounder/moltmarkets-api',
      icon: 'github',
      name: 'moltmarkets-api.git'
    },
    {
      href: 'https://github.com/shirtlessfounder/moltmarkets-agent-skill',
      icon: 'github',
      name: 'moltmarkets-agent-skill.git'
    }
  ];
  const linkFolders: LinkFolder[] = [
    {
      folderKey: 'output',
      folderName: 'output',
      files: [{ href: 'https://github.com/shirtlessfounder', icon: 'github' }]
    },
    {
      folderKey: 'socials',
      folderName: 'socials',
      files: [
        { href: 'https://x.com/bicep_pump', icon: 'x' },
        { href: 'https://t.me/shirtlessfounder', icon: 'telegram' }
      ]
    },
    {
      folderKey: 'personal',
      folderName: 'personal',
      files: [
        { href: 'https://substack.com/@dylanvu', icon: 'substack' },
        { href: 'https://goodreads.com/dylanvu', icon: 'goodreads' },
        { href: 'https://soundcloud.com/shirtlessdj', icon: 'soundcloud' },
        { href: 'https://open.spotify.com/user/duydyvu', icon: 'spotify' }
      ]
    }
  ];
  const friendFolders: FriendFolder[] = [
    {
      folderKey: 'hands',
      folderName: 'hands',
      files: [
        { href: 'https://t.me/handsdiff', icon: 'telegram' },
        { href: 'https://github.com/handsdiff', icon: 'github' },
        { href: 'https://x.com/handsdiff', icon: 'x' }
      ]
    },
    {
      folderKey: 'oogway',
      folderName: 'oogway',
      files: [
        { href: 'https://t.me/oogway_defi', icon: 'telegram' },
        { href: 'https://x.com/oogway_defi', icon: 'x' },
        { href: 'https://github.com/spiceoogway', icon: 'github' },
        { href: 'https://substack.com/@oogwaydefi', icon: 'substack' }
      ]
    },
    {
      folderKey: 'aelix',
      folderName: 'aelix',
      files: [
        { href: 'https://x.com/aelix0x', icon: 'x' },
        { href: 'https://t.me/aelix1001', icon: 'telegram' },
        { href: 'https://github.com/alexjaniak', icon: 'github' }
      ]
    }
  ];
  const [expandedFolders, setExpandedFolders] = useState({
    projects: true,
    'auto-biographer': true,
    'slate-agent': true,
    innies: false,
    combinator: false,
    'agent-meets': false,
    'old-builds': false,
    moltmarkets: false,
    links: true,
    output: true,
    socials: true,
    personal: false,
    friends: true,
    hands: false,
    oogway: false,
    aelix: false
  });
  const [hoveredProjectEntry, setHoveredProjectEntry] = useState<HoveredProjectEntry | null>(null);

  const toggleFolder = (folderKey: ExpandableFolderKey) => {
    setExpandedFolders((currentState) => ({
      ...currentState,
      [folderKey]: !currentState[folderKey]
    }));
  };

  const clearHoveredProjectEntry = () => {
    setHoveredProjectEntry(null);
  };

  const setHoveredProjectEntryPosition = (note: string | undefined, target: HTMLDivElement | null) => {
    if (!note || !target) {
      setHoveredProjectEntry(null);
      return;
    }

    const containerRect = explorerViewportRef.current?.getBoundingClientRect();
    if (!containerRect) {
      return;
    }

    const entryRect = target.getBoundingClientRect();
    setHoveredProjectEntry({
      note,
      top: entryRect.top - containerRect.top + (entryRect.height / 2)
    });
  };

  const setActiveHermesTooltip = (target: HTMLDivElement) => {
    setHoveredProjectEntryPosition(activeHermesTooltipNote, target);
  };

  const setInniesTooltip = (target: HTMLDivElement) => {
    setHoveredProjectEntryPosition(inniesTooltipNote, target);
  };

  const setCombinatorTooltip = (target: HTMLDivElement) => {
    setHoveredProjectEntryPosition(combinatorTooltipNote, target);
  };

  const setAgentMeetsTooltip = (target: HTMLDivElement) => {
    setHoveredProjectEntryPosition(agentMeetsTooltipNote, target);
  };

  const setMoltmarketsTooltip = (target: HTMLDivElement) => {
    setHoveredProjectEntryPosition(moltmarketsTooltipNote, target);
  };

  return (
    <div
      ref={explorerViewportRef}
      className="relative min-w-0 flex-1 overflow-visible"
    >
      <div
        className="h-full overflow-x-hidden overflow-y-auto"
        onScroll={clearHoveredProjectEntry}
        style={{
          backgroundColor: '#181818',
          fontFamily: 'Monaco, Menlo, "Courier New", monospace',
          fontSize: '13px',
          paddingBottom: '28px'
        }}
      >
        <div className="px-3 py-2 text-xs text-gray-400 font-semibold tracking-wider">
          EXPLORER
        </div>

        <div className="px-2">
          <FolderRow
            name="projects"
            expanded={expandedFolders.projects}
            onClick={() => toggleFolder('projects')}
          />

          {expandedFolders.projects && (
            <div>
              <FolderRow
                name="auto-biographer"
                indentClass="pl-4"
                expanded={expandedFolders['auto-biographer']}
                onClick={() => toggleFolder('auto-biographer')}
              />

              {expandedFolders['auto-biographer'] && (
                <div>
                  {autoBiographerEntries.map((entry) => (
                    <ProjectEntryRow
                      key={entry.name}
                      entry={entry}
                      onHoverEnd={entry.hoverNote ? clearHoveredProjectEntry : undefined}
                      onHoverStart={entry.hoverNote ? (target) => setHoveredProjectEntryPosition(entry.hoverNote, target) : undefined}
                    />
                  ))}
                </div>
              )}

              <FolderRow
                name="slate-agent"
                indentClass="pl-4"
                marginClass="mt-1"
                expanded={expandedFolders['slate-agent']}
                onHoverEnd={clearHoveredProjectEntry}
                onHoverStart={setActiveHermesTooltip}
                onClick={() => toggleFolder('slate-agent')}
              />

              {expandedFolders['slate-agent'] && (
                <div>
                  {activeclawHermesEntries.map((entry) => (
                    <ProjectEntryRow
                      key={entry.name}
                      entry={entry}
                      onHoverEnd={clearHoveredProjectEntry}
                      onHoverStart={setActiveHermesTooltip}
                    />
                  ))}
                </div>
              )}

              <FolderRow
                name="innies"
                indentClass="pl-4"
                marginClass="mt-1"
                expanded={expandedFolders.innies}
                onHoverEnd={clearHoveredProjectEntry}
                onHoverStart={setInniesTooltip}
                onClick={() => toggleFolder('innies')}
              />

              {expandedFolders.innies && (
                <div>
                  {projectEntries.map((entry) => (
                    <ProjectEntryRow
                      key={entry.name}
                      entry={entry}
                      onHoverEnd={clearHoveredProjectEntry}
                      onHoverStart={setInniesTooltip}
                    />
                  ))}
                </div>
              )}

              <FolderRow
                name="agentmeets"
                indentClass="pl-4"
                marginClass="mt-1"
                expanded={expandedFolders['agent-meets']}
                onHoverEnd={clearHoveredProjectEntry}
                onHoverStart={setAgentMeetsTooltip}
                onClick={() => toggleFolder('agent-meets')}
              />

              {expandedFolders['agent-meets'] && (
                <div>
                  {agentMeetsEntries.map((entry) => (
                    <ProjectEntryRow
                      key={entry.name}
                      entry={entry}
                      onHoverEnd={clearHoveredProjectEntry}
                      onHoverStart={setAgentMeetsTooltip}
                    />
                  ))}
                </div>
              )}

              <FolderRow
                name="combinator"
                indentClass="pl-4"
                marginClass="mt-1"
                expanded={expandedFolders.combinator}
                onHoverEnd={clearHoveredProjectEntry}
                onHoverStart={setCombinatorTooltip}
                onClick={() => toggleFolder('combinator')}
              />

              {expandedFolders.combinator && (
                <div>
                  {combinatorEntries.map((entry) => (
                    <ProjectEntryRow
                      key={entry.name}
                      entry={entry}
                      onHoverEnd={clearHoveredProjectEntry}
                      onHoverStart={setCombinatorTooltip}
                    />
                  ))}
                </div>
              )}

              <FolderRow
                name="old-builds"
                indentClass="pl-4"
                marginClass="mt-1"
                expanded={expandedFolders['old-builds']}
                onClick={() => toggleFolder('old-builds')}
              />

              {expandedFolders['old-builds'] && (
                <div>
                  <FolderRow
                    name="moltmarkets"
                    indentClass="pl-9"
                    marginClass="mt-1"
                    expanded={expandedFolders.moltmarkets}
                    onHoverEnd={clearHoveredProjectEntry}
                    onHoverStart={setMoltmarketsTooltip}
                    onClick={() => toggleFolder('moltmarkets')}
                  />

                  {expandedFolders.moltmarkets && (
                    <div>
                      {moltmarketsEntries.map((entry) => (
                        <ProjectEntryRow
                          key={entry.name}
                          entry={entry}
                          indentClass="pl-14"
                          onHoverEnd={clearHoveredProjectEntry}
                          onHoverStart={setMoltmarketsTooltip}
                        />
                      ))}
                    </div>
                  )}

                  {deprecatedEntries.map((entry) => (
                    <ProjectEntryRow
                      key={entry.name}
                      entry={entry}
                      onHoverEnd={entry.hoverNote ? clearHoveredProjectEntry : undefined}
                      onHoverStart={entry.hoverNote ? (target) => setHoveredProjectEntryPosition(entry.hoverNote, target) : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-1">
            <FolderRow
              name="links"
              expanded={expandedFolders.links}
              onClick={() => toggleFolder('links')}
            />

            {expandedFolders.links && (
              <div>
                {linkFolders.map((folder) => (
                  <div key={folder.folderKey}>
                    <FolderRow
                      name={folder.folderName}
                      indentClass="pl-4"
                      marginClass="mt-1"
                      expanded={expandedFolders[folder.folderKey]}
                      onClick={() => toggleFolder(folder.folderKey)}
                    />

                    {expandedFolders[folder.folderKey] && (
                      <div>
                        {folder.files.map((socialFile) => (
                          <LinkFileRow key={socialFile.href} socialFile={socialFile} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-1">
            <FolderRow
              name="friends"
              expanded={expandedFolders.friends}
              onClick={() => toggleFolder('friends')}
            />

            {expandedFolders.friends && (
              <div>
                {friendFolders.map((folder) => (
                  <div key={folder.folderKey}>
                    <FolderRow
                      name={folder.folderName}
                      indentClass="pl-4"
                      marginClass="mt-1"
                      expanded={expandedFolders[folder.folderKey]}
                      onClick={() => toggleFolder(folder.folderKey)}
                    />

                    {expandedFolders[folder.folderKey] && (
                      <div>
                        {folder.files.map((socialFile) => (
                          <LinkFileRow key={socialFile.href} socialFile={socialFile} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {hoveredProjectEntry ? (
        <div
          className="pointer-events-none absolute rounded border px-3 py-2 text-[13px] leading-5 text-gray-300"
          style={{
            position: 'absolute',
            top: hoveredProjectEntry.top,
            left: 'calc(100% + 12px)',
            width: '220px',
            transform: 'translateY(-50%)',
            zIndex: 20,
            backgroundColor: '#181818',
            borderColor: '#2B2B2B',
            fontFamily: 'Monaco, Menlo, "Courier New", monospace'
          }}
        >
          <div
            aria-hidden="true"
            className="absolute left-0 top-1/2 h-0 w-0 -translate-x-full -translate-y-1/2"
            style={{
              borderBottom: '8px solid transparent',
              borderRight: '8px solid #2B2B2B',
              borderTop: '8px solid transparent'
            }}
          />
          <div
            aria-hidden="true"
            className="absolute left-0 top-1/2 h-0 w-0 -translate-x-[calc(100%-1px)] -translate-y-1/2"
            style={{
              borderBottom: '8px solid transparent',
              borderRight: '8px solid #181818',
              borderTop: '8px solid transparent'
            }}
          />
          {hoveredProjectEntry.note}
        </div>
      ) : null}
    </div>
  );
}
