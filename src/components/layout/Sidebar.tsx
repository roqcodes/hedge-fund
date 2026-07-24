'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import AppLogo from '@/components/layout/AppLogo';
import { isBranchPortalRole } from '@/lib/rbac';
import { getVisibleMainNavItems, resolveMainNavItemHref } from '@/lib/navigation/mainNav';

export default function Sidebar() {
  const {
    sidebarOpen,
    sidebarCollapsed,
    toggleSidebar,
    user,
    branches,
    logout,
    currentSlug,
    hideMainSidebar,
  } = useApp();
  const pathname = usePathname();
  const [hovered, setHovered] = useState(false);

  const handleMouseEnter = useCallback(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
      setHovered(true);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHovered(false);
  }, []);

  if (hideMainSidebar) return null;

  const effectivelyCollapsed = sidebarCollapsed ? !hovered : false;

  const isBranchUser = user ? isBranchPortalRole(user.role) : false;
  const branch = isBranchUser && user?.branchId
    ? branches.find((b) => b.id === user.branchId)
    : currentSlug !== 'superadmin'
      ? branches.find((b) => b.slug === currentSlug)
      : null;

  const activeSlug = currentSlug === 'superadmin' ? '' : currentSlug;
  const basePath = activeSlug ? `/${activeSlug}` : '';

  const visibleItems = getVisibleMainNavItems({ currentSlug, user, branch });

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
        data-collapsed={effectivelyCollapsed ? 'true' : 'false'}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`fixed bottom-0 left-0 top-0 z-[100] flex w-[min(100vw-16px,240px)] max-w-[calc(100vw-8px)] flex-col border-r border-slate-200/90 bg-white shadow-dropdown transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:translate-x-0 ${sidebarOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-[105%]'} ${effectivelyCollapsed ? 'lg:w-[80px]' : 'lg:w-[240px]'}`}
      >
        <AppLogo collapsed={effectivelyCollapsed} />

        <div className="px-4 pb-2 lg:data-[collapsed=true]:hidden sm:px-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Main menu</p>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-2.5 pb-4 sm:px-3 lg:data-[collapsed=true]:px-2">
          {visibleItems.map(item => {
            const itemHref = resolveMainNavItemHref(item, currentSlug, user);
            const isActive =
              item.id === 'ic-transfer-admin'
                ? pathname.includes('/ic-transfer-admin')
                : item.id === 'ic-transfer'
                  ? pathname.includes('/ic-transfer') && !pathname.includes('/ic-transfer-admin')
                  : item.id === 'warehouse'
                    ? pathname.includes('/warehouse') && !pathname.includes('/ic-transfer')
                    : pathname === itemHref ||
                    (item.id === 'dashboard' && pathname === basePath) ||
                    (pathname === '/' && item.id === 'dashboard' && !basePath);
            return (
              <Link
                key={item.id}
                href={itemHref}
                id={`nav-${item.id}`}
                title={item.label}
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
