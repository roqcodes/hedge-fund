'use client';

import React, { useState } from 'react';
import { ICSale } from '@/types';
import { useApp } from '@/context/AppContext';
import {
  adminCompleteByHandOrderAction,
  adminReopenByHandOrderAction,
} from '@/app/actions/icTransferActions';
import { canAdminCompleteByHand, canAdminReopenByHand } from '@/lib/icTransfer/byHand';
import { canPerformICTransferAdminActions } from '@/lib/rbac';
import {
  OrderWorkflowActionStack,
  WorkflowActionButton,
  WorkflowNotice,
  IconCheck,
  IconRefresh,
} from './orderWorkflow';

type Props = {
  sale: ICSale;
  onUpdated?: () => void;
  compact?: boolean;
};

export function ByHandAdminNotice({ sale }: { sale: ICSale }) {
  const status = sale.orderStatus;
  if (status === 'accepted' && sale.warehouseId) {
    return (
      <WorkflowNotice variant="info" title="Admin-only fulfillment">
        This By Hand order is handled entirely in the admin panel. It will not appear in warehouse or
        delivery queues. Pending orders auto-complete daily at 10:00 PM UAE time.
      </WorkflowNotice>
    );
  }
  if (status === 'completed') {
    return (
      <WorkflowNotice variant="info" title="By Hand — Completed">
        Fulfilled by admin. No warehouse or delivery involvement.
      </WorkflowNotice>
    );
  }
  return null;
}

export default function ByHandAdminActions({ sale, onUpdated, compact = true }: Props) {
  const { showToast, refetchData, currentSlug, user } = useApp();
  const branchSlug = currentSlug !== 'superadmin' ? currentSlug : undefined;
  const [loading, setLoading] = useState(false);

  const showComplete = canAdminCompleteByHand(sale);
  const showReopen = canAdminReopenByHand(sale);
  if (!canPerformICTransferAdminActions(user) || (!showComplete && !showReopen)) return null;

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    const res = await adminCompleteByHandOrderAction(sale.id, branchSlug);
    setLoading(false);
    if (res.success) {
      showToast('By Hand order marked as completed', 'success');
      await refetchData();
      onUpdated?.();
    } else {
      showToast(res.error || 'Failed to complete order', 'error');
    }
  };

  const handleReopen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    const res = await adminReopenByHandOrderAction(sale.id, branchSlug);
    setLoading(false);
    if (res.success) {
      showToast('By Hand order set back to pending', 'success');
      await refetchData();
      onUpdated?.();
    } else {
      showToast(res.error || 'Failed to reopen order', 'error');
    }
  };

  return (
    <OrderWorkflowActionStack compact={compact}>
      {showComplete && (
        <WorkflowActionButton
          variant="success"
          icon={<IconCheck />}
          size={compact ? 'sm' : 'md'}
          onClick={handleComplete}
          disabled={loading}
        >
          Mark Complete
        </WorkflowActionButton>
      )}
      {showReopen && (
        <WorkflowActionButton
          variant="secondary"
          icon={<IconRefresh />}
          size={compact ? 'sm' : 'md'}
          onClick={handleReopen}
          disabled={loading}
        >
          Set to Pending
        </WorkflowActionButton>
      )}
    </OrderWorkflowActionStack>
  );
}
