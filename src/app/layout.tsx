import './globals.css';
import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import { AppProvider } from '@/context/AppContext';
import AppLayout from '@/components/layout/AppLayout';
import Providers from '@/components/Providers';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AIBAK — Capital Management Platform',
  description:
    'Multi-branch capital allocation, fund transfers, daily financial reporting, and full money-flow traceability.',
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="font-sans">
        <Providers>
          <AppProvider>
            <AppLayout>{children}</AppLayout>
          </AppProvider>
        </Providers>
      </body>
    </html>
  );
}
