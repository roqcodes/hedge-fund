'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import { btnSecondary, dataTable, tableWrap } from '@/lib/ui';
import { useApp } from '@/context/AppContext';
import CustomerLink from '@/components/customers/CustomerLink';

interface ViewInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  invoice: any;
}

export default function ViewInvoiceModal({ open, onClose, invoice }: ViewInvoiceModalProps) {
  const params = useParams();
  const rawSlug = params?.slug as string || '';
  const { branches } = useApp();

  const branch = branches.find((b: any) => (b.slug || b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')) === rawSlug);
  const branchName = branch ? branch.name : (rawSlug ? rawSlug.replace(/-/g, ' ').toUpperCase() : 'BULLION');
  const branchLogo = branch?.logo_url;

  if (!invoice) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Tax Invoice"
      maxWidth="max-w-[900px] w-[95vw]"
      footer={
        <>
          <button type="button" onClick={onClose} className={`${btnSecondary} print:hidden`}>Close</button>
          <button type="button" onClick={() => {
            const printContent = document.getElementById('invoice-print-area');
            if (printContent) {
              const printWindow = window.open('', '_blank');
              if (printWindow) {
                const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map(s => s.outerHTML).join('');
                printWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>Tax Invoice - ${invoice.doc_no || 'Document'}</title>
                      ${styles}
                      <style>
                        body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        @media print {
                          body { padding: 0; margin: 0; }
                          @page { margin: 10mm; }
                        }
                      </style>
                    </head>
                    <body class="bg-white text-slate-900">
                      <div class="p-8">
                        ${printContent.innerHTML}
                      </div>
                      <script>
                        // Wait briefly for styles to load, then print and close
                        setTimeout(() => {
                          window.print();
                          window.close();
                        }, 250);
                      </script>
                    </body>
                  </html>
                `);
                printWindow.document.close();
              }
            }
          }} className="print:hidden inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-md transition-colors hover:bg-slate-800">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Print / PDF
          </button>
        </>
      }
    >
      <div id="invoice-print-area" className="bg-white p-4 sm:p-10 text-slate-800 font-sans max-w-5xl mx-auto">

        {/* Header Area */}
        <div className="flex flex-col sm:flex-row justify-between items-start text-xs text-slate-600 mb-12">
          <div className="space-y-1 sm:w-1/3">
            <div className="font-bold text-slate-900 uppercase tracking-wide text-sm">{branchName}</div>
            <div>{branch?.address || 'Gold & Diamond Park'}</div>
            <div>{[branch?.city || 'Dubai', branch?.country || 'UAE'].filter(Boolean).join(', ')}</div>
            <div>TRN: {branch?.trn || '100000000000003'}</div>
          </div>
          
          <div className="flex-1 flex justify-center sm:w-1/3">
            {branchLogo && (
              <img src={branchLogo} alt={`${branchName} Logo`} className="h-16 object-contain" />
            )}
          </div>

          <div className="text-right space-y-1 mt-4 sm:mt-0 sm:w-1/3">
            <div className="font-bold text-slate-900 uppercase tracking-wide text-sm">Customer Service</div>
            <div>Tel: {branch?.phone || '+971 4 123 4567'}</div>
            <div>Email: {branch?.email || `support@${branchName.toLowerCase().replace(/\s/g, '')}.com`}</div>
            {branch?.website && <div>Web: {branch.website}</div>}
          </div>
        </div> 

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-lg sm:text-xl font-medium text-slate-900 tracking-[0.15em]">TAX INVOICE</h1>
        </div>

        {/* Horizontal Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 border-t border-b border-slate-200 py-4 mb-8 text-xs">
          <div>
            <div className="text-slate-400 font-bold uppercase tracking-wider mb-1">Date</div>
            <div className="text-slate-900 font-medium">{invoice.doc_date ? new Date(invoice.doc_date).toLocaleDateString() : '-'}</div>
          </div>
          <div>
            <div className="text-slate-400 font-bold uppercase tracking-wider mb-1">Invoice Number</div>
            <div className="text-slate-900 font-medium">{invoice.doc_no}</div>
          </div>
          <div>
            <div className="text-slate-400 font-bold uppercase tracking-wider mb-1">Trade Type</div>
            <div className="text-slate-900 font-medium capitalize">{invoice.trade_type === 'buy' ? 'Buy' : 'Sell'}</div>
          </div>
          <div>
            <div className="text-slate-400 font-bold uppercase tracking-wider mb-1">Order Type</div>
            <div className="text-slate-900 font-medium">{invoice.order_type}</div>
          </div>
          <div>
            <div className="text-slate-400 font-bold uppercase tracking-wider mb-1">Bill To</div>
            <div className="text-slate-900 font-medium whitespace-pre-line">
              {invoice.customer_id ? (
                <CustomerLink
                  slug={rawSlug}
                  customerId={invoice.customer_id}
                  customerName={invoice.customer_details?.split('\n')[0] || 'Customer'}
                />
              ) : (
                invoice.customer_details || 'Cash Customer'
              )}
            </div>
          </div>
          <div>
            <div className="text-slate-400 font-bold uppercase tracking-wider mb-1">Currency</div>
            <div className="text-slate-900 font-medium">{invoice.currency}</div>
          </div>
        </div>

        {/* Greeting */}
        <div className="mb-10 text-sm text-slate-600 leading-relaxed">
          <p className="font-bold text-slate-900 mb-2">Dear {invoice.customer_details ? invoice.customer_details.split('\n')[0] : 'Customer'},</p>
          <p>Thank you for your order with {branchName}.</p>
          <p className="mt-2">
            This document serves as your official tax invoice.
            {invoice.fixing_type === 'Premium' ? ' This order has been premium fixed.' : ''}
            {invoice.terms ? ` Payment terms are ${invoice.terms} days.` : ''}
          </p>
        </div>

        {/* Items Table */}
        <div className="mb-10">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400">
                <th className="py-3 font-medium uppercase tracking-wider">Product</th>
                <th className="py-3 font-medium uppercase tracking-wider text-right">Purity</th>
                <th className="py-3 font-medium uppercase tracking-wider text-right">Gross Wt</th>
                <th className="py-3 font-medium uppercase tracking-wider text-right">Pure Wt</th>
                <th className="py-3 font-medium uppercase tracking-wider text-right">Total ({invoice.currency})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.items && invoice.items.length > 0 ? (
                invoice.items.map((item: any, idx: number) => (
                  <tr key={idx} className="text-slate-600">
                    <td className="py-4 pr-4">
                      <div className="font-medium text-slate-900">{item.productCode || item.product_code}</div>
                      <div className="text-xs mt-0.5">{item.piecesStr || item.pieces || 1} Pieces</div>
                    </td>
                    <td className="py-4 text-right">{parseFloat(item.purityStr || item.purity || '0').toFixed(7)}</td>
                    <td className="py-4 text-right">{parseFloat(item.grossQtyStr || item.gross_qty || '0').toFixed(3)}</td>
                    <td className="py-4 text-right">{(parseFloat(item.pureQty || item.pure_qty) || 0).toFixed(7)}</td>
                    <td className="py-4 text-right font-medium text-slate-900">{(parseFloat(item.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 italic">No items found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals & Extra Details */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-12 mt-12 border-t border-slate-200 pt-8">

          <div className="flex-1 space-y-6 text-xs sm:text-sm w-full">
            {invoice.remarks && (
              <div>
                <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-2">Remarks</h4>
                <p className="text-slate-600 whitespace-pre-wrap">{invoice.remarks}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
              {invoice.department && (
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Department</span>
                  <span className="text-slate-900">{invoice.department}</span>
                </div>
              )}
              {invoice.sales_man && (
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Sales Rep</span>
                  <span className="text-slate-900">{invoice.sales_man}</span>
                </div>
              )}
              {invoice.vat_type && (
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">VAT Type</span>
                  <span className="text-slate-900">{invoice.vat_type}</span>
                </div>
              )}
              {invoice.decl_no && (
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Decl No</span>
                  <span className="text-slate-900">{invoice.decl_no}</span>
                </div>
              )}
              {invoice.terms && (
                <div className="col-span-2">
                  <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Payment Terms</span>
                  <span className="text-slate-900">{invoice.terms} Days (Due {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'})</span>
                </div>
              )}
              {(invoice.hedgeRate || invoice.hedgePremium) && (
                <div className="col-span-2 mt-2 pt-4 border-t border-slate-100">
                  <span className="text-slate-400 font-bold uppercase tracking-wider block mb-2">Hedge Information</span>
                  <div className="flex gap-8">
                    <div>
                      <span className="text-slate-500 mr-2">Fixed Rate:</span>
                      <span className="text-slate-900 font-medium">${invoice.hedgeRate || '0.00'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 mr-2">Premium:</span>
                      <span className="text-slate-900 font-medium">${invoice.hedgePremium || '0.00'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="text-slate-400 pt-4">
              Thank you for choosing {branchName}.
            </div>
          </div>

          <div className="w-full sm:w-80 shrink-0">
            <div className="bg-slate-50 p-6">
              <div className="flex justify-between items-center mb-3 text-sm">
                <span className="text-slate-600">Subtotal excl. VAT</span>
                <span className="font-medium text-slate-900">${(parseFloat(invoice.gross_amt) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center mb-4 text-sm pb-4 border-b border-slate-200">
                <span className="text-slate-600">Applicable VAT @ 5%</span>
                <span className="font-medium text-slate-900">${(parseFloat(invoice.tax_amt) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-slate-900">Total incl. VAT</span>
                <span className="font-bold text-slate-900">${(parseFloat(invoice.net_amt_dc) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-xs mt-2 text-slate-500">
                <span>VAT in AED</span>
                <span>{((parseFloat(invoice.tax_amt) || 0) * 3.6725).toLocaleString(undefined, { minimumFractionDigits: 2 })} AED</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </Modal>
  );
}
