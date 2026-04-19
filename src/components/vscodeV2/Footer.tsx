'use client';

import { ACTIVITY_BAR_WIDTH } from './ActivityBar';

function InniesEyeIcon() {
  return (
    <svg
      width="22"
      height="14"
      viewBox="2 5 20 14"
      role="img"
      aria-label="Innies eye logo"
      style={{ display: 'block' }}
    >
      <path
        d="M10 12a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"
        fill="none"
        stroke="#0E0E0E"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6"
        fill="none"
        stroke="#0E0E0E"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Footer() {
  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-20 flex items-center"
      style={{
        height: '28px',
        backgroundColor: '#0E0E0E'
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          backgroundColor: '#FFFFFF',
          height: '28px',
          width: `${ACTIVITY_BAR_WIDTH}px`
        }}
      >
        <InniesEyeIcon />
      </div>
    </footer>
  );
}
