'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { btnPrimary, btnSecondary, formInput, dataTable, tableWrap } from '@/lib/ui';
import AddStockModal from './AddStockModal';

interface TaxInvoiceModalProps {
  open: boolean;
  onClose: () => void;
}

const InputField = ({ label, children }: { label: string, children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</label>
    {children}
  </div>
);

export default function TaxInvoiceModal({ open, onClose }: TaxInvoiceModalProps) {
  const [activeTab, setActiveTab] = useState<'stock' | 'other' | 'doc'>('stock');
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);

  // Form State
  const [docNo, setDocNo] = useState('TIS/2026/005942');
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0]);
  const [currency, setCurrency] = useState('USD');
  const [salesMan, setSalesMan] = useState('');
  const [department, setDepartment] = useState('Consumable Department');
  const [vatType, setVatType] = useState('Unregistered');
  const [orderType, setOrderType] = useState('Fixed');
  const [refNo, setRefNo] = useState('');
  
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerDetails, setCustomerDetails] = useState('');
  
  const [terms, setTerms] = useState('0');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [declNo, setDeclNo] = useState('');
  const [remarks, setRemarks] = useState('');

  const [postFixingHedge, setPostFixingHedge] = useState(false);
  const [hedgeRate, setHedgeRate] = useState('0.00');
  const [hedgePremium, setHedgePremium] = useState('0.00');
  const [fheDocNo, setFheDocNo] = useState('');

  // Tax/VAT Manual Overrides
  const [manualAedRate, setManualAedRate] = useState('');
  const [manualVatUsd, setManualVatUsd] = useState('');
  const [manualVatAed, setManualVatAed] = useState('');

  // Summaries & Calculations
  const totalGrossAmount = invoiceItems.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
  const totalOtherCharges = 0; // Stub for other charges tab
  const netAmount = totalGrossAmount + totalOtherCharges;
  
  const calcVatUsd = invoiceItems.reduce((acc, item) => acc + (parseFloat(item.mkgAmt) * 0.05 || 0), 0); // Mock VAT calc on making charge
  const calcAedRate = 3.6725;
  const calcVatAed = calcVatUsd * calcAedRate;

  const displayAedRate = manualAedRate !== '' ? manualAedRate : calcAedRate.toFixed(4);
  const displayVatUsd = manualVatUsd !== '' ? manualVatUsd : calcVatUsd.toFixed(2);
  const displayVatAed = manualVatAed !== '' ? manualVatAed : calcVatAed.toFixed(2);

  const handleAddStock = (itemData: any) => {
    setInvoiceItems([...invoiceItems, itemData]);
  };

  const handleDeleteItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };


  return (
    <>
      <Modal 
        open={open} 
        onClose={onClose} 
        title="New Tax Invoice"
        maxWidth="max-w-[1200px] w-[96vw]"
        footer={
          <>
            <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
            <button type="button" onClick={onClose} className={btnPrimary}>Save Invoice</button>
          </>
        }
      >
        <div className="space-y-8 min-w-[800px]">
          
          {/* Top Section: Customer & Document Details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Customer Details */}
            <div className="lg:col-span-4 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Customer Info</h3>
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <input 
                    type="text" 
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search customer..."
                    className={`${formInput} w-full pr-10`}
                  />
                  <div className="absolute right-0 top-0 h-full w-10 flex items-center justify-center text-slate-400">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </div>
                </div>
                <textarea 
                  rows={4}
                  value={customerDetails}
                  onChange={(e) => setCustomerDetails(e.target.value)}
                  placeholder="Customer address and details..."
                  className={`${formInput} w-full resize-none`}
                />
              </div>
            </div>

            {/* Document Details */}
            <div className="lg:col-span-8 space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Document Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InputField label="Doc No">
                  <input type="text" value={docNo} readOnly className={`${formInput} w-full bg-slate-50 font-mono text-slate-500`} />
                </InputField>
                <InputField label="Order Type">
                  <select value={orderType} onChange={(e) => setOrderType(e.target.value)} className={`${formInput} w-full`}>
                    <option value="Fixed">Fixed</option>
                    <option value="Unfixed">Unfixed</option>
                  </select>
                </InputField>
                <InputField label="Doc Date">
                  <input type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} className={`${formInput} w-full`} />
                </InputField>
                <InputField label="Currency">
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={`${formInput} w-full`}>
                    <option value="USD">USD</option>
                    <option value="AED">AED</option>
                  </select>
                </InputField>
                <InputField label="Sales Man">
                  <input type="text" value={salesMan} onChange={(e) => setSalesMan(e.target.value)} className={`${formInput} w-full`} />
                </InputField>
                <InputField label="Ref No">
                  <input type="text" value={refNo} onChange={(e) => setRefNo(e.target.value)} className={`${formInput} w-full`} />
                </InputField>
                <InputField label="Department">
                  <select value={department} onChange={(e) => setDepartment(e.target.value)} className={`${formInput} w-full`}>
                    <option value="Consumable Department">Consumable Department</option>
                    <option value="Jewellery Department">Jewellery Department</option>
                    <option value="Bullion Trading">Bullion Trading</option>
                  </select>
                </InputField>
                <InputField label="VAT Type">
                  <select value={vatType} onChange={(e) => setVatType(e.target.value)} className={`${formInput} w-full`}>
                    <option value="Unregistered">Unregistered</option>
                    <option value="Registered">Registered</option>
                    <option value="Zero Rated">Zero Rated</option>
                  </select>
                </InputField>
              </div>
            </div>
          </div>

          {/* Middle Section: Tabs & Table */}
          <div className="flex flex-col gap-4">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-100 pb-2">
              <button 
                className={`px-4 py-1.5 text-sm font-bold rounded-full transition-colors ${activeTab === 'stock' ? 'bg-accent text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                onClick={() => setActiveTab('stock')}
              >
                Stock Details
              </button>
              <button 
                className={`px-4 py-1.5 text-sm font-bold rounded-full transition-colors ${activeTab === 'other' ? 'bg-accent text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                onClick={() => setActiveTab('other')}
              >
                Other Charges
              </button>
              <button 
                className={`px-4 py-1.5 text-sm font-bold rounded-full transition-colors ${activeTab === 'doc' ? 'bg-accent text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                onClick={() => setActiveTab('doc')}
              >
                Document
              </button>
            </div>
            
            {/* Table Area */}
            {activeTab === 'stock' && (
              <div className="flex flex-col gap-3">
                <div className={tableWrap}>
                  <table className={`${dataTable} w-full`}>
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-400">Stock Code</th>
                        <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-400">Pieces</th>
                        <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-400">Gross Qty</th>
                        <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-400">Pure Qty</th>
                        <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-400">Mkg Amount</th>
                        <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-400">Mtl Amount</th>
                        <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-400">Amount (USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 group">
                          <td className="border-t border-slate-100 px-4 py-3 text-sm font-medium text-slate-700">
                            {item.productCode}
                            <button onClick={() => handleDeleteItem(idx)} className="ml-3 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="inline"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </button>
                          </td>
                          <td className="border-t border-slate-100 px-4 py-3 text-sm text-center text-slate-600">{item.piecesStr}</td>
                          <td className="border-t border-slate-100 px-4 py-3 text-sm text-right text-slate-600">{parseFloat(item.grossQtyStr).toFixed(3)}</td>
                          <td className="border-t border-slate-100 px-4 py-3 text-sm text-right text-slate-600">{item.pureQty.toFixed(3)}</td>
                          <td className="border-t border-slate-100 px-4 py-3 text-sm text-right text-slate-600">{item.mkgAmt.toFixed(2)}</td>
                          <td className="border-t border-slate-100 px-4 py-3 text-sm text-right text-slate-600">{item.mtlAmt.toFixed(2)}</td>
                          <td className="border-t border-slate-100 px-4 py-3 text-sm text-right font-bold text-slate-900">{item.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                      {invoiceItems.length === 0 && (
                        <tr>
                          <td colSpan={7} className="border-t border-slate-100 px-4 py-8 text-center text-sm text-slate-400">
                            No items added. Click 'Add Item' to begin.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button onClick={() => setIsAddStockOpen(true)} className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-accent bg-accent/10 rounded-lg hover:bg-accent hover:text-white transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                    Add Item
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Section: Footer Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t border-slate-100">
            
            {/* Terms / Dates */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Billing Terms</h4>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Terms (Days)">
                  <input type="number" value={terms} onChange={(e) => setTerms(e.target.value)} className={`${formInput} w-full`} />
                </InputField>
                <InputField label="Due Date">
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={`${formInput} w-full`} />
                </InputField>
                <div className="col-span-2">
                  <InputField label="Decl No">
                    <input type="text" value={declNo} onChange={(e) => setDeclNo(e.target.value)} className={`${formInput} w-full`} />
                  </InputField>
                </div>
              </div>
            </div>

            {/* Hedge Details */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Hedge Details</h4>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer mb-1">
                  <input type="checkbox" checked={postFixingHedge} onChange={(e) => setPostFixingHedge(e.target.checked)} className="rounded border-slate-300 text-accent focus:ring-accent w-4 h-4" />
                  Post Fixing Hedge
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <InputField label="Rate">
                    <input type="number" step="0.01" value={hedgeRate} onChange={(e) => setHedgeRate(e.target.value)} className={`${formInput} w-full`} />
                  </InputField>
                  <InputField label="Premium">
                    <input type="number" step="0.01" value={hedgePremium} onChange={(e) => setHedgePremium(e.target.value)} className={`${formInput} w-full`} />
                  </InputField>
                </div>
                <InputField label="FHE Doc No">
                  <div className="flex gap-2">
                    <input type="text" value={fheDocNo} onChange={(e) => setFheDocNo(e.target.value)} className={`${formInput} flex-1`} />
                    <button className="px-3 bg-slate-100 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors">RMK</button>
                  </div>
                </InputField>
              </div>
            </div>

            {/* VAT Details */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Tax / VAT</h4>
              <div className="flex flex-col gap-3">
                <InputField label="AED Rate">
                  <input type="number" step="0.0001" value={displayAedRate} onChange={(e) => setManualAedRate(e.target.value)} className={`${formInput} w-full`} />
                </InputField>
                <InputField label="VAT (AED)">
                  <input type="number" step="0.01" value={displayVatAed} onChange={(e) => setManualVatAed(e.target.value)} className={`${formInput} w-full`} />
                </InputField>
                <InputField label="VAT (USD)">
                  <input type="number" step="0.01" value={displayVatUsd} onChange={(e) => setManualVatUsd(e.target.value)} className={`${formInput} w-full`} />
                </InputField>
              </div>
            </div>

            {/* Amount Summary */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Amount Summary</h4>
              <div className="flex flex-col gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-slate-500">Gross Amount</span>
                  <span className="font-bold text-slate-700">${totalGrossAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-semibold text-slate-500">Other Charges</span>
                  <span className="font-bold text-slate-700">${totalOtherCharges.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div className="border-t border-slate-200 my-1"></div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">Net Amount</span>
                  <span className="text-lg font-black text-emerald-600">${netAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
              </div>
            </div>
            
          </div>
          
          {/* Remarks Bottom */}
          <div className="border-t border-slate-100 pt-4">
            <InputField label="Remarks">
              <textarea 
                rows={2} 
                value={remarks} 
                onChange={(e) => setRemarks(e.target.value)} 
                placeholder="Add any additional notes or remarks here..."
                className={`${formInput} w-full resize-none`} 
              />
            </InputField>
          </div>

        </div>
      </Modal>

      {/* Internal "Add Stock" modal for inserting rows */}
      {isAddStockOpen && (
        <AddStockModal
          open={isAddStockOpen}
          onClose={() => setIsAddStockOpen(false)}
          onSave={handleAddStock}
        />
      )}
    </>
  );
}
