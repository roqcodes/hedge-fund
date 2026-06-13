'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';

const navItems: {
  id: string;
  path: string;
  label: string;
  icon: string;
}[] = [
    { id: 'dashboard', path: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4' },
    { id: 'deals', path: '/group', label: 'Group & Deals', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { id: 'funds', path: '/funds', label: 'Transaction', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
    { id: 'ic-transfer', path: '/ic-transfer', label: 'IC Transfer & Reverse', icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
    { id: 'finance', path: '/finance', label: 'Finance - Reports', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
    { id: 'physical', path: '/physical', label: 'Physical', icon: 'M9 6h6l2 2H7z M7 8h10v2H7z M3 14h6l2 2H1z M1 16h10v2H1z M15 14h6l2 2h-10z M13 16h10v2h-10z' },
    { id: 'investors', path: '/investors', label: 'Investors', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8m12 4v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
    { id: 'usdt', path: '/usdt', label: 'USDT', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z' },
    { id: 'settings', path: '/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37-2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
    { id: 'branches', path: '/branches', label: 'Branches', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { id: 'users', path: '/users', label: 'Users & Roles', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'reports', path: '/reports', label: 'Report', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  ];

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar, user, branches, logout, currentSlug } = useApp();
  const pathname = usePathname();

  const isBranchUser = user?.role === 'branch_manager';
  const branch = isBranchUser ? branches.find((b: any) => b.id === user?.branchId) : (currentSlug !== 'superadmin' ? branches.find((b: any) => b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === currentSlug) : null);

  // Use currentSlug from context if it's not superadmin, this ensures superadmin stays in branch context when clicking links
  const activeSlug = currentSlug === 'superadmin' ? '' : currentSlug;
  const basePath = activeSlug ? `/${activeSlug}` : '';

  const closeMobile = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches && sidebarOpen) {
      toggleSidebar();
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[90] bg-white/40 backdrop-blur-sm transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:hidden ${sidebarOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
          }`}
        onClick={toggleSidebar}
        aria-hidden
      />
      <aside
        data-collapsed={sidebarOpen ? 'true' : 'false'}
        className={`fixed bottom-0 left-0 top-0 z-[100] flex w-[min(100vw-16px,240px)] max-w-[calc(100vw-8px)] flex-col border-r border-slate-200/90 bg-white shadow-dropdown transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] max-lg:-translate-x-[105%] lg:translate-x-0 ${sidebarOpen ? 'max-lg:translate-x-0 lg:w-[80px]' : 'lg:w-[240px]'
          }`}
      >
        <div className="flex flex-col items-center gap-2.5 px-4 py-8 sm:px-5 lg:data-[collapsed=true]:py-6">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-surface-xs ring-1 ring-slate-200/80 transition-transform duration-300 motion-safe:hover:scale-105 sm:size-16">
            <img src="/logo.png" alt="AIBAK Logo" className="size-10 object-contain sm:size-11" />
          </div>
          <div className="min-w-0 text-center lg:data-[collapsed=true]:hidden">
            <h1 className="text-xl font-black tracking-[0.05em] text-slate-900 sm:text-2xl uppercase">
              {isBranchUser && branch ? branch.name : 'AIBAK'}
            </h1>
            <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
              {isBranchUser ? 'Branch Portal' : 'Capital Management'}
            </span>
          </div>
        </div>

        <div className="px-4 pb-2 lg:data-[collapsed=true]:hidden sm:px-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Main menu</p>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-2.5 pb-4 sm:px-3 lg:data-[collapsed=true]:px-2">
          {navItems
            .filter(item => {
              if (currentSlug && currentSlug !== 'superadmin') {
                // Branch portal exact items
                return ['dashboard', 'deals', 'funds', 'ic-transfer', 'finance', 'physical', 'investors', 'usdt', 'settings'].includes(item.id);
              } else {
                // Superadmin portal exact items
                return ['dashboard', 'deals', 'funds', 'branches', 'finance', 'physical', 'investors', 'usdt', 'settings'].includes(item.id);
              }
            })
            .sort((a, b) => {
              // Enforce the requested order
              if (currentSlug && currentSlug !== 'superadmin') {
                const order = ['dashboard', 'deals', 'funds', 'ic-transfer', 'finance', 'physical', 'investors', 'usdt', 'settings'];
                return order.indexOf(a.id) - order.indexOf(b.id);
              } else {
                const order = ['dashboard', 'deals', 'funds', 'branches', 'finance', 'physical', 'investors', 'usdt', 'settings'];
                return order.indexOf(a.id) - order.indexOf(b.id);
              }
            })
            .map(item => {
              const itemHref = item.id === 'dashboard' ? (basePath || '/') : `${basePath}${item.path}`;
              const isActive = pathname === itemHref || (item.id === 'dashboard' && pathname === basePath) || (pathname === '/' && item.id === 'dashboard' && !basePath);
              return (
                <Link
                  key={item.id}
                  href={itemHref}
                  id={`nav-${item.id}`}
                  onClick={closeMobile}
                  className={`relative flex w-full items-center gap-3 rounded-xl py-2.5 pl-3 pr-3 text-left text-[13px] font-medium no-underline transition-[background-color,color,transform,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] max-lg:active:scale-[0.99] lg:data-[collapsed=true]:justify-center lg:data-[collapsed=true]:px-2 sm:text-sm ${isActive
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

        {/* Mobile Sign Out Button */}
        <div className="mt-auto border-t border-slate-100 p-4 lg:hidden">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl py-2.5 pl-3 pr-3 text-left text-[13px] font-semibold text-red-600 transition-colors hover:bg-red-50 max-lg:active:scale-[0.99] sm:text-sm"
            onClick={() => {
              closeMobile();
              logout();
            }}
          >
            <svg
              className="size-[18px] shrink-0 sm:size-5 text-red-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.85"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            <span className="truncate">Sign Out</span>
          </button>
        </div>

      </aside>
    </>
  );
}
