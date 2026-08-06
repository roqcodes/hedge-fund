'use client';

import React from 'react';
import {
  canWarehouseAct,
  canWarehouseRecordDelivery,
  getAdminStatusLabel,
  getAdminStatusStyle,
  isWarehouseDirectDeliverOrder,
  normalizeOrderStatus,
} from '@/lib/icTransfer/orderStatus';
import {
  OrderWorkflowActionStack,
  WorkflowActionButton,
  OrderStatusCard,
  IconX,
  IconUserPlus,
  IconCheck,
} from '@/components/ic-transfer/shared/orderWorkflow';
import type { WarehouseOrder } from '@/types/warehouse';

type ActionProps = {
  order: WarehouseOrder;
  canAssignAgents: boolean;
  context?: 'pending' | 'deliver';
  onReject: (e: React.MouseEvent) => void;
  onAccept: (e: React.MouseEvent) => void;
  onAssign?: (e: React.MouseEvent) => void;
  onRecordDelivery?: (e: React.MouseEvent) => void;
};

function getWarehouseRemarksVariant(status?: string | null) {
  const normalized = normalizeOrderStatus(status);
  if (normalized === 'da_rejected') return 'warning' as const;
  return 'danger' as const;
}

/** Status + remarks card for warehouse Status column. */
export function WarehouseOrderStatusCard({ order }: { order: WarehouseOrder }) {
  const directDeliver = isWarehouseDirectDeliverOrder({
    orderStatus: order.order_status ?? undefined,
    deliveryAgentId: order.delivery_agent_id ?? undefined,
  });
  return (
    <OrderStatusCard
      label={directDeliver ? 'Direct Delivery' : getAdminStatusLabel(order.order_status)}
      statusStyle={getAdminStatusStyle(order.order_status)}
      remarks={order.rejection_remarks}
      remarksVariant={getWarehouseRemarksVariant(order.order_status)}
      compact
    />
  );
}

/** Warehouse workflow buttons for Actions column. */
export function WarehouseOrderWorkflowActions({
  order,
  canAssignAgents,
  context = 'pending',
  onReject,
  onAccept,
  onAssign,
  onRecordDelivery,
}: ActionProps) {
  const status = normalizeOrderStatus(order.order_status);
  const needsWarehouseAccept = canWarehouseAct(order.order_status);
  const needsAgentOnly = status === 'wh_processing' && !order.delivery_agent_id && context === 'pending';
  const canRecordDelivery = canWarehouseRecordDelivery({
    orderStatus: order.order_status ?? undefined,
    deliveryAgentId: order.delivery_agent_id ?? undefined,
  });

  if (context === 'deliver') {
    if (!canAssignAgents || !canRecordDelivery) return null;
    return (
      <OrderWorkflowActionStack>
        <WorkflowActionButton variant="success" icon={<IconCheck />} onClick={onRecordDelivery!}>
          Record Delivery
        </WorkflowActionButton>
        <WorkflowActionButton variant="danger" icon={<IconX />} onClick={onReject}>
          Reject
        </WorkflowActionButton>
      </OrderWorkflowActionStack>
    );
  }

  const hasActions = canAssignAgents && (needsWarehouseAccept || needsAgentOnly);
  if (!hasActions) return null;

  return (
    <OrderWorkflowActionStack>
      {needsWarehouseAccept && (
        <>
          <WorkflowActionButton variant="danger" icon={<IconX />} onClick={onReject}>
            Reject
          </WorkflowActionButton>
          <WorkflowActionButton variant="primary" icon={<IconCheck />} onClick={onAccept}>
            Accept
          </WorkflowActionButton>
        </>
      )}
      {needsAgentOnly && onAssign && (
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
  const directDeliver = isWarehouseDirectDeliverOrder({
    orderStatus: order.order_status ?? undefined,
    deliveryAgentId: order.delivery_agent_id ?? undefined,
  });
  return (
    <span className={order.delivery_agent_name ? 'text-sm font-semibold text-slate-900' : 'text-xs text-slate-400'}>
      {order.delivery_agent_name || (directDeliver ? 'Direct delivery' : 'Unassigned')}
    </span>
  );
}
