'use client';

import React from 'react';
import {
  canWarehouseAct,
  getAdminStatusLabel,
  getAdminStatusStyle,
  normalizeOrderStatus,
} from '@/lib/icTransfer/orderStatus';
import {
  OrderWorkflowActionStack,
  WorkflowActionButton,
  OrderStatusCard,
  IconX,
  IconUserPlus,
} from '@/components/ic-transfer/shared/orderWorkflow';
import type { WarehouseOrder } from '@/types/warehouse';

type ActionProps = {
  order: WarehouseOrder;
  canAssignAgents: boolean;
  onReject: (e: React.MouseEvent) => void;
  onAssign: (e: React.MouseEvent) => void;
};

function getWarehouseRemarksVariant(status?: string | null) {
  const normalized = normalizeOrderStatus(status);
  if (normalized === 'da_rejected') return 'warning' as const;
  return 'danger' as const;
}

/** Status + remarks card for warehouse Status column. */
export function WarehouseOrderStatusCard({ order }: { order: WarehouseOrder }) {
  return (
    <OrderStatusCard
      label={getAdminStatusLabel(order.order_status)}
      statusStyle={getAdminStatusStyle(order.order_status)}
      remarks={order.rejection_remarks}
      remarksVariant={getWarehouseRemarksVariant(order.order_status)}
      compact
    />
  );
}

/** Warehouse workflow buttons for Actions column. */
export function WarehouseOrderWorkflowActions({ order, canAssignAgents, onReject, onAssign }: ActionProps) {
  const status = normalizeOrderStatus(order.order_status);
  const needsWarehouseAccept = canWarehouseAct(order.order_status);
  const needsAgentOnly = status === 'wh_processing' && !order.delivery_agent_id;
  const hasActions = canAssignAgents && (needsWarehouseAccept || needsAgentOnly);

  if (!hasActions) return null;

  return (
    <OrderWorkflowActionStack>
      {needsWarehouseAccept && (
        <>
          <WorkflowActionButton variant="danger" icon={<IconX />} onClick={onReject}>
            Reject
          </WorkflowActionButton>
          <WorkflowActionButton variant="primary" icon={<IconUserPlus />} onClick={onAssign}>
            Assign Agent
          </WorkflowActionButton>
        </>
      )}
      {needsAgentOnly && (
        <WorkflowActionButton variant="primary" icon={<IconUserPlus />} onClick={onAssign}>
          Assign Agent
        </WorkflowActionButton>
      )}
    </OrderWorkflowActionStack>
  );
}

/** @deprecated Use WarehouseOrderStatusCard + WarehouseOrderWorkflowActions separately. */
export function WarehouseOrderStatusCell(props: ActionProps) {
  return (
    <div className="flex flex-col items-stretch gap-1.5" onClick={e => e.stopPropagation()}>
      <WarehouseOrderStatusCard order={props.order} />
      <WarehouseOrderWorkflowActions {...props} />
    </div>
  );
}

export function WarehouseAgentNameCell({ order }: { order: WarehouseOrder }) {
  return (
    <span className={order.delivery_agent_name ? 'text-sm font-semibold text-slate-900' : 'text-xs text-slate-400'}>
      {order.delivery_agent_name || 'Unassigned'}
    </span>
  );
}
