'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { ICSale } from '@/types';
import {
  adminAcceptICSaleAction,
  adminRejectICSaleAction,
  adminReassignICSaleWarehouseAction,
} from '@/app/actions/icTransferActions';
import {
  canAdminAccept,
  canAdminReject,
  canAdminReassignWarehouse,
  getAdminStatusLabel,
  getAdminStatusStyle,
  normalizeOrderStatus,
} from '@/lib/icTransfer/orderStatus';
import RejectRemarkModal from './RejectRemarkModal';
import {
  OrderWorkflowActionStack,
  WorkflowActionButton,
  WorkflowNotice,
  OrderStatusCard,
  IconCheck,
  IconX,
  IconRefresh,
} from './orderWorkflow';
import { btnPrimary, btnSecondary, formSelect } from '@/lib/ui';

type SharedProps = {
  sale: ICSale;
  onUpdated?: () => void;
};

function getRemarksVariant(status?: string | null) {
  const normalized = normalizeOrderStatus(status);
  if (normalized === 'da_rejected') return 'warning' as const;
  if (normalized === 'admin_rejected' || normalized === 'wh_rejected') return 'danger' as const;
  return 'info' as const;
}

/** Status + remarks card for the Status column. */
export function AdminOrderStatusCard({
  sale,
  compact = true,
  className,
}: {
  sale: ICSale;
  compact?: boolean;
  className?: string;
}) {
  return (
    <OrderStatusCard
      label={getAdminStatusLabel(sale.orderStatus)}
      statusStyle={getAdminStatusStyle(sale.orderStatus)}
      remarks={sale.rejectionRemarks}
      remarksVariant={getRemarksVariant(sale.orderStatus)}
      compact={compact}
      className={className}
    />
  );
}

/** Workflow action buttons + modals for the Actions column or detail panels. */
export function AdminOrderWorkflowActions({ sale, onUpdated, compact = true }: SharedProps & { compact?: boolean }) {
  const { icWarehouses, showToast, refetchData } = useApp();
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState(sale.warehouseId || '');
  const [loading, setLoading] = useState(false);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseId) {
      showToast('Please select a warehouse', 'error');
      return;
    }
    setLoading(true);
    const res = await adminAcceptICSaleAction(sale.id, warehouseId);
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
      showToast('Please select a warehouse', 'error');
      return;
    }
    setLoading(true);
    const res = await adminReassignICSaleWarehouseAction(sale.id, warehouseId);
    setLoading(false);
    if (res.success) {
      showToast('Warehouse reassigned successfully', 'success');
      setReassignOpen(false);
      await refetchData();
      onUpdated?.();
    } else {
      showToast(res.error || 'Failed to reassign warehouse', 'error');
    }
  };

  const handleReject = async (remarks: string) => {
    setLoading(true);
    const res = await adminRejectICSaleAction(sale.id, remarks);
    setLoading(false);
    if (res.success) {
      showToast('Order rejected', 'success');
      setRejectOpen(false);
      await refetchData();
      onUpdated?.();
    } else {
      showToast(res.error || 'Failed to reject order', 'error');
    }
  };

  const showAccept = canAdminAccept(sale.orderStatus);
  const showReject = canAdminReject(sale.orderStatus);
  const showReassign = canAdminReassignWarehouse(sale.orderStatus);
  const hasActions = showAccept || showReject || showReassign;

  if (!hasActions) return null;

  return (
    <>
      <OrderWorkflowActionStack compact={compact}>
        {showAccept && (
          <WorkflowActionButton
            variant="success"
            icon={<IconCheck />}
            size={compact ? 'sm' : 'md'}
            onClick={e => { e.stopPropagation(); setWarehouseId(''); setAcceptOpen(true); }}
          >
            Accept
          </WorkflowActionButton>
        )}
        {showReassign && (
          <WorkflowActionButton
            variant="secondary"
            icon={<IconRefresh />}
            size={compact ? 'sm' : 'md'}
            onClick={e => { e.stopPropagation(); setWarehouseId(''); setReassignOpen(true); }}
          >
            Reassign WH
          </WorkflowActionButton>
        )}
        {showReject && (
          <WorkflowActionButton
            variant="danger"
            icon={<IconX />}
            size={compact ? 'sm' : 'md'}
            onClick={e => { e.stopPropagation(); setRejectOpen(true); }}
          >
            Reject
          </WorkflowActionButton>
        )}
      </OrderWorkflowActionStack>

      <Modal
        open={acceptOpen}
        onClose={() => setAcceptOpen(false)}
        title="Accept Order & Assign Warehouse"
        maxWidth="max-w-sm"
        footer={
          <div className="flex w-full justify-end gap-3">
            <button type="button" className={btnSecondary} onClick={() => setAcceptOpen(false)} disabled={loading}>Cancel</button>
            <button type="submit" form="accept-order-form" className={btnPrimary} disabled={loading}>
              {loading ? 'Processing...' : 'Accept Order'}
            </button>
          </div>
        }
      >
        <form id="accept-order-form" onSubmit={handleAccept} className="space-y-4">
          <p className="text-sm text-slate-600">Select a warehouse to process this order.</p>
          <select
            value={warehouseId}
            onChange={e => setWarehouseId(e.target.value)}
            className={formSelect}
            required
          >
            <option value="">Select warehouse...</option>
            {icWarehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </form>
      </Modal>

      <Modal
        open={reassignOpen}
        onClose={() => setReassignOpen(false)}
        title="Reassign Warehouse"
        maxWidth="max-w-sm"
        footer={
          <div className="flex w-full justify-end gap-3">
            <button type="button" className={btnSecondary} onClick={() => setReassignOpen(false)} disabled={loading}>Cancel</button>
            <button type="submit" form="reassign-order-form" className={btnPrimary} disabled={loading}>
              {loading ? 'Processing...' : 'Reassign'}
            </button>
          </div>
        }
      >
        <form id="reassign-order-form" onSubmit={handleReassign} className="space-y-4">
          {sale.rejectionRemarks && (
            <WorkflowNotice variant="warning" title="Previous rejection">
              {sale.rejectionRemarks}
            </WorkflowNotice>
          )}
          <p className="text-sm text-slate-600">Assign a new warehouse to continue processing.</p>
          <select
            value={warehouseId}
            onChange={e => setWarehouseId(e.target.value)}
            className={formSelect}
            required
          >
            <option value="">Select warehouse...</option>
            {icWarehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </form>
      </Modal>

      <RejectRemarkModal
        open={rejectOpen}
        loading={loading}
        title="Reject Order"
        description="Provide a reason for rejecting this order. The branch will see the order as rejected."
        onConfirm={handleReject}
        onCancel={() => setRejectOpen(false)}
      />
    </>
  );
}

type PanelProps = SharedProps & {
  compact?: boolean;
};

/** Full status panel for modals — card + actions stacked. */
export default function AdminOrderWorkflowPanel({ sale, onUpdated, compact = false }: PanelProps) {
  return (
    <div className={`flex flex-col items-stretch ${compact ? 'gap-1.5' : 'gap-3'}`} onClick={e => e.stopPropagation()}>
      <AdminOrderStatusCard sale={sale} compact={compact} />
      <AdminOrderWorkflowActions sale={sale} onUpdated={onUpdated} compact={compact} />
    </div>
  );
}
