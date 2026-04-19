import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { VscodeShell } from '../../components/vscodeV2/VscodeShell';
import { prefetchInniesLiveFeed } from '../../lib/inniesLive/fetchLiveFeed';

export const metadata: Metadata = {
  title: 'Z Combinator',
  description: 'Fuel growth with token incentives'
};

// Match the proxy route default so SSR prefetch and subsequent client polls
// agree on the window size.
const PREFETCH_WINDOW_HOURS = 12;

// Opt into dynamic rendering so the prefetch runs per request rather than
// being baked into a static bundle at build time.
export const dynamic = 'force-dynamic';

export default async function V2Layout({ children }: { children: ReactNode }) {
  const initialLiveFeed = await prefetchInniesLiveFeed(PREFETCH_WINDOW_HOURS);

  return <VscodeShell initialLiveFeed={initialLiveFeed}>{children}</VscodeShell>;
}
