'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { IC_TRANSFER_NAV } from '@/lib/icTransfer/nav';
import { MAIN_SIDEBAR_COLLAPSED_W } from '@/lib/icTransfer/layoutConstants';

function resolveBasePath(currentSlug: string): string {
  return currentSlug === 'superadmin' ? '/ic-transfer' : `/${currentSlug}/ic-transfer`;
}

function isActive(pathname: string, href: string): boolean {
  if (href.endsWith('/ic-transfer') || href === '/ic-transfer') {
    return pathname === href || pathname.endsWith('/ic-transfer');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

const linkClass = (active: boolean) =>
  `relative flex w-full items-center rounded-xl py-2.5 pl-3 pr-3 text-left text-[13px] font-medium no-underline transition-[background-color,color,border-color] duration-300 ${
    active
      ? 'border-l-[3px] border-accent bg-gradient-to-r from-accent/[0.08] to-transparent font-semibold text-accent'
      : 'border-l-[3px] border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
  }`;

export default function ICTransferSecondarySidebar() {
  const { currentSlug } = useApp();
  const pathname = usePathname();
  const base = resolveBasePath(currentSlug);
  const [settingsOpen, setSettingsOpen] = useState(() => pathname.includes('/ic-transfer/settings'));

  const items = useMemo(() => IC_TRANSFER_NAV, []);

  return (
    <aside
      className="fixed bottom-0 top-0 z-[95] hidden w-[220px] flex-col border-r border-slate-200/90 bg-white shadow-[4px_0_24px_-12px_rgba(15,23,42,0.12)] lg:flex xl:w-[240px]"
      style={{ left: `${MAIN_SIDEBAR_COLLAPSED_W}px` }}
      aria-label="IC Transfer navigation"
    >
      <div className="flex min-h-[88px] shrink-0 flex-col justify-center border-b border-slate-100 px-4 py-4 xl:min-h-[96px] xl:px-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">IC Transfer</p>
        <h2 className="mt-0.5 text-sm font-bold leading-tight text-slate-900 xl:text-[15px]">& Reverse</h2>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain px-2.5 py-3">
        {items.map(item => {
          if (item.children) {
            const anyChildActive = item.children.some(c => isActive(pathname, `${base}${c.path}`));
            return (
              <div key={item.id} className="mb-0.5">
                <button
                  type="button"
                  onClick={() => setSettingsOpen(v => !v)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold transition-colors ${
                    anyChildActive ? 'bg-accent/10 text-accent' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <span>{item.label}</span>
                  <svg
                    className={`size-4 shrink-0 transition-transform ${settingsOpen ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>
                {settingsOpen && (
                  <div className="ml-2 mt-0.5 space-y-0.5 border-l-2 border-slate-100 pl-2">
                    {item.children.map(child => {
                      const href = `${base}${child.path}`;
                      const active = isActive(pathname, href);
                      return (
                        <Link
                          key={child.id}
                          href={href}
                          className={`flex items-center gap-2 rounded-lg py-2 pl-2 pr-2 text-[12px] font-medium no-underline transition-colors ${
                            active ? 'font-semibold text-accent' : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          <span className={`size-1.5 shrink-0 rounded-sm ${active ? 'bg-accent' : 'bg-slate-300'}`} />
                          <span className="truncate">{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

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
