import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Percent | ZC',
  description: 'Trade decision markets'
};

export default function PercentV2Layout({ children }: { children: ReactNode }) {
  return children;
}
