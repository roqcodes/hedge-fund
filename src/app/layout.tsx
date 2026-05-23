import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Outfit } from 'next/font/google';
import { AppProvider } from '@/context/AppContext';
import AppLayout from '@/components/layout/AppLayout';
import ServiceWorkerRegister from '@/components/pwa/ServiceWorkerRegister';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#000000',
};

export const metadata: Metadata = {
  title: 'AIBAK — Capital Management Platform',
  description:
    'Multi-branch capital allocation, fund transfers, daily financial reporting, and full money-flow traceability.',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="font-sans">
        <ServiceWorkerRegister />
        <AppProvider>
          <AppLayout>{children}</AppLayout>
        </AppProvider>
      </body>
    </html>
  );
}
