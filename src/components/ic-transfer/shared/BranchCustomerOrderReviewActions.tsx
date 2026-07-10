'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { ICSale } from '@/types';
import {
  branchReviewAcceptICSaleAction,
  branchReviewRejectICSaleAction,
} from '@/app/actions/icTransferActions';
import { canBranchReviewCustomerOrder } from '@/lib/icTransfer/customerOrderReview';
import type { FulfillmentHandler } from '@/lib/icTransfer/fulfillmentHandler';
import RejectRemarkModal from './RejectRemarkModal';
import {
  OrderWorkflowActionStack,
  WorkflowActionButton,
  WorkflowNotice,
  IconCheck,
  IconX,
} from './orderWorkflow';
import { btnPrimary, btnSecondary } from '@/lib/ui';

type Props = {
  sale: ICSale;
  onUpdated?: () => void;
  compact?: boolean;
};

export function BranchCustomerOrderReviewNotice({ sale }: { sale: ICSale }) {
  if (!canBranchReviewCustomerOrder(sale)) return null;
  return (
    <WorkflowNotice variant="info" title="Customer order — review required">
      This order was placed by a customer. Accept it and choose whether to send it to admin or
      handle it at your branch.
    </WorkflowNotice>
  );
}

export default function BranchCustomerOrderReviewActions({
  sale,
  onUpdated,
  compact = true,
}: Props) {
  const { showToast, refetchData, currentSlug, user } = useApp();
  const branchSlug = currentSlug !== 'superadmin' ? currentSlug : undefined;

  const [acceptOpen, setAcceptOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [handler, setHandler] = useState<FulfillmentHandler>('hq_admin');
  const [loading, setLoading] = useState(false);

  if (!canBranchReviewCustomerOrder(sale) || user?.role !== 'branch_manager') {
    return null;
  }

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await branchReviewAcceptICSaleAction(sale.id, handler, branchSlug);
    setLoading(false);
    if (res.success) {
      showToast(
        handler === 'branch'
          ? 'Order accepted — your branch will handle fulfillment'
          : 'Order accepted and sent to admin for fulfillment',
        'success',
      );
      setAcceptOpen(false);
      await refetchData();
      onUpdated?.();
    } else {
      showToast(res.error || 'Failed to accept order', 'error');
    }
  };

  const handleReject = async (remarks: string) => {
    setLoading(true);
    const res = await branchReviewRejectICSaleAction(sale.id, remarks, branchSlug);
    setLoading(false);
    if (res.success) {
      showToast('Order rejected — customer will be notified', 'success');
      setRejectOpen(false);
      await refetchData();
      onUpdated?.();
    } else {
      showToast(res.error || 'Failed to reject order', 'error');
    }
  };

  return (
    <>
      <OrderWorkflowActionStack compact={compact}>
        <WorkflowActionButton
          variant="success"
          icon={<IconCheck />}
          size={compact ? 'sm' : 'md'}
          onClick={e => {
            e.stopPropagation();
            setHandler('hq_admin');
            setAcceptOpen(true);
          }}
          disabled={loading}
        >
          Review & Accept
        </WorkflowActionButton>
        <WorkflowActionButton
          variant="danger"
          icon={<IconX />}
          size={compact ? 'sm' : 'md'}
          onClick={e => {
            e.stopPropagation();
            setRejectOpen(true);
          }}
          disabled={loading}
        >
          Reject
        </WorkflowActionButton>
      </OrderWorkflowActionStack>

      <Modal
        open={acceptOpen}
        onClose={() => setAcceptOpen(false)}
        title="Accept Customer Order"
        maxWidth="max-w-md"
        footer={
          <>
            <button
              type="button"
              className={btnSecondary}
              onClick={() => setAcceptOpen(false)}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="branch-review-accept-form"
              className={btnPrimary}
              disabled={loading}
            >
              {loading ? 'Saving…' : 'Accept Order'}
            </button>
          </>
        }
      >
        <form id="branch-review-accept-form" onSubmit={handleAccept} className="space-y-4">
          <p className="text-sm text-slate-600">
            Choose how this customer order should be fulfilled after acceptance.
          </p>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Fulfillment route
            </legend>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-accent/40 has-[:checked]:border-accent has-[:checked]:bg-accent/5">
              <input
                type="radio"
                name="fulfillment-handler"
                value="hq_admin"
                checked={handler === 'hq_admin'}
                onChange={() => setHandler('hq_admin')}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-900">Send to admin</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Order enters the HQ admin queue for warehouse assignment and delivery.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-teal-300 has-[:checked]:border-teal-400 has-[:checked]:bg-teal-50/60">
              <input
                type="radio"
                name="fulfillment-handler"
                value="branch"
                checked={handler === 'branch'}
                onChange={() => setHandler('branch')}
                className="mt-0.5"
              />
              <span>
                <span className="block text-sm font-semibold text-slate-900">Handle at branch</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  Your branch assigns a warehouse and completes fulfillment locally.
                </span>
              </span>
            </label>
          </fieldset>
        </form>
      </Modal>

      <RejectRemarkModal
        open={rejectOpen}
        title="Reject Customer Order"
        description="Provide a reason for rejection. The customer can edit and resubmit the order."
        confirmLabel="Reject Order"
        loading={loading}
        onConfirm={handleReject}
        onCancel={() => setRejectOpen(false)}
      />
    </>
  );
}
