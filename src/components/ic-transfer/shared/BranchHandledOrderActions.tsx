'use client';

import React, { useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { ICSale } from '@/types';
import {
  branchAcceptICSaleAction,
  branchReassignICSaleWarehouseAction,
  branchCompleteHandledOrderAction,
  branchReopenHandledOrderAction,
} from '@/app/actions/icTransferActions';
import {
  canAdminAccept,
  canAdminReassignWarehouse,
} from '@/lib/icTransfer/orderStatus';
import {
  canBranchCompleteHandled,
  canBranchReopenHandled,
  isBranchHandledSale,
} from '@/lib/icTransfer/fulfillmentHandler';
import { filterWarehousesForBranchPortal } from '@/lib/icTransfer/branchPortalScope';
import {
  OrderWorkflowActionStack,
  WorkflowActionButton,
  WorkflowNotice,
  IconCheck,
  IconRefresh,
} from './orderWorkflow';
import { btnPrimary, btnSecondary, formSelect } from '@/lib/ui';

type Props = {
  sale: ICSale;
  branchId?: string;
  onUpdated?: () => void;
  compact?: boolean;
};

export function BranchHandledOrderNotice({ sale }: { sale: ICSale }) {
  if (!isBranchHandledSale(sale)) return null;
  const status = sale.orderStatus;
  if (status === 'accepted' && sale.warehouseId) {
    return (
      <WorkflowNotice variant="info" title="Branch-managed order">
        This order is handled by your branch. Assign delivery through your branch warehouse or mark
        it complete directly when fulfilled.
      </WorkflowNotice>
    );
  }
  if (status === 'completed') {
    return (
      <WorkflowNotice variant="info" title="Branch — Completed">
        Fulfilled by the branch manager. HQ admin has view-only access.
      </WorkflowNotice>
    );
  }
  return null;
}

export default function BranchHandledOrderActions({
  sale,
  branchId,
  onUpdated,
  compact = true,
}: Props) {
  const { icWarehouses, showToast, refetchData, currentSlug, user } = useApp();
  const branchSlug = currentSlug !== 'superadmin' ? currentSlug : undefined;

  const [acceptOpen, setAcceptOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState(sale.warehouseId || '');
  const [loading, setLoading] = useState(false);

  const branchWarehouses = useMemo(() => {
    if (!branchId) return [];
    return filterWarehousesForBranchPortal(icWarehouses, branchId);
  }, [icWarehouses, branchId]);

  if (!isBranchHandledSale(sale) || user?.role !== 'branch_manager') return null;

  const showAccept = canAdminAccept(sale.orderStatus);
  const showReassign = canAdminReassignWarehouse(sale.orderStatus);
  const showComplete = canBranchCompleteHandled(sale);
  const showReopen = canBranchReopenHandled(sale);

  if (!showAccept && !showReassign && !showComplete && !showReopen) return null;

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseId) {
      showToast('Please select a branch warehouse', 'error');
      return;
    }
    setLoading(true);
    const res = await branchAcceptICSaleAction(sale.id, warehouseId, branchSlug);
    setLoading(false);
    if (res.success) {
      showToast('Order accepted and warehouse assigned', 'success');
      setAcceptOpen(false);
      await refetchData();
      onUpdated?.();
    } else {
      showToast(res.error || 'Failed to accept order', 'error');
    }
  };

  const handleReassign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseId) {
      showToast('Please select a branch warehouse', 'error');
      return;
    }
    setLoading(true);
    const res = await branchReassignICSaleWarehouseAction(sale.id, warehouseId, branchSlug);
    setLoading(false);
    if (res.success) {
      showToast('Warehouse reassigned', 'success');
      setReassignOpen(false);
      await refetchData();
      onUpdated?.();
    } else {
      showToast(res.error || 'Failed to reassign warehouse', 'error');
    }
  };

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    const res = await branchCompleteHandledOrderAction(sale.id, branchSlug);
    setLoading(false);
    if (res.success) {
      showToast('Order marked as completed', 'success');
      await refetchData();
      onUpdated?.();
    } else {
      showToast(res.error || 'Failed to complete order', 'error');
    }
  };

  const handleReopen = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    const res = await branchReopenHandledOrderAction(sale.id, branchSlug);
    setLoading(false);
    if (res.success) {
      showToast('Order set back to pending completion', 'success');
      await refetchData();
      onUpdated?.();
    } else {
      showToast(res.error || 'Failed to reopen order', 'error');
    }
  };

  const warehouseSelect = (
    <select
      className={formSelect}
      value={warehouseId}
      onChange={e => setWarehouseId(e.target.value)}
      required
    >
      <option value="">Select branch warehouse…</option>
      {branchWarehouses.map(w => (
        <option key={w.id} value={w.id}>{w.name}</option>
      ))}
    </select>
  );

  return (
    <>
      <OrderWorkflowActionStack compact={compact}>
        {showAccept && (
          <WorkflowActionButton
            variant="success"
            icon={<IconCheck />}
            size={compact ? 'sm' : 'md'}
            onClick={e => { e.stopPropagation(); setAcceptOpen(true); }}
            disabled={loading}
          >
            Accept & Assign
          </WorkflowActionButton>
        )}
        {showReassign && (
          <WorkflowActionButton
            variant="secondary"
            icon={<IconRefresh />}
            size={compact ? 'sm' : 'md'}
            onClick={e => { e.stopPropagation(); setReassignOpen(true); }}
            disabled={loading}
          >
            Reassign WH
          </WorkflowActionButton>
        )}
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

      <Modal
        open={acceptOpen}
        onClose={() => setAcceptOpen(false)}
        title="Accept Order & Assign Warehouse"
        maxWidth="max-w-md"
        footer={
          <>
            <button type="button" className={btnSecondary} onClick={() => setAcceptOpen(false)} disabled={loading}>
              Cancel
            </button>
            <button type="submit" form="branch-accept-form" className={btnPrimary} disabled={loading}>
              {loading ? 'Saving…' : 'Accept'}
            </button>
          </>
        }
      >
        <form id="branch-accept-form" onSubmit={handleAccept} className="space-y-4">
          <p className="text-sm text-slate-600">Select a branch warehouse for this order.</p>
          {branchWarehouses.length === 0 ? (
            <p className="text-sm text-amber-700">No branch warehouses configured. Add one from IC Transfer → Warehouse.</p>
          ) : (
            warehouseSelect
          )}
        </form>
      </Modal>

      <Modal
        open={reassignOpen}
        onClose={() => setReassignOpen(false)}
        title="Reassign Branch Warehouse"
        maxWidth="max-w-md"
        footer={
          <>
            <button type="button" className={btnSecondary} onClick={() => setReassignOpen(false)} disabled={loading}>
              Cancel
            </button>
            <button type="submit" form="branch-reassign-form" className={btnPrimary} disabled={loading}>
              {loading ? 'Saving…' : 'Reassign'}
            </button>
          </>
        }
      >
        <form id="branch-reassign-form" onSubmit={handleReassign} className="space-y-4">
          {warehouseSelect}
        </form>
      </Modal>
    </>
  );
}
