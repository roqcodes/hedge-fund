'use client';

import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import type { BranchPageId } from '@/lib/branchPages';
import { canReadPage, canWritePage, getEffectivePageAccess } from '@/lib/rbac';

export function useRbac(pageId: BranchPageId) {
  const { user, branches, currentSlug } = useApp();

  const hiddenPages = useMemo(() => {
    if (!user?.branchId) {
      const branch = branches.find(b => b.slug === currentSlug);
      return branch?.hiddenPages;
    }
    return branches.find(b => b.id === user.branchId)?.hiddenPages;
  }, [user, branches, currentSlug]);

  return useMemo(
    () => ({
      canRead: canReadPage(user, pageId, hiddenPages),
      canWrite: canWritePage(user, pageId, hiddenPages),
      access: getEffectivePageAccess(user, pageId, hiddenPages),
      isReadOnly: canReadPage(user, pageId, hiddenPages) && !canWritePage(user, pageId, hiddenPages),
    }),
    [user, pageId, hiddenPages],
  );
}

export function useBranchHiddenPages() {
  const { user, branches, currentSlug } = useApp();
  return useMemo(() => {
    if (user?.branchId) {
      return branches.find(b => b.id === user.branchId)?.hiddenPages;
    }
    return branches.find(b => b.slug === currentSlug)?.hiddenPages;
  }, [user, branches, currentSlug]);
}
