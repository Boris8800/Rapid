import './globals.css';
import type { Metadata } from 'next';
import { Providers } from './providers';
import { Inter, Source_Serif_4 } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });
const sourceSerif = Source_Serif_4({ subsets: ['latin'], display: 'swap', variable: '--font-display' });

export const metadata: Metadata = {
  title: 'Rapid Roads',
  description: 'Rapid Roads Taxi System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=optional"
        />
      </head>
      <body
        className={`${inter.variable} ${sourceSerif.variable} bg-background-light dark:bg-background-dark text-slate-900 dark:text-white min-h-screen`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
