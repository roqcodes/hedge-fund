'use client';

import React from 'react';
import { ICSale } from '@/types';
import { canBranchResubmitOrder, getCustomerOrderStatus, CUSTOMER_STATUS_STYLES } from '@/lib/icTransfer/orderStatus';
import {
  OrderWorkflowActionStack,
  WorkflowActionButton,
  OrderStatusCard,
  IconEdit,
} from './orderWorkflow';

type Props = {
  sale: ICSale;
  compact?: boolean;
  onResubmit?: (sale: ICSale) => void;
};

/** Branch status + remarks card for the Status column. */
export function BranchOrderStatusCard({
  sale,
  compact = true,
  className,
}: {
  sale: ICSale;
  compact?: boolean;
  className?: string;
}) {
  const label = getCustomerOrderStatus(sale);
  const canResubmit = canBranchResubmitOrder(sale.orderStatus);

  return (
    <OrderStatusCard
      label={label}
      statusStyle={CUSTOMER_STATUS_STYLES[label]}
      remarks={compact ? (canResubmit ? sale.rejectionRemarks : null) : sale.rejectionRemarks}
      remarksTitle="Rejection reason"
      remarksVariant="danger"
      compact={compact}
      className={className}
    />
  );
}

/** Branch resubmit action for the Actions column. */
export function BranchOrderWorkflowActions({ sale, onResubmit, compact = true }: Props) {
  const canResubmit = canBranchResubmitOrder(sale.orderStatus);

  if (!canResubmit || !onResubmit) return null;

  return (
    <OrderWorkflowActionStack compact={compact}>
          <WorkflowActionButton
            variant="secondary"
            icon={<IconEdit />}
            size={compact ? 'sm' : 'md'}
            onClick={e => { e.stopPropagation(); onResubmit(sale); }}
          >
        Edit & Resend
      </WorkflowActionButton>
    </OrderWorkflowActionStack>
  );
}

/** Branch-facing order status cell — card only (table Status column). */
export function BranchOrderStatusCell({ sale, compact = true }: Pick<Props, 'sale' | 'compact'>) {
  return <BranchOrderStatusCard sale={sale} compact={compact} />;
}

/** Full-width branch status panel for modals and detail views. */
export function BranchOrderStatusPanel({ sale, onResubmit }: Props) {
  return (
    <div className="flex flex-col items-stretch gap-3" onClick={e => e.stopPropagation()}>
      <BranchOrderStatusCard sale={sale} compact={false} />
      <BranchOrderWorkflowActions sale={sale} onResubmit={onResubmit} compact={false} />
    </div>
  );
}
