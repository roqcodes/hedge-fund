'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { IC_TRANSFER_NAV } from '@/lib/icTransfer/nav';

function resolveBasePath(currentSlug: string): string {
  return currentSlug === 'superadmin' ? '/ic-transfer' : `/${currentSlug}/ic-transfer`;
}

function isActive(pathname: string, href: string): boolean {
  if (href.endsWith('/ic-transfer') || href === '/ic-transfer') {
    return pathname === href || pathname.endsWith('/ic-transfer');
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function ICTransferMobileNav() {
  const { currentSlug, openICTransferMainMenu, toggleSidebar, sidebarOpen } = useApp();
  const pathname = usePathname();
  const base = resolveBasePath(currentSlug);

  const primaryLinks = IC_TRANSFER_NAV.filter(item => !item.children).map(item => ({
    id: item.id,
    label: item.label,
    href: item.path ? `${base}${item.path}` : base,
  }));

  const settingsLinks =
    IC_TRANSFER_NAV.find(item => item.id === 'settings')?.children?.map(c => ({
      id: c.id,
      label: c.label.replace(' Management', ''),
      href: `${base}${c.path}`,
    })) ?? [];

  const links = [...primaryLinks, ...settingsLinks];

  const backToMainMenu = () => {
    openICTransferMainMenu();
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches && !sidebarOpen) {
      toggleSidebar();
    }
  };

  return (
    <div className="mb-4 lg:hidden">
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={backToMainMenu}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Main menu
        </button>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">IC Transfer menu</p>
      </div>
      <div className="-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-1">
        <div className="flex min-w-max gap-1.5">
          {links.map(link => (
            <Link
              key={link.id}
              href={link.href}
              className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold no-underline transition-colors ${
                isActive(pathname, link.href)
                  ? 'bg-accent text-white shadow-primary'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
