'use client';

import React from 'react';
import {
  getAdminStatusLabel,
  getAdminStatusStyle,
  getCustomerOrderStatus,
  CUSTOMER_STATUS_STYLES,
} from '@/lib/icTransfer/orderStatus';
import type { ICSale } from '@/types';

interface AdminOrderStatusBadgeProps {
  status?: string | null;
}

export function AdminOrderStatusBadge({ status }: AdminOrderStatusBadgeProps) {
  const label = getAdminStatusLabel(status);
  const cls = getAdminStatusStyle(status);
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

interface CustomerOrderStatusBadgeProps {
  sale: Pick<ICSale, 'orderStatus' | 'deliveryAgentId' | 'aedAmount' | 'paymentStatus' | 'derivedFromSaleId'>;
}

export function CustomerOrderStatusBadge({ sale }: CustomerOrderStatusBadgeProps) {
  const label = getCustomerOrderStatus(sale);
  const cls = CUSTOMER_STATUS_STYLES[label];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide ${cls}`}>
      {label}
    </span>
  );
}
