'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { getPageIdFromBranchPathname, isBranchPageEnabled } from '@/lib/branchPages';
import { canReadPage, isBranchPortalRole, isCustomerRole } from '@/lib/rbac';

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
      if (!pageId || pageId !== 'ic-transfer' || !isBranchPageEnabled('ic-transfer', branch.hiddenPages)) {
        router.replace(customerHome);
      }
      return;
    }

    if (!pageId) return;

    const hiddenPages = branch.hiddenPages;
    if (!isBranchPageEnabled(pageId, hiddenPages)) {
      router.replace(`/${currentSlug}`);
      return;
    }

    if (user.role === 'staff' && !canReadPage(user, pageId, hiddenPages)) {
      router.replace(`/${currentSlug}`);
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
