import './globals.css';
import type { Metadata } from 'next';
import { AppProvider } from '@/context/AppContext';
import AppLayout from '@/components/layout/AppLayout';

export const metadata: Metadata = {
  title: 'HEDGE — Capital Management Platform',
  description: 'Multi-branch capital allocation, fund transfers, daily financial reporting, and full money-flow traceability.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <AppLayout>{children}</AppLayout>
        </AppProvider>
      </body>
    </html>
  );
}
