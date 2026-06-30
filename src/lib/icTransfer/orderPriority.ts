import type { OrderPriority } from '@/types/warehouse';

export const ORDER_PRIORITIES: OrderPriority[] = ['High', 'Normal', 'Low'];

export const PRIORITY_SORT_ORDER: Record<OrderPriority, number> = {
  High: 0,
  Normal: 1,
  Low: 2,
};

export function normalizePriority(priority?: string | null): OrderPriority {
  if (priority === 'High' || priority === 'Low') return priority;
  return 'Normal';
}

export function comparePriority(
  a?: string | null,
  b?: string | null,
  direction: 'asc' | 'desc' = 'asc',
): number {
  const diff =
    PRIORITY_SORT_ORDER[normalizePriority(a)] - PRIORITY_SORT_ORDER[normalizePriority(b)];
  return direction === 'asc' ? diff : -diff;
}

export function isHighPriority(priority?: string | null): boolean {
  return normalizePriority(priority) === 'High';
}

/** Row highlight class for high-priority orders in warehouse / delivery lists. */
export function highPriorityRowClass(priority?: string | null): string {
  return isHighPriority(priority)
    ? 'bg-red-50/50 hover:bg-red-50/80 border-l-[3px] border-l-red-500'
    : 'hover:bg-slate-50';
}

/** Card highlight for mobile high-priority orders. */
export function highPriorityCardClass(priority?: string | null): string {
  return isHighPriority(priority)
    ? 'border-red-200 bg-red-50/30 ring-1 ring-red-100'
    : 'border-slate-100 bg-white';
}
