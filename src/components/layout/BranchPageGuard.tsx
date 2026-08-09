'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { getPageIdFromBranchPathname, isBranchPageEnabled } from '@/lib/branchPages';
import { canReadPage, isBranchPortalRole, isCustomerRole, isInvestorRole } from '@/lib/rbac';

/** Redirects branch users away from disabled or unauthorized pages. */
export default function BranchPageGuard() {
  const { branches, user, currentSlug } = useApp();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!currentSlug || currentSlug === 'superadmin' || !user) return;
    if (!isBranchPortalRole(user.role)) return;

    const branch = user.branchId
      ? branches.find(b => b.id === user.branchId)
      : branches.find(b => b.slug === currentSlug);

    if (!branch) return;

    const pageId = getPageIdFromBranchPathname(pathname, currentSlug);

    if (isCustomerRole(user.role)) {
      const customerHome = `/${currentSlug}/ic-transfer`;
      const normalizedPath = pathname.replace(/\/$/, '');
      const normalizedHome = customerHome.replace(/\/$/, '');
      if (
        normalizedPath !== normalizedHome ||
        !isBranchPageEnabled('ic-transfer', branch.hiddenPages)
      ) {
        router.replace(customerHome);
      }
      return;
    }

    if (isInvestorRole(user.role)) {
      const investorHome = `/${currentSlug}/group`;
      const normalizedPath = pathname.replace(/\/$/, '');
      const normalizedHome = investorHome.replace(/\/$/, '');
      if (!normalizedPath.startsWith(normalizedHome)) {
        router.replace(investorHome);
      }
      return;
    }

    if (user.role === 'staff' && pathname.includes('/ic-transfer/')) {
      const portalBase = `/${currentSlug}/ic-transfer`;
      const normalizedPath = pathname.replace(/\/$/, '');
      const normalizedBase = portalBase.replace(/\/$/, '');
      if (normalizedPath !== normalizedBase && normalizedPath.startsWith(`${normalizedBase}/`)) {
        router.replace(portalBase);
        return;
      }
    }

    if (!pageId) return;

    const hiddenPages = branch.hiddenPages;
    const homePath = `/${currentSlug}`;
    const normalizedPath = pathname.replace(/\/$/, '') || '/';
    const normalizedHome = homePath.replace(/\/$/, '');

    if (!isBranchPageEnabled(pageId, hiddenPages)) {
      if (normalizedPath !== normalizedHome) {
        router.replace(homePath);
      }
      return;
    }

    if (user.role === 'staff' && !canReadPage(user, pageId, hiddenPages)) {
      if (normalizedPath !== normalizedHome) {
        router.replace(homePath);
      }
    }

    if (user.role.startsWith('delivery') && pageId !== 'warehouse') {
      router.replace(`/${currentSlug}/warehouse/order-settlement`);
    }

    if (user.role.startsWith('warehouse_') && pageId !== 'warehouse') {
      router.replace(`/${currentSlug}/warehouse`);
    }
  }, [pathname, currentSlug, branches, user, router]);

  return null;
}
