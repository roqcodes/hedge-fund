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
        className={`fixed inset-0 z-[90] bg-white/40 backdrop-blur-sm transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden ${
          sidebarOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={toggleSidebar}
        aria-hidden
      />
      <aside
        data-collapsed={sidebarOpen ? 'true' : 'false'}
        className={`fixed bottom-0 left-0 top-0 z-[100] flex w-[min(100vw-16px,240px)] max-w-[calc(100vw-8px)] flex-col border-r border-slate-200/90 bg-white shadow-dropdown transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] max-lg:-translate-x-[105%] lg:translate-x-0 ${
          sidebarOpen ? 'max-lg:translate-x-0 lg:w-[80px]' : 'lg:w-[240px]'
        }`}
      >
        <div className="flex flex-col items-center gap-2.5 px-4 py-8 sm:px-5 lg:data-[collapsed=true]:py-6">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-surface-xs ring-1 ring-slate-200/80 transition-transform duration-300 motion-safe:hover:scale-105 sm:size-16">
            <img src="/logo.png" alt="AIBAK Logo" className="size-10 object-contain sm:size-11" />
          </div>
          <div className="min-w-0 text-center lg:data-[collapsed=true]:hidden">
            <h1 className="text-xl font-black tracking-[0.05em] text-slate-900 sm:text-2xl">AIBAK</h1>
            <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">Capital Management</span>
          </div>
        </div>

        <div className="px-4 pb-2 lg:data-[collapsed=true]:hidden sm:px-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Main menu</p>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-2.5 pb-4 sm:px-3 lg:data-[collapsed=true]:px-2">
          {navItems.map(item => {
            const isActive = pathname === item.path || (pathname === '/' && item.id === 'dashboard');
            return (
              <Link
                key={item.id}
                href={item.path}
                id={`nav-${item.id}`}
                onClick={closeMobile}
                className={`relative flex w-full items-center gap-3 rounded-xl py-2.5 pl-3 pr-3 text-left text-[13px] font-medium no-underline transition-[background-color,color,transform,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] max-lg:active:scale-[0.99] lg:data-[collapsed=true]:justify-center lg:data-[collapsed=true]:px-2 sm:text-sm ${
                  isActive
                    ? 'border-l-[3px] border-accent bg-gradient-to-r from-accent/[0.08] to-transparent font-semibold text-accent lg:data-[collapsed=true]:border-l-0 lg:data-[collapsed=true]:bg-accent/12'
                    : 'border-l-[3px] border-transparent text-slate-600 motion-safe:hover:bg-slate-50 motion-safe:hover:text-slate-900 lg:data-[collapsed=true]:border-l-0'
                }`}
              >
                <svg
                  className={`size-[18px] shrink-0 sm:size-5 ${isActive ? 'text-accent' : 'text-slate-400'}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d={item.icon} />
                </svg>
                <span className="nav-label truncate lg:data-[collapsed=true]:sr-only">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mx-3 mb-4 mt-auto rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 shadow-surface-xs lg:mx-3 lg:data-[collapsed=true]:hidden">
          {user && (
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-bold text-accent shadow-surface-xs ring-1 ring-slate-200/80">
                {user.name
                  .split(' ')
                  .map(n => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-900">{user.name}</div>
                <div className="truncate text-[11px] font-medium capitalize text-slate-500">{user.role.replace('_', ' ')}</div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-auto hidden border-t border-slate-100 p-3 lg:flex">
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-slate-500 transition-[background-color,color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-slate-50 hover:text-slate-900 lg:data-[collapsed=true]:justify-center"
            title={sidebarOpen ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <div className={`flex size-5 shrink-0 items-center justify-center transition-transform duration-500 ${sidebarOpen ? 'rotate-180' : ''}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 17l-5-5 5-5m7 10l-5-5 5-5" />
              </svg>
            </div>
            <span className="truncate text-[13px] font-semibold lg:data-[collapsed=true]:sr-only">Collapse Menu</span>
          </button>
        </div>
      </aside>
    </>
  );
}
