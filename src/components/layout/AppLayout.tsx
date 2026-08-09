'use client';
import React from 'react';
import { useApp } from '@/context/AppContext';
import LoginPage from '@/components/auth/LoginPage';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import PortalSubNav from '@/components/layout/PortalSubNav';
import BranchPageGuard from '@/components/layout/BranchPageGuard';
import { RbacWriteProvider } from '@/context/RbacWriteContext';
import { usePathname } from 'next/navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const {
    isAuthenticated,
    isInitialLoading,
    toasts,
    sidebarCollapsed,
    hideMainSidebar,
  } = useApp();
  const pathname = usePathname();

  if (isInitialLoading) return null;
  if (!isAuthenticated) {
    const slug = pathname === '/' ? undefined : pathname.split('/')[1];
    return <LoginPage branchSlug={slug} />;
  }

  const contentMargin = hideMainSidebar
    ? 'lg:ml-0'
    : sidebarCollapsed
      ? 'lg:ml-[80px]'
      : 'lg:ml-[240px]';

  return (
    <div className="flex min-h-dvh">
      <BranchPageGuard />
      {!hideMainSidebar && <Sidebar />}
      <div
        className={`flex min-w-0 flex-1 flex-col transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] max-lg:ml-0 ${contentMargin}`}
      >
        <div className="sticky top-0 z-50 shrink-0">
          <Topbar />
          <PortalSubNav />
        </div>
        <main className="mx-auto w-full max-w-[1680px] flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7">
          <RbacWriteProvider>
            {children}
          </RbacWriteProvider>
        </main>
      </div>
      <div
        className="pointer-events-none fixed bottom-4 left-4 right-4 z-[500] flex flex-col gap-3 sm:left-auto sm:right-6 sm:max-w-sm"
        aria-live="polite"
      >
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex animate-[toast-in_0.4s_cubic-bezier(0.34,1.56,0.64,1)] items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold text-white shadow-dropdown ${
              t.type === 'success'
                ? 'border-l-4 border-emerald-500 bg-emerald-950'
                : 'border-l-4 border-red-500 bg-red-950'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
