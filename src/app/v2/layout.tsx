import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter, IBM_Plex_Mono, Roboto_Mono } from 'next/font/google';
import localFont from 'next/font/local';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter'
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-mono'
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-roboto-mono'
});

const rinter = localFont({
  src: '../../../public/percent-v2/fonts/Rinter.ttf',
  variable: '--font-rinter'
});

export const metadata: Metadata = {
  title: 'Percent | ZC',
  description: 'Trade decision markets'
};

export default function PercentV2Layout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${inter.variable} ${ibmPlexMono.variable} ${robotoMono.variable} ${rinter.variable} min-h-screen bg-[#0a0a0a] text-white font-sans antialiased`}
    >
      {children}
    </div>
  );
}
