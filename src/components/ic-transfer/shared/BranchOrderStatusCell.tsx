'use client';

import React from 'react';
import { ICSale } from '@/types';
import {
  canBranchResubmitOrder,
  canBranchDeleteOrder,
  canBranchRequestCancel,
  getBranchOrderStatus,
  CUSTOMER_STATUS_STYLES,
} from '@/lib/icTransfer/orderStatus';
import { canBranchEditHandledOrder, isBranchHandledSale } from '@/lib/icTransfer/fulfillmentHandler';
import {
  OrderWorkflowActionStack,
  WorkflowActionButton,
  OrderStatusCard,
  IconEdit,
  IconTrash,
  IconBan,
  IconEye,
} from './orderWorkflow';

type Props = {
  sale: ICSale;
  compact?: boolean;
  inline?: boolean;
  onView?: (sale: ICSale) => void;
  onResubmit?: (sale: ICSale) => void;
  onDelete?: (sale: ICSale) => void;
  onCancelRequest?: (sale: ICSale) => void;
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
  const label = getBranchOrderStatus(sale);
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

/** Branch resubmit / delete / cancel / view actions for the Actions column. */
export function BranchOrderWorkflowActions({
  sale,
  onView,
  onResubmit,
  onDelete,
  onCancelRequest,
  inline = false,
  compact = true,
}: Props) {
  const showResubmit =
    (canBranchResubmitOrder(sale.orderStatus) ||
      (isBranchHandledSale(sale) && canBranchEditHandledOrder(sale))) &&
    !!onResubmit;
  const showDelete = canBranchDeleteOrder(sale.orderStatus) && !!onDelete;
  const showCancel = canBranchRequestCancel(sale.orderStatus) && !!onCancelRequest;
  const showView = !!onView;

  if (!showResubmit && !showDelete && !showCancel && !showView) return null;

  const btnWidth = inline ? false : true;

  const viewButton = showView ? (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onView!(sale); }}
      className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 shadow-sm transition-all hover:border-accent hover:bg-accent/5 hover:text-accent"
      title="View order"
    >
      <IconEye />
      <span>View</span>
    </button>
  ) : null;

  const actionButtons = (
    <>
      {showResubmit && (
        <WorkflowActionButton
          variant="secondary"
          icon={<IconEdit />}
          size={compact ? 'sm' : 'md'}
          fullWidth={btnWidth}
          onClick={e => { e.stopPropagation(); onResubmit!(sale); }}
        >
          {inline ? 'Edit' : 'Edit & Resend'}
        </WorkflowActionButton>
      )}
      {showCancel && (
        <WorkflowActionButton
          variant="danger"
          icon={<IconBan />}
          size={compact ? 'sm' : 'md'}
          fullWidth={btnWidth}
          onClick={e => { e.stopPropagation(); onCancelRequest!(sale); }}
        >
          Cancel
        </WorkflowActionButton>
      )}
      {showDelete && (
        <WorkflowActionButton
          variant="danger"
          icon={<IconTrash />}
          size={compact ? 'sm' : 'md'}
          fullWidth={btnWidth}
          onClick={e => { e.stopPropagation(); onDelete!(sale); }}
        >
          Delete
        </WorkflowActionButton>
      )}
    </>
  );

  if (inline) {
    return (
      <div className="flex flex-row flex-wrap items-center justify-center gap-1.5">
        {viewButton}
        {actionButtons}
      </div>
    );
  }

  return (
    <OrderWorkflowActionStack compact={compact}>
      {actionButtons}
    </OrderWorkflowActionStack>
  );
}

/** Branch-facing order status cell — card only (table Status column). */
export function BranchOrderStatusCell({ sale, compact = true }: Pick<Props, 'sale' | 'compact'>) {
  return <BranchOrderStatusCard sale={sale} compact={compact} />;
}

/** Full-width branch status panel for modals and detail views. */
export function BranchOrderStatusPanel({ sale, onResubmit, onDelete, onCancelRequest }: Props) {
  return (
    <div className="flex flex-col items-stretch gap-3" onClick={e => e.stopPropagation()}>
      <BranchOrderStatusCard sale={sale} compact={false} />
      <BranchOrderWorkflowActions
        sale={sale}
        onResubmit={onResubmit}
        onDelete={onDelete}
        onCancelRequest={onCancelRequest}
        compact={false}
      />
    </div>
  );
}
