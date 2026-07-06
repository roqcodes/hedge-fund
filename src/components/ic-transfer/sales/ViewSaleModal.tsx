'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { ICSale } from '@/types';
import { useApp } from '@/context/AppContext';
import { ConfirmModal } from '@/components/warehouse/shared';
import SalePriorityControl from '../shared/SalePriorityControl';
import SaleOrderWorkflowSection from '../shared/SaleOrderWorkflowSection';
import ProofImageActions from '../shared/ProofImageActions';
import { canBranchResubmitOrder, canCustomerSeeDeliveryProof } from '@/lib/icTransfer/orderStatus';
import { getDeliveredUnits, getRemainingUnits } from '@/lib/icTransfer/saleUnits';
import { isBranchScopedUser } from '@/lib/rbac';
import { getFormattedTxnId } from '@/lib/icTransferMappers';
import { dbGetCustomerCurrencyAction, dbGetCustomerPhoneAction } from '@/app/actions/icTransferActions';

type Props = {
  open: boolean;
  onClose: () => void;
  sale: ICSale | null;
  onEdit?: (sale: ICSale) => void;
  /** Force admin workflow UI on IC Transfer sales page. */
  workflowVariant?: 'admin' | 'branch' | 'auto';
};

export default function ViewSaleModal({ open, onClose, sale, onEdit, workflowVariant = 'auto' }: Props) {
  const { icWarehouses, deleteICSale, user, branches, icSales, refetchData, showToast } = useApp();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const liveSale = sale ? (icSales.find(s => s.id === sale.id) ?? sale) : null;
  const [currency, setCurrency] = useState(liveSale?.currency || 'Currency');
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [phoneChecked, setPhoneChecked] = useState(false);

  const customerName = liveSale?.customerName;
  const orderCustomerId = liveSale?.orderCustomerId;
  const orderCustomerName = liveSale?.orderCustomerName;

  React.useEffect(() => {
    if (liveSale?.currency) {
      setCurrency(liveSale.currency);
    } else if (open && customerName) {
      dbGetCustomerCurrencyAction(customerName).then(res => {
        if (res.success && res.data) {
          setCurrency(res.data);
        }
      });
    }
  }, [open, customerName, liveSale?.currency]);

  React.useEffect(() => {
    if (!open) {
      setCustomerPhone(null);
      setPhoneChecked(false);
      return;
    }
    setPhoneChecked(false);
    dbGetCustomerPhoneAction({
      customerId: orderCustomerId,
      customerName: orderCustomerName || customerName,
    }).then(res => {
      setCustomerPhone(res.success ? res.data ?? null : null);
      setPhoneChecked(true);
    });
  }, [open, orderCustomerId, orderCustomerName, customerName]);

  if (!sale || !liveSale) return null;

  const handleDelete = async () => {
    setDeleteLoading(true);
    await deleteICSale(liveSale.id);
    setDeleteLoading(false);
    setConfirmDeleteOpen(false);
    onClose();
  };

  const getWarehouseName = (id?: string) => icWarehouses.find((w: any) => w.id === id)?.name || id || 'None';

  const formatAED = (val: any) => {
    return Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' AED';
  };

  const deliveredUnits = getDeliveredUnits(liveSale.units, liveSale.collectedUnits, liveSale.orderStatus);
  const remainingUnits = getRemainingUnits(liveSale.units, liveSale.collectedUnits, liveSale.orderStatus);
  const isBranchPortalView = workflowVariant === 'branch'
    || (workflowVariant === 'auto' && isBranchScopedUser(user));
  const workflowUiVariant = isBranchPortalView ? 'branch' : 'admin';
  const canBranchModifyRejected = isBranchPortalView && canBranchResubmitOrder(liveSale.orderStatus);
  const showDelete = !isBranchPortalView || canBranchModifyRejected;
  const canShowDeliveryProof =
    (!isBranchPortalView || canCustomerSeeDeliveryProof(liveSale.orderStatus))
    && !!liveSale.deliveryImageUrl;
  const showDeliveryProofPending =
    isBranchPortalView && !canCustomerSeeDeliveryProof(liveSale.orderStatus);

  const handleWorkflowUpdated = async () => {
    await refetchData();
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Sale Details"
        maxWidth="max-w-4xl"
        footer={
          <div className={`flex w-full items-center ${showDelete ? 'justify-between' : 'justify-end'}`}>
            {showDelete && (
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(true)}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-100 hover:text-red-700 transition-all duration-150 active:scale-95 shadow-sm"
              >
                Delete
              </button>
            )}
            <div className="flex gap-2">
              <button 
                type="button" 
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all duration-150 active:scale-95 shadow-sm" 
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Details */}
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Transaction ID</p>
                <p className="font-mono text-sm font-semibold text-slate-900 mt-0.5">{getFormattedTxnId(liveSale.id, 'sale', liveSale, branches)}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Date</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{new Date(liveSale.createdAt || '').toLocaleString()}</p>
              </div>
            </div>

            {liveSale.derivedFromSaleId && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-xs text-indigo-800">
                <span className="font-bold">Derived from order: </span>
                <span className="font-mono">{getFormattedTxnId(liveSale.derivedFromSaleId, 'sale', null, branches)}</span>
                <span className="text-indigo-600"> — created from a partial delivery split</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Customer</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{liveSale.customerName}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Transaction Type</p>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize mt-0.5 ${
                  liveSale.transactionType === 'by_hand'
                    ? 'border border-violet-200 bg-violet-50 text-violet-700'
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {liveSale.transactionType?.replace('_', ' ') || 'Transfer'}
                </span>
              </div>
            </div>

            {/* Calculations Box */}
            <div className="space-y-3">
              {/* Row 1: Units, Unit Rate */}
              <div className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-100 p-4 bg-slate-50/55">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Units</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{Number(liveSale.units).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Unit Rate</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{liveSale.unitRate.toLocaleString()}</p>
                </div>
              </div>

              {/* Row 2: Total INR, Total Currency, Total AED */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-2xl border border-slate-100 p-4 bg-slate-50/55">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total INR</p>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">{(Number(liveSale.units) * 1000).toLocaleString()} INR</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total {currency}</p>
                  <p className="text-sm font-bold text-indigo-700 mt-0.5">
                    {liveSale.convertedAmount != null 
                      ? `${Number(liveSale.convertedAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total AED</p>
                  <p className="text-sm font-bold text-accent mt-0.5">{formatAED(liveSale.aedAmount)}</p>
                </div>
              </div>
            </div>

            {!isBranchPortalView && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Priority</p>
                <SalePriorityControl saleId={liveSale.id} priority={liveSale.priority} />
              </div>
            )}

            {liveSale.deliveryAgentName && !isBranchPortalView && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Assigned Agent</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">{liveSale.deliveryAgentName}</p>
              </div>
            )}

            {liveSale.address ? (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Delivery Address</p>
                <p className="text-sm text-slate-700 mt-0.5 bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-wrap">{liveSale.address}</p>
              </div>
            ) : !isBranchPortalView ? (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Warehouse</p>
                <p className="text-sm font-semibold text-slate-700 mt-0.5 bg-slate-50 p-3 rounded-xl border border-slate-100">{getWarehouseName(liveSale.warehouseId)}</p>
              </div>
            ) : null}

            {liveSale.transactionType === 'by_hand' && (liveSale.location || liveSale.district) ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {liveSale.location ? (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Location</p>
                    <p className="text-sm font-semibold text-slate-700 mt-0.5">{liveSale.location}</p>
                  </div>
                ) : null}
                {liveSale.district ? (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">District</p>
                    <p className="text-sm font-semibold text-slate-700 mt-0.5">{liveSale.district}</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            <SaleOrderWorkflowSection
              sale={liveSale}
              variant={workflowUiVariant}
              onUpdated={handleWorkflowUpdated}
              onResubmit={
                onEdit
                  ? s => {
                      onClose();
                      onEdit(s);
                    }
                  : undefined
              }
            />

            {(deliveredUnits > 0 || remainingUnits < liveSale.units) && (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex justify-between items-center bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                  <span className="text-xs font-semibold text-emerald-700">Delivered Units:</span>
                  <span className="text-sm font-bold text-emerald-800">{deliveredUnits.toLocaleString()}</span>
                </div>
                {remainingUnits > 0 && (
                  <div className="flex justify-between items-center bg-amber-50 p-3 rounded-xl border border-amber-100">
                    <span className="text-xs font-semibold text-amber-700">Remaining Units:</span>
                    <span className="text-sm font-bold text-amber-800">{remainingUnits.toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            {liveSale.serviceCharge !== undefined && liveSale.serviceCharge > 0 && (
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-xs font-semibold text-slate-500">Service Charge:</span>
                <span className="text-sm font-bold text-slate-700">{formatAED(liveSale.serviceCharge)}</span>
              </div>
            )}
          </div>

          {/* Right Column: Image Previews */}
          <div className="flex flex-col gap-6 lg:border-l lg:pl-8 lg:border-slate-100">
            {/* Original Order Image */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Original Order Image (Branch Upload)</p>
              {liveSale.imageUrl ? (
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  <a href={liveSale.imageUrl} target="_blank" rel="noopener noreferrer">
                    <img src={liveSale.imageUrl} alt="Order proof" className="absolute inset-0 h-full w-full object-contain hover:opacity-90 transition-opacity" />
                  </a>
                </div>
              ) : (
                <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50/50 text-slate-400 text-xs font-medium">
                  No original image uploaded
                </div>
              )}
            </div>

            {/* Delivery Proof */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Delivery/Payment Proof (Agent Upload)</p>
              {showDeliveryProofPending ? (
                <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50/50 text-slate-500 text-xs font-medium">
                  Pending
                </div>
              ) : canShowDeliveryProof ? (
                <>
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <a href={liveSale.deliveryImageUrl} target="_blank" rel="noopener noreferrer">
                      <img src={liveSale.deliveryImageUrl} alt="Delivery proof" className="absolute inset-0 h-full w-full object-contain hover:opacity-90 transition-opacity" />
                    </a>
                  </div>
                  <ProofImageActions
                    imageUrl={liveSale.deliveryImageUrl!}
                    downloadFilename={`payment-proof-${getFormattedTxnId(liveSale.id, 'sale', liveSale, branches)}`}
                    enableShare
                    shareTitle="Payment proof"
                    shareText={`Payment proof for order ${getFormattedTxnId(liveSale.id, 'sale', liveSale, branches)}`}
                    enableWhatsApp={phoneChecked}
                    whatsappPhone={customerPhone ?? undefined}
                    whatsappMessage={`Hello ${orderCustomerName || customerName || ''}, here is the payment proof for your order ${getFormattedTxnId(liveSale.id, 'sale', liveSale, branches)}: ${liveSale.deliveryImageUrl}`.trim()}
                    onCopySuccess={() => showToast('Image copied')}
                    onCopyError={msg => showToast(msg, 'error')}
                    onDownloadError={msg => showToast(msg, 'error')}
                    onShareError={msg => showToast(msg, 'error')}
                  />
                </>
              ) : (
                <div className="flex aspect-[4/3] w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50/50 text-slate-400 text-xs font-medium">
                  No delivery proof image uploaded
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={confirmDeleteOpen}
        title="Delete Sale"
        message="Are you sure you want to delete this sale? This action cannot be undone."
        confirmLabel="Delete Sale"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </>
  );
}
