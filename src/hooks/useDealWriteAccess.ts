'use client';

import { useCallback, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useWriteAccess } from '@/context/RbacWriteContext';
import { canWriteDeal } from '@/lib/rbac';

export function useDealWriteAccess(dealId: string | undefined) {
  const { user, deals } = useApp();
  const { canWrite: pageCanWrite, writeBlockedReason: pageBlockedReason } = useWriteAccess();
  const deal = deals.find(d => d.id === dealId);

  const canWrite = useMemo(() => {
    if (!dealId || !user) return false;
    if (user.role === 'investor' || user.role === 'customer') return false;
    if (user.role !== 'staff') return pageCanWrite;
    return pageCanWrite && canWriteDeal(user, dealId, deal);
  }, [dealId, user, pageCanWrite, deal]);

  const writeBlockedReason = useMemo(() => {
    if (!dealId || !user) return pageBlockedReason;
    if (user.role === 'investor') {
      return 'Investor portal is read-only.';
    }
    if (user.role === 'customer') return pageBlockedReason;
    if (user.role !== 'staff') return pageBlockedReason;
    if (!pageCanWrite) return pageBlockedReason;
    if (!canWriteDeal(user, dealId, deal)) {
      return 'Read-only access to this group. Ask your branch manager for write access.';
    }
    return pageBlockedReason;
  }, [dealId, user, pageCanWrite, pageBlockedReason, deal]);

  const buttonProps = useCallback(
    (extra?: { disabled?: boolean; title?: string }) => ({
      disabled: !canWrite || extra?.disabled,
      title: !canWrite ? writeBlockedReason : extra?.title,
      'aria-disabled': !canWrite || extra?.disabled,
    }),
    [canWrite, writeBlockedReason],
  );

  return { canWrite, writeBlockedReason, buttonProps };
}
