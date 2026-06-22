'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { getPageIdFromBranchPathname, isBranchPageEnabled } from '@/lib/branchPages';

/** Redirects branch users away from pages hidden by superadmin. */
export default function BranchPageGuard() {
  const { branches, user, currentSlug } = useApp();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!currentSlug || currentSlug === 'superadmin') return;

    const branch =
      user?.role === 'branch_manager'
        ? branches.find(b => b.id === user.branchId)
        : branches.find(b => b.slug === currentSlug);

    if (!branch) return;

    const pageId = getPageIdFromBranchPathname(pathname, currentSlug);
    if (!pageId || isBranchPageEnabled(pageId, branch.hiddenPages)) return;

    router.replace(`/${currentSlug}`);
  }, [pathname, currentSlug, branches, user, router]);

  return null;
}
