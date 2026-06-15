'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import { btnSecondary, dataTable, tableWrap } from '@/lib/ui';

interface ViewInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  invoice: any;
}

export default function ViewInvoiceModal({ open, onClose, invoice }: ViewInvoiceModalProps) {
  const params = useParams();
  const rawSlug = params?.slug as string || '';
  const branchName = rawSlug ? rawSlug.replace(/-/g, ' ').toUpperCase() : 'BULLION';

  if (!invoice) return null;

  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      title="Tax Invoice"
      maxWidth="max-w-[900px] w-[95vw]"
      footer={
        <>
          <button type="button" onClick={onClose} className={btnSecondary}>Close</button>
          <button type="button" className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-md transition-colors hover:bg-slate-800">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Print
          </button>
        </>
      }
    >
      <div className="bg-white p-2 sm:p-6 text-slate-800">
        
        {/* Header Area */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-200 pb-8 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Tax Invoice</h1>
            <p className="text-slate-500 text-sm mt-1 font-medium">{invoice.orderType} Order</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-accent">{branchName}</div>
            <p className="text-sm text-slate-500 mt-1">Gold & Diamond Park, Dubai, UAE</p>
            <p className="text-sm text-slate-500">TRN: 100000000000003</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          
          {/* Customer */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Invoice To</h3>
            <p className="font-bold text-lg text-slate-900">{invoice.customerSearch || 'Cash Customer'}</p>
            {invoice.customerDetails && (
              <p className="text-sm text-slate-600 mt-1 whitespace-pre-line">{invoice.customerDetails}</p>
            )}
          </div>

          {/* Details */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
              <div className="text-slate-500 font-medium">Invoice Number:</div>
              <div className="font-bold text-right text-slate-900">{invoice.docNo}</div>
              
              <div className="text-slate-500 font-medium">Date:</div>
              <div className="font-bold text-right text-slate-900">{invoice.docDate}</div>
              
              <div className="text-slate-500 font-medium">Currency:</div>
              <div className="font-bold text-right text-slate-900">{invoice.currency}</div>
              
              <div className="text-slate-500 font-medium">Terms:</div>
              <div className="font-bold text-right text-slate-900">{invoice.terms} Days (Due {invoice.dueDate})</div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-10">
          <div className={tableWrap}>
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="py-3 px-2 font-bold text-slate-900 w-12 text-center">#</th>
                  <th className="py-3 px-2 font-bold text-slate-900">Description</th>
                  <th className="py-3 px-2 font-bold text-slate-900 text-right">Purity</th>
                  <th className="py-3 px-2 font-bold text-slate-900 text-right">Gross (g)</th>
                  <th className="py-3 px-2 font-bold text-slate-900 text-right">Mkg ($)</th>
                  <th className="py-3 px-2 font-bold text-slate-900 text-right">Total ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items && invoice.items.length > 0 ? (
                  invoice.items.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-4 px-2 text-center font-medium text-slate-500">{idx + 1}</td>
                      <td className="py-4 px-2">
                        <p className="font-bold text-slate-800">{item.productCode}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{item.piecesStr} Pieces</p>
                      </td>
                      <td className="py-4 px-2 text-right text-slate-600">{item.purityStr}</td>
                      <td className="py-4 px-2 text-right text-slate-600">{parseFloat(item.grossQtyStr).toFixed(3)}</td>
                      <td className="py-4 px-2 text-right text-slate-600">{item.mkgAmt.toFixed(2)}</td>
                      <td className="py-4 px-2 text-right font-bold text-slate-900">{item.amount.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 italic">No items found in this invoice.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals & Remarks */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          <div className="md:col-span-7">
            {invoice.remarks && (
              <div className="mb-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Remarks</h3>
                <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">{invoice.remarks}</p>
              </div>
            )}
            
            <div className="space-y-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Hedge Information</h3>
              <div className="text-sm text-slate-600">
                <span className="font-medium mr-2">Fixed Rate:</span> ${invoice.hedgeRate || '0.00'}
              </div>
              <div className="text-sm text-slate-600">
                <span className="font-medium mr-2">Premium:</span> ${invoice.hedgePremium || '0.00'}
              </div>
            </div>
          </div>

          <div className="md:col-span-5 bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-600 font-medium">Subtotal</span>
              <span className="font-bold text-slate-900">${(invoice.totalGrossAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-600 font-medium">VAT (USD) @ 5%</span>
              <span className="font-bold text-slate-900">${(parseFloat(invoice.vatUsd) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200">
              <span className="text-slate-600 font-medium text-xs">VAT (AED eqv.)</span>
              <span className="font-bold text-slate-500 text-xs">{parseFloat(invoice.vatAed).toLocaleString(undefined, {minimumFractionDigits: 2})} AED</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-lg font-black text-slate-900">Net Amount</span>
              <span className="text-2xl font-black text-accent">${(invoice.netAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
          </div>

        </div>

      </div>
    </Modal>
  );
}
