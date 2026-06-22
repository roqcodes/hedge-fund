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
  const { currentSlug } = useApp();
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

  return (
    <div className="mb-4 lg:hidden">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">IC Transfer menu</p>
      <div className="-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-1">
        <div className="flex min-w-max gap-1.5">
          {links.map(link => (
            <Link
              key={link.id}
              href={link.href}
              className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold no-underline transition-colors ${
                isActive(pathname, link.href)
                  ? 'bg-accent text-white shadow-primary'
                  : 'border border-slate-200 bg-white text-slate-600'
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
