'use client';

import React, { useMemo } from 'react';
import type { WarehouseKpiMetrics } from '@/lib/warehouse/kpiMetrics';

function fmt(n: number): string {
  return n.toLocaleString();
}

type Props = {
  metrics: WarehouseKpiMetrics;
  /** Warehouse managers see stock; delivery agents see unit workload with the same layout. */
  variant?: 'warehouse' | 'delivery';
  showSplit?: boolean;
  /** When false, hide Completed and optionally show unit-based Delivered / Remaining. */
  showCompleted?: boolean;
  deliveredUnits?: number;
  remainingUnits?: number;
};

type MetricCellProps = {
  label: string;
  value: string;
  hint?: string;
  valueClassName?: string;
};

function MetricCell({ label, value, hint, valueClassName = 'text-slate-900' }: MetricCellProps) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums leading-none sm:text-2xl ${valueClassName}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  );
}

export default function WarehouseKpiGrid({
  metrics,
  variant = 'warehouse',
  showSplit = true,
  showCompleted = true,
  deliveredUnits,
  remainingUnits,
}: Props) {
  const isDelivery = variant === 'delivery';
  const stockValue = metrics.currentStock === null ? null : fmt(metrics.currentStock);
  const secondaryValue = metrics.currentStock === null ? null : fmt(metrics.remaining);

  const progressPct = useMemo(() => {
    if (isDelivery) {
      if (metrics.currentStock === null || metrics.currentStock <= 0) {
        return metrics.remaining > 0 ? 100 : 0;
      }
      return Math.min(100, Math.round((metrics.remaining / metrics.currentStock) * 100));
    }
    if (metrics.currentStock === null || metrics.currentStock <= 0) {
      return metrics.reserved > 0 ? 100 : 0;
    }
    return Math.min(100, Math.round((metrics.reserved / metrics.currentStock) * 100));
  }, [isDelivery, metrics.currentStock, metrics.reserved, metrics.remaining]);

  const showPrimaryPanel = metrics.currentStock !== null;

  const primaryTitle = isDelivery ? 'Workload' : 'Inventory';
  const primaryUnitLabel = isDelivery ? 'units assigned' : 'units on hand';
  const reservedLabel = isDelivery ? 'To deliver' : 'Reserved';
  const availableLabel = isDelivery ? 'Delivered' : 'Available';
  const progressLabel = isDelivery ? 'Delivery progress' : 'Stock allocation';
  const progressPctLabel = isDelivery ? `${progressPct}% delivered` : `${progressPct}% reserved`;
  const reservedClass = 'text-amber-600';
  const availableClass = 'text-emerald-600';
  const progressBarClass = isDelivery
    ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
    : 'bg-gradient-to-r from-amber-400 to-amber-500';

  const orderMetricCount =
    2 + (showCompleted ? 1 : deliveredUnits != null ? 2 : 0) + (showSplit ? 1 : 0);
  const orderGridClass =
    orderMetricCount >= 4
      ? 'sm:grid-cols-4'
      : orderMetricCount === 3
        ? 'sm:grid-cols-3'
        : 'sm:grid-cols-2';

  return (
    <section
      className="mb-6 overflow-hidden rounded-2xl border border-slate-200/90 bg-white"
      aria-label={isDelivery ? 'Delivery summary metrics' : 'Warehouse summary metrics'}
    >
      <div
        className={`grid ${showPrimaryPanel ? 'md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:divide-x' : ''} divide-slate-100`}
      >
        {showPrimaryPanel ? (
          <div className="border-b border-slate-100 p-4 sm:p-5 md:border-b-0">
            <div className="flex max-sm:flex-col max-sm:gap-4 sm:flex-wrap sm:items-end sm:justify-between sm:gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  {primaryTitle}
                </p>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums tracking-tight text-slate-900 sm:text-3xl">
                    {stockValue}
                  </span>
                  <span className="text-sm font-medium text-slate-500">{primaryUnitLabel}</span>
                </div>
              </div>
              <div className="flex gap-5 sm:gap-6 sm:text-right">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {reservedLabel}
                  </p>
                  <p className={`mt-0.5 text-lg font-bold tabular-nums ${reservedClass}`}>{fmt(metrics.reserved)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {availableLabel}
                  </p>
                  <p className={`mt-0.5 text-lg font-bold tabular-nums ${availableClass}`}>{secondaryValue}</p>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-slate-500">
                <span>{progressLabel}</span>
                <span className="tabular-nums">{progressPctLabel}</span>
              </div>
              <div
                className="relative h-2 overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-valuenow={progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={isDelivery ? 'Share of assigned units delivered' : 'Share of stock reserved for active orders'}
              >
                <div
                  className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out ${progressBarClass}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-400 max-sm:truncate sm:whitespace-normal">
                {isDelivery ? (
                  <>
                    <span className="sm:hidden">
                      {fmt(metrics.remaining)} done · {fmt(metrics.reserved)} left
                    </span>
                    <span className="hidden sm:inline">
                      {fmt(metrics.remaining)} units delivered · {fmt(metrics.reserved)} still to deliver
                    </span>
                  </>
                ) : (
                  <>
                    <span className="sm:hidden">
                      {fmt(metrics.reserved)} locked · {secondaryValue} free
                    </span>
                    <span className="hidden sm:inline">
                      {fmt(metrics.reserved)} units locked on active orders · {secondaryValue} free to assign
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
        ) : null}

        <div className="p-4 sm:p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Orders{showPrimaryPanel ? ' · selected range' : ''}
          </p>
          <div className={`mt-3 grid grid-cols-2 gap-x-4 gap-y-4 sm:gap-x-6 ${orderGridClass}`}>
            <MetricCell label="Total" value={fmt(metrics.totalOrders)} hint="in range" />
            <MetricCell
              label="Pending"
              value={fmt(metrics.totalPending)}
              hint="active"
              valueClassName="text-amber-700"
            />
            {showCompleted ? (
              <MetricCell
                label="Completed"
                value={fmt(metrics.totalCompleted)}
                hint="delivered"
                valueClassName="text-emerald-700"
              />
            ) : null}
            {!showCompleted && deliveredUnits != null ? (
              <MetricCell
                label="Delivered"
                value={fmt(deliveredUnits)}
                hint="units"
                valueClassName="text-emerald-700"
              />
            ) : null}
            {!showCompleted && remainingUnits != null ? (
              <MetricCell
                label="Remaining"
                value={fmt(remainingUnits)}
                hint="units"
                valueClassName="text-slate-700"
              />
            ) : null}
            {showSplit ? (
              <MetricCell
                label="Split"
                value={fmt(metrics.splitOrders)}
                hint="partial"
                valueClassName="text-indigo-700"
              />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
