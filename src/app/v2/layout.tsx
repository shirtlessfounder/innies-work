import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { VscodeShell } from '../../components/vscodeV2/VscodeShell';

export const metadata: Metadata = {
  title: 'Z Combinator',
  description: 'Fuel growth with token incentives'
};

export default function V2Layout({ children }: { children: ReactNode }) {
  return <VscodeShell>{children}</VscodeShell>;
}
