'use client';

import React from 'react';
import { ICSale } from '@/types';
import {
  canAdminAccept,
  canAdminReject,
  canAdminReassignWarehouse,
} from '@/lib/icTransfer/orderStatus';
import { AdminOrderStatusCard, AdminOrderWorkflowActions } from './AdminOrderWorkflowPanel';
import { BranchOrderStatusCard, BranchOrderWorkflowActions } from './BranchOrderStatusCell';
import { ByHandAdminNotice } from './ByHandAdminActions';
import { isByHandSale, canAdminCompleteByHand, canAdminReopenByHand } from '@/lib/icTransfer/byHand';

type Props = {
  sale: ICSale;
  variant: 'admin' | 'branch';
  onUpdated?: () => void;
  onResubmit?: (sale: ICSale) => void;
};

function hasAdminActions(sale: ICSale) {
  return (
    canAdminAccept(sale.orderStatus) ||
    canAdminReject(sale.orderStatus) ||
    canAdminReassignWarehouse(sale.orderStatus) ||
    (isByHandSale(sale) && (canAdminCompleteByHand(sale) || canAdminReopenByHand(sale)))
  );
}

/** Status card + workflow actions for sale detail modals. */
export default function SaleOrderWorkflowSection({ sale, variant, onUpdated, onResubmit }: Props) {
  const actionKey = `${sale.id}-${sale.orderStatus}-${sale.rejectionRemarks ?? ''}`;

  return (
    <div
      className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4"
      onClick={e => e.stopPropagation()}
    >
      <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Order Workflow</p>

      <div className="flex w-full flex-col gap-3">
        {variant === 'admin' ? (
          <AdminOrderStatusCard sale={sale} compact={false} />
        ) : (
          <BranchOrderStatusCard sale={sale} compact={false} />
        )}

        {variant === 'admin' ? (
          hasAdminActions(sale) ? (
            <>
              {isByHandSale(sale) ? <ByHandAdminNotice sale={sale} /> : null}
              <AdminOrderWorkflowActions
                key={actionKey}
                sale={sale}
                onUpdated={onUpdated}
                compact={false}
              />
            </>
          ) : (
            <p className="text-xs text-slate-500">No admin actions available for this order status.</p>
          )
        ) : (
          <BranchOrderWorkflowActions
            key={actionKey}
            sale={sale}
            onResubmit={onResubmit}
            compact={false}
          />
        )}
      </div>
    </div>
  );
}
