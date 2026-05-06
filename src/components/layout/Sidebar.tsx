'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';

const navItems = [
  { id: 'dashboard', path: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
  { id: 'branches', path: '/branches', label: 'Branches', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { id: 'funds', path: '/funds', label: 'Fund Management', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
  { id: 'finance', path: '/finance', label: 'Finance', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
  { id: 'reports', path: '/reports', label: 'Reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'invoices', path: '/invoices', label: 'Invoices', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
];

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar, user } = useApp();
  const pathname = usePathname();

  const closeMobile = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches && sidebarOpen) {
      toggleSidebar();
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[90] bg-slate-950/50 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden ${
          sidebarOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={toggleSidebar}
        aria-hidden
      />
      <aside
        data-collapsed={sidebarOpen ? 'true' : 'false'}
        className={`fixed bottom-0 left-0 top-0 z-[100] flex w-[min(100vw-16px,280px)] max-w-[calc(100vw-8px)] flex-col bg-gradient-to-b from-slate-900 to-slate-800 text-white shadow-dropdown transition-[transform,width,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] max-lg:-translate-x-full lg:translate-x-0 ${
          sidebarOpen ? 'max-lg:translate-x-0 lg:w-[88px]' : 'lg:w-[280px]'
        }`}
      >
        <div className="flex items-center gap-3 px-4 py-4 sm:px-5 sm:py-5 lg:data-[collapsed=true]:justify-center lg:data-[collapsed=true]:px-2 lg:data-[collapsed=true]:py-6">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#D11439] to-[#f02852] text-base font-extrabold text-white shadow-primary transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:scale-[1.03] motion-safe:hover:shadow-primary-hover motion-safe:active:scale-[1.01] motion-safe:active:duration-150 sm:size-10 sm:text-lg">
            H
          </div>
          <div className="min-w-0 lg:data-[collapsed=true]:hidden">
            <h1 className="text-lg font-extrabold tracking-tight sm:text-xl">HEDGE</h1>
            <span className="mt-0.5 block text-[11px] font-medium text-slate-400">Capital Management</span>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2.5 sm:px-3 lg:data-[collapsed=true]:px-2">
          {navItems.map(item => {
            const isActive = pathname === item.path || (pathname === '/' && item.id === 'dashboard');
            return (
              <Link
                key={item.id}
                href={item.path}
                id={`nav-${item.id}`}
                onClick={closeMobile}
                className={`flex w-full items-center gap-3 rounded-xl py-2.5 pl-3 pr-3 text-left text-[13px] font-semibold no-underline transition-[transform,background,box-shadow,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] max-lg:active:scale-[0.99] max-lg:active:duration-150 lg:data-[collapsed=true]:justify-center lg:data-[collapsed=true]:px-2 sm:text-sm ${
                  isActive
                    ? 'bg-gradient-to-br from-[#D11439] to-[#f02852] text-white shadow-primary motion-safe:lg:translate-x-0'
                    : 'text-slate-400 motion-safe:hover:bg-white/[0.07] motion-safe:hover:text-white motion-safe:lg:hover:translate-x-1'
                }`}
              >
                <svg
                  className="size-[18px] shrink-0 sm:size-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d={item.icon} />
                </svg>
                <span className="nav-label truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="mx-2.5 mb-3 mt-auto rounded-xl border-t border-white/5 bg-black/10 p-3.5 lg:mx-3 lg:data-[collapsed=true]:hidden">
          {user && (
            <>
              <div className="mb-0.5 text-xs font-semibold text-white sm:text-[13px]">{user.name}</div>
              <div className="text-[11px] capitalize text-slate-400">{user.role.replace('_', ' ')}</div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
