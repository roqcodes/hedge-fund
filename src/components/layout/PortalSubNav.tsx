'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { IC_TRANSFER_NAV } from '@/lib/icTransfer/nav';
import { WAREHOUSE_NAV } from '@/lib/warehouse/nav';

type NavLink = {
  id: string;
  label: string;
  href: string;
};

function resolveICTransferAdminBase(currentSlug: string): string {
  return currentSlug === 'superadmin' ? '/ic-transfer-admin' : `/${currentSlug}/ic-transfer-admin`;
}

function resolveWarehouseBase(currentSlug: string): string {
  return currentSlug === 'superadmin' ? '/warehouse' : `/${currentSlug}/warehouse`;
}

function isICTransferAdminActive(pathname: string, href: string): boolean {
  const normalizedPath = pathname.replace(/\/$/, '');
  const normalizedHref = href.replace(/\/$/, '');

  if (normalizedHref.endsWith('/ic-transfer-admin') || normalizedHref === '/ic-transfer-admin') {
    return normalizedPath === normalizedHref;
  }

  return normalizedPath === normalizedHref || normalizedPath.startsWith(`${normalizedHref}/`);
}

function isWarehouseActive(pathname: string, href: string): boolean {
  const normalizedPath = pathname.replace(/\/$/, '');
  const normalizedHref = href.replace(/\/$/, '');

  if (normalizedHref.endsWith('/warehouse') || normalizedHref === '/warehouse') {
    return normalizedPath === normalizedHref;
  }

  return normalizedPath === normalizedHref || normalizedPath.startsWith(`${normalizedHref}/`);
}

type SubNavVariant = 'default' | 'centered';

const defaultTabClass = (active: boolean) =>
  `whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold no-underline transition-colors sm:px-3.5 sm:text-[13px] ${
    active
      ? 'bg-accent text-white shadow-primary'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

const centeredTabClass = (active: boolean) =>
  `whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold no-underline transition-all duration-200 sm:px-4 sm:text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 focus-visible:ring-offset-1 ${
    active
      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/70'
      : 'text-slate-500 hover:text-slate-800'
  }`;

type SubNavBarProps = {
  label: string;
  links: NavLink[];
  isActive: (pathname: string, href: string) => boolean;
  variant?: SubNavVariant;
};

function SubNavBar({ label, links, isActive, variant = 'default' }: SubNavBarProps) {
  const pathname = usePathname();

  if (variant === 'centered') {
    return (
      <nav
        className="border-b border-slate-200/80 bg-white/95 backdrop-blur-xl"
        aria-label={`${label} navigation`}
      >
        <div className="mx-auto flex max-w-[1680px] justify-center px-4 py-2.5 sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-col items-center gap-2 sm:flex-row sm:gap-3">
            <p className="shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              {label}
            </p>
            <div className="h-4 w-px shrink-0 bg-slate-200 max-sm:hidden" aria-hidden />
            <div className="-mx-1 max-w-full overflow-x-auto overscroll-x-contain px-1 scrollbar-none">
              <div
                className="inline-flex min-w-max items-center gap-0.5 rounded-xl border border-slate-200/90 bg-slate-100/70 p-1"
                role="tablist"
              >
                {links.map(link => {
                  const active = isActive(pathname, link.href);
                  return (
                    <Link
                      key={link.id}
                      href={link.href}
                      role="tab"
                      aria-selected={active}
                      className={centeredTabClass(active)}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav
      className="border-b border-slate-200/80 bg-white/95 backdrop-blur-xl"
      aria-label={`${label} navigation`}
    >
      <div className="mx-auto flex max-w-[1680px] items-center gap-3 px-4 py-2 sm:px-6 lg:px-8">
        <p className="hidden shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 sm:block">
          {label}
        </p>
        <div className="-mx-1 min-w-0 flex-1 overflow-x-auto overscroll-x-contain px-1">
          <div className="flex min-w-max gap-1">
            {links.map(link => (
              <Link
                key={link.id}
                href={link.href}
                className={defaultTabClass(isActive(pathname, link.href))}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default function PortalSubNav() {
  const pathname = usePathname();
  const { currentSlug, user, isWarehouseRoute } = useApp();

  const icTransferAdminLinks = useMemo(() => {
    const base = resolveICTransferAdminBase(currentSlug);
    const primaryLinks = IC_TRANSFER_NAV.filter(item => !item.children).map(item => ({
      id: item.id,
      label: item.label,
      href: item.path ? `${base}${item.path}` : base,
    }));

    const settingsLinks =
      IC_TRANSFER_NAV.find(item => item.id === 'settings')?.children?.map(child => ({
        id: child.id,
        label: child.label.replace(' Management', ''),
        href: `${base}${child.path}`,
      })) ?? [];

    return [...primaryLinks, ...settingsLinks];
  }, [currentSlug]);

  const warehouseLinks = useMemo(() => {
    const base = resolveWarehouseBase(currentSlug);
    const items = user?.role?.startsWith('delivery')
      ? WAREHOUSE_NAV.filter(item => item.id === 'order-settlement')
      : WAREHOUSE_NAV.filter(item => item.id !== 'order-settlement');

    return items.map(item => ({
      id: item.id,
      label: item.label,
      href: item.path ? `${base}${item.path}` : base,
    }));
  }, [currentSlug, user]);

  const isDeliveryAgent = user?.role?.startsWith('delivery_');
  const isICTransferAdminRoute = pathname.includes('/ic-transfer-admin');

  const showWarehouseSubNav =
    isWarehouseRoute &&
    user?.role !== 'branch_manager' &&
    user?.role !== 'staff' &&
    !isDeliveryAgent;

  if (isICTransferAdminRoute && icTransferAdminLinks.length > 1) {
    return (
      <SubNavBar
        label="IC Transfer (Admin)"
        links={icTransferAdminLinks}
        isActive={isICTransferAdminActive}
      />
    );
  }

  if (showWarehouseSubNav && warehouseLinks.length > 1) {
    return (
      <SubNavBar
        label="Warehouse"
        links={warehouseLinks}
        isActive={isWarehouseActive}
        variant="centered"
      />
    );
  }

  return null;
}
