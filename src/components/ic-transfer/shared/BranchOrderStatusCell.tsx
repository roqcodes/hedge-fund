'use client';

import React from 'react';
import { ICSale } from '@/types';
import { useApp } from '@/context/AppContext';
import {
  canBranchResubmitOrder,
  getBranchOrderStatus,
  CUSTOMER_STATUS_STYLES,
} from '@/lib/icTransfer/orderStatus';
import { isBranchRejectedStatus } from '@/lib/icTransfer/customerOrderReview';
import {
  canEditOrder,
  canDeleteOrder,
  canRequestOrderCancellation,
  canBranchResolveCustomerCancellation,
} from '@/lib/icTransfer/orderWorkflowRules';
import { getOrderStatusDescription } from '@/lib/icTransfer/orderStatusDescriptions';
import {
  branchApproveCustomerCancelICSaleAction,
  branchDeclineCustomerCancelICSaleAction,
  customerRequestCancelICSaleAction,
} from '@/app/actions/icTransferActions';
import {
  OrderWorkflowActionStack,
  WorkflowActionButton,
  OrderStatusCard,
  IconEdit,
  IconTrash,
  IconBan,
  IconEye,
  IconCheck,
  IconX,
} from './orderWorkflow';

type Props = {
  sale: ICSale;
  compact?: boolean;
  inline?: boolean;
  onView?: (sale: ICSale) => void;
  onResubmit?: (sale: ICSale) => void;
  onDelete?: (sale: ICSale) => void;
  onCancelRequest?: (sale: ICSale) => void;
  onUpdated?: () => void;
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
  const canShowRemarks =
    canBranchResubmitOrder(sale.orderStatus) ||
    isBranchRejectedStatus(sale.orderStatus) ||
    normalizeRejectedRemarks(sale);

  return (
    <OrderStatusCard
      label={label}
      statusStyle={CUSTOMER_STATUS_STYLES[label]}
      flowDescription={getOrderStatusDescription(sale, 'branch')}
      remarks={compact ? (canShowRemarks ? sale.rejectionRemarks : null) : sale.rejectionRemarks}
      remarksTitle="Rejection reason"
      remarksVariant="danger"
      compact={compact}
      className={className}
    />
  );
}

function normalizeRejectedRemarks(sale: ICSale): boolean {
  const status = sale.orderStatus;
  return status === 'branch_rejected' || status === 'admin_rejected';
}

/** Branch resubmit / delete / cancel / view actions for the Actions column. */
export function BranchOrderWorkflowActions({
  sale,
  onView,
  onResubmit,
  onDelete,
  onCancelRequest,
  onUpdated,
  inline = false,
  compact = true,
}: Props) {
  const { user, showToast, refetchData, currentSlug } = useApp();
  const branchSlug = currentSlug !== 'superadmin' ? currentSlug : undefined;
  const role = user?.role;
  const isCustomer = role === 'customer';
  const isBranchManager = role === 'branch_manager';
  const [loading, setLoading] = React.useState(false);

  const showEdit = canEditOrder(sale, role) && !!onResubmit;
  const showDelete = canDeleteOrder(sale, role) && !!onDelete;
  const showCustomerCancel = canRequestOrderCancellation(sale, 'customer') && !!onCancelRequest;
  const showBranchCancel =
    (canRequestOrderCancellation(sale, 'branch_manager') ||
      canRequestOrderCancellation(sale, 'staff')) &&
    !!onCancelRequest;
  const showResolveCustomerCancel =
    isBranchManager && canBranchResolveCustomerCancellation(sale);
  const showView = !!onView;

  const handleCustomerCancel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    const res = await customerRequestCancelICSaleAction(sale.id, branchSlug);
    setLoading(false);
    if (res.success) {
      showToast('Cancellation requested — branch manager will review', 'success');
      await refetchData();
      onUpdated?.();
    } else {
      showToast(res.error || 'Failed to request cancellation', 'error');
    }
  };

  const handleApproveCancel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    const res = await branchApproveCustomerCancelICSaleAction(sale.id, branchSlug);
    setLoading(false);
    if (res.success) {
      showToast('Cancellation approved', 'success');
      await refetchData();
      onUpdated?.();
    } else {
      showToast(res.error || 'Failed to approve cancellation', 'error');
    }
  };

  const handleDeclineCancel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    const res = await branchDeclineCustomerCancelICSaleAction(sale.id, branchSlug);
    setLoading(false);
    if (res.success) {
      showToast('Cancellation declined — order continues', 'success');
      await refetchData();
      onUpdated?.();
    } else {
      showToast(res.error || 'Failed to decline cancellation', 'error');
    }
  };

  if (
    !showEdit &&
    !showDelete &&
    !showCustomerCancel &&
    !showBranchCancel &&
    !showResolveCustomerCancel &&
    !showView
  ) {
    return null;
  }

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
      {showEdit && (
        <WorkflowActionButton
          variant="secondary"
          icon={<IconEdit />}
          size={compact ? 'sm' : 'md'}
          fullWidth={btnWidth}
          onClick={e => { e.stopPropagation(); onResubmit!(sale); }}
        >
          {inline ? 'Edit' : 'Edit Order'}
        </WorkflowActionButton>
      )}
      {(showCustomerCancel || showBranchCancel) && (
        <WorkflowActionButton
          variant="danger"
          icon={<IconBan />}
          size={compact ? 'sm' : 'md'}
          fullWidth={btnWidth}
          onClick={e => {
            e.stopPropagation();
            if (isCustomer) {
              void handleCustomerCancel(e);
            } else {
              onCancelRequest!(sale);
            }
          }}
          disabled={loading}
        >
          Cancel
        </WorkflowActionButton>
      )}
      {showResolveCustomerCancel && (
        <>
          <WorkflowActionButton
            variant="success"
            icon={<IconCheck />}
            size={compact ? 'sm' : 'md'}
            fullWidth={btnWidth}
            onClick={handleApproveCancel}
            disabled={loading}
          >
            Approve Cancel
          </WorkflowActionButton>
          <WorkflowActionButton
            variant="secondary"
            icon={<IconX />}
            size={compact ? 'sm' : 'md'}
            fullWidth={btnWidth}
            onClick={handleDeclineCancel}
            disabled={loading}
          >
            Decline
          </WorkflowActionButton>
        </>
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
export function BranchOrderStatusPanel({ sale, onResubmit, onDelete, onCancelRequest, onUpdated }: Props) {
  return (
    <div className="flex flex-col items-stretch gap-3" onClick={e => e.stopPropagation()}>
      <BranchOrderStatusCard sale={sale} compact={false} />
      <BranchOrderWorkflowActions
        sale={sale}
        onResubmit={onResubmit}
        onDelete={onDelete}
        onCancelRequest={onCancelRequest}
        onUpdated={onUpdated}
        compact={false}
      />
    </div>
  );
}
