'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { WAREHOUSE_NAV } from '@/lib/warehouse/nav';
import { MAIN_SIDEBAR_COLLAPSED_W } from '@/lib/icTransfer/layoutConstants';

function resolveBasePath(currentSlug: string): string {
  return currentSlug === 'superadmin' ? '/warehouse' : `/${currentSlug}/warehouse`;
}

function isActive(pathname: string, href: string): boolean {
  if (href.endsWith('/warehouse') || href === '/warehouse') {
    return pathname === href || pathname.endsWith('/warehouse');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

const linkClass = (active: boolean) =>
  `relative flex w-full items-center rounded-xl py-2.5 pl-3 pr-3 text-left text-[13px] font-medium no-underline transition-[background-color,color,border-color] duration-300 ${
    active
      ? 'border-l-[3px] border-accent bg-gradient-to-r from-accent/[0.08] to-transparent font-semibold text-accent'
      : 'border-l-[3px] border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
  }`;

export default function WarehouseSecondarySidebar() {
  const { currentSlug, openWarehouseMainMenu, user } = useApp();
  const pathname = usePathname();
  const base = resolveBasePath(currentSlug);

  const items = useMemo(() => {
    if (user?.role?.startsWith('delivery')) {
      return WAREHOUSE_NAV.filter(item => item.id === 'dashboard' || item.id === 'order-settlement');
    }
    return WAREHOUSE_NAV.filter(item => item.id !== 'order-settlement');
  }, [user]);

  return (
    <aside
      className="fixed bottom-0 top-0 z-[95] hidden w-[220px] flex-col border-r border-slate-200/90 bg-white shadow-[4px_0_24px_-12px_rgba(15,23,42,0.12)] lg:flex xl:w-[240px]"
      style={{ left: `${MAIN_SIDEBAR_COLLAPSED_W}px` }}
      aria-label="Warehouse navigation"
    >
      <div className="flex min-h-[88px] shrink-0 items-center gap-2 border-b border-slate-100 px-3 py-4 xl:min-h-[96px] xl:px-4">
        <button
          type="button"
          onClick={openWarehouseMainMenu}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          aria-label="Back to main menu"
          title="Main menu"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Warehouse</p>
          <h2 className="mt-0.5 truncate text-sm font-bold leading-tight text-slate-900 xl:text-[15px]">Portal</h2>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain px-2.5 py-3">
        {items.map(item => {
          const href = item.path ? `${base}${item.path}` : base;
          const active = isActive(pathname, href);
          return (
            <Link key={item.id} href={href} className={linkClass(active)}>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
