'use client';

import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { getPageIdFromBranchPathname } from '@/lib/branchPages';
import type { BranchPageId } from '@/lib/branchPages';
import {
  READ_ONLY_ACCESS_MESSAGE,
  canReadPage,
  canWritePage,
  isCustomerRole,
  isInvestorRole,
} from '@/lib/rbac';

type WriteButtonExtra = {
  disabled?: boolean;
  title?: string;
};

type RbacWriteContextValue = {
  pageId: BranchPageId | null;
  canWrite: boolean;
  isReadOnly: boolean;
  writeBlockedReason: string;
  buttonProps: (extra?: WriteButtonExtra) => {
    disabled?: boolean;
    title?: string;
    'aria-disabled'?: boolean;
  };
};

const RbacWriteContext = createContext<RbacWriteContextValue>({
  pageId: null,
  canWrite: true,
  isReadOnly: false,
  writeBlockedReason: READ_ONLY_ACCESS_MESSAGE,
  buttonProps: () => ({}),
});

export function RbacWriteProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, branches, currentSlug } = useApp();

  const hiddenPages = useMemo(() => {
    if (user?.branchId) {
      return branches.find(b => b.id === user.branchId)?.hiddenPages;
    }
    if (currentSlug && currentSlug !== 'superadmin') {
      return branches.find(b => b.slug === currentSlug)?.hiddenPages;
    }
    return undefined;
  }, [user, branches, currentSlug]);

  const pageId = useMemo(() => {
    if (!currentSlug || currentSlug === 'superadmin') return null;
    return getPageIdFromBranchPathname(pathname, currentSlug);
  }, [pathname, currentSlug]);

  const canWrite = useMemo(() => {
    if (!user) return true;
    if (isInvestorRole(user.role) || isCustomerRole(user.role)) return false;
    if (user.role !== 'staff') return true;
    if (!pageId) return true;
    return canWritePage(user, pageId, hiddenPages);
  }, [user, pageId, hiddenPages]);

  const isReadOnly = useMemo(() => {
    if (!user || !pageId) return false;
    if (isInvestorRole(user.role) || isCustomerRole(user.role)) return true;
    if (user.role !== 'staff') return false;
    return canReadPage(user, pageId, hiddenPages) && !canWritePage(user, pageId, hiddenPages);
  }, [user, pageId, hiddenPages]);

  const buttonProps = useCallback(
    (extra?: WriteButtonExtra) => {
      const blocked = !canWrite;
      return {
        disabled: blocked || extra?.disabled,
        title: blocked ? READ_ONLY_ACCESS_MESSAGE : extra?.title,
        'aria-disabled': blocked || extra?.disabled,
      };
    },
    [canWrite],
  );

  const value = useMemo(
    () => ({
      pageId,
      canWrite,
      isReadOnly,
      writeBlockedReason: READ_ONLY_ACCESS_MESSAGE,
      buttonProps,
    }),
    [pageId, canWrite, isReadOnly, buttonProps],
  );

  return <RbacWriteContext.Provider value={value}>{children}</RbacWriteContext.Provider>;
}

export function useWriteAccess() {
  return useContext(RbacWriteContext);
}
