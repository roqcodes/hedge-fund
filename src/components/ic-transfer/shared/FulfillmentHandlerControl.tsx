'use client';

import React, { useState } from 'react';
import { ICSale } from '@/types';
import { useApp } from '@/context/AppContext';
import { adminSetFulfillmentHandlerAction } from '@/app/actions/icTransferActions';
import {
  getFulfillmentHandlerLabel,
  isCustomerCreatedOrder,
  type FulfillmentHandler,
} from '@/lib/icTransfer/fulfillmentHandler';
import { canAdminChangeFulfillmentHandler } from '@/lib/icTransfer/orderWorkflowRules';
import { isCustomerOrderPendingAtAdmin } from '@/lib/icTransfer/adminOnlyBranch';
import { canPerformICTransferAdminActions } from '@/lib/rbac';

type Props = {
  sale: ICSale;
  onUpdated?: () => void;
};

export default function FulfillmentHandlerControl({ sale, onUpdated }: Props) {
  const { showToast, refetchData, currentSlug, user } = useApp();
  const branchSlug = currentSlug !== 'superadmin' ? currentSlug : undefined;
  const [loading, setLoading] = useState(false);

  if (!canPerformICTransferAdminActions(user) || !isCustomerCreatedOrder(sale)) {
    return <span className="text-[10px] text-slate-400">—</span>;
  }

  if (!canAdminChangeFulfillmentHandler(sale)) {
    if (sale.orderCustomerId && sale.orderStatus === 'pending_branch_review') {
      return (
        <span className="text-[10px] font-medium text-teal-700" title="Awaiting branch manager review">
          Branch review
        </span>
      );
    }
    if (isCustomerOrderPendingAtAdmin(sale)) {
      return (
        <span className="text-[10px] font-medium text-amber-700" title="Awaiting admin acceptance">
          Admin queue
        </span>
      );
    }
    return (
      <span className="text-[10px] text-slate-400" title="Handling locked after acceptance">
        {sale.fulfillmentHandler === 'branch' ? 'Branch' : 'Admin'}
      </span>
    );
  }

  const current = sale.fulfillmentHandler === 'branch' ? 'branch' : 'hq_admin';

  const handleChange = async (next: FulfillmentHandler) => {
    if (next === current || loading) return;
    setLoading(true);
    const res = await adminSetFulfillmentHandlerAction(sale.id, next, branchSlug);
    setLoading(false);
    if (res.success) {
      showToast(
        next === 'branch'
          ? 'Order assigned to branch — admin is now view-only'
          : 'Order assigned to admin for fulfillment',
        'success',
      );
      await refetchData();
      onUpdated?.();
    } else {
      showToast(res.error || 'Failed to update handling', 'error');
    }
  };

  return (
    <select
      value={current}
      disabled={loading}
      onClick={e => e.stopPropagation()}
      onChange={e => handleChange(e.target.value as FulfillmentHandler)}
      className="h-8 min-w-[88px] rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-bold text-slate-700 shadow-sm focus:border-accent focus:outline-none disabled:opacity-60"
      aria-label={`Handling for order — currently ${getFulfillmentHandlerLabel(current)}`}
    >
      <option value="hq_admin">Admin</option>
      <option value="branch">Branch</option>
    </select>
  );
}

export function FulfillmentHandlerBadge({ sale }: { sale: ICSale }) {
  if (sale.fulfillmentHandler !== 'branch') return null;
  return (
    <span className="ml-1.5 inline-flex rounded-full border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-teal-700">
      Branch
    </span>
  );
}
