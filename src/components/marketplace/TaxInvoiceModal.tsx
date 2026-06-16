'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { btnPrimary, btnSecondary, formInput, dataTable, tableWrap } from '@/lib/ui';
import AddStockModal from './AddStockModal';

import { saveTaxInvoice } from '@/app/actions/marketplaceActions';

interface TaxInvoiceModalProps {
  slug: string;
  open: boolean;
  onClose: () => void;
  onSave?: (invoice: any) => void;
  availableStocks?: any[];
}

const InputField = ({ label, children }: { label: string, children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</label>
    {children}
  </div>
);

export default function TaxInvoiceModal({ slug, open, onClose, onSave, availableStocks = [] }: TaxInvoiceModalProps) {
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
  const [refDate, setRefDate] = useState(new Date().toISOString().split('T')[0]);
  const [fixingType, setFixingType] = useState('Standard');
  
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

  // Auto-calculate Hedge Details when items change
  useEffect(() => {
    if (invoiceItems.length > 0) {
      const currentRate = parseFloat(hedgeRate) || 0;
      const currentPremium = parseFloat(hedgePremium) || 0;
      
      // Auto-fill only if they are currently 0 (meaning untouched)
      if (currentRate === 0 && currentPremium === 0) {
        setHedgeRate(invoiceItems[0].spotPriceStr || '0.00');
        setHedgePremium(invoiceItems[0].premiumStr || '0.00');
      }
    } else if (invoiceItems.length === 0) {
      setHedgeRate('0.00');
      setHedgePremium('0.00');
    }
  }, [invoiceItems, hedgeRate, hedgePremium]);

  // Tax/VAT Manual Overrides
  const [manualAedRate, setManualAedRate] = useState('');
  const [manualVatUsd, setManualVatUsd] = useState('');
  const [manualVatAed, setManualVatAed] = useState('');

  // New Image Analysis States
  const [cashPay, setCashPay] = useState('');
  const [bankPay, setBankPay] = useState('');
  const [ccPay, setCcPay] = useState('');

  // Summaries & Calculations
  const parsedHedgeRate = parseFloat(hedgeRate) || 0;
  const parsedHedgePremium = parseFloat(hedgePremium) || 0;
  
  const effectiveItems = invoiceItems.map(item => {
    // Hedge Rate and Premium act as master overrides for the invoice items
    const spot = parsedHedgeRate > 0 ? parsedHedgeRate : (parseFloat(item.spotPriceStr) || 0);
    const premium = parsedHedgePremium > 0 ? parsedHedgePremium : (parseFloat(item.premiumStr) || 0);
    const purity = parseFloat(item.purityStr) || 0;
    const grossQty = parseFloat(item.grossQtyStr) || 0;
    
    const purityDecimal = purity > 1 ? purity / 1000 : purity;
    const pureQty = grossQty * purityDecimal;
    const mtlAmt = ((spot + premium) / 31.1034768) * pureQty;
    const amount = mtlAmt + (parseFloat(item.mkgAmt) || 0);

    return { ...item, pureQty, mtlAmt, amount };
  });

  const totalGrossWt = effectiveItems.reduce((acc, item) => acc + (parseFloat(item.grossQtyStr) || 0), 0);
  const totalPureWt = effectiveItems.reduce((acc, item) => acc + (item.pureQty || 0), 0);
  const totalMkgAmt = effectiveItems.reduce((acc, item) => acc + (item.mkgAmt || 0), 0);
  const totalMtlAmt = effectiveItems.reduce((acc, item) => acc + (item.mtlAmt || 0), 0);

  const totalGrossAmount = effectiveItems.reduce((acc, item) => acc + (item.amount || 0), 0);
  const totalOtherCharges = 0; // Stub for other charges tab
  
  const preTaxAmount = totalGrossAmount + totalOtherCharges;

  // Tax is on Total amount
  const baseVatUsd = preTaxAmount * 0.05;
  const baseAedRate = 3.6725;

  const activeAedRate = manualAedRate !== '' ? parseFloat(manualAedRate) || 0 : baseAedRate;
  
  let activeVatUsd = baseVatUsd;
  let activeVatAed = activeVatUsd * activeAedRate;

  if (manualVatUsd !== '') {
    activeVatUsd = parseFloat(manualVatUsd) || 0;
    activeVatAed = activeVatUsd * activeAedRate;
  } else if (manualVatAed !== '') {
    activeVatAed = parseFloat(manualVatAed) || 0;
    activeVatUsd = activeVatAed / (activeAedRate || 1);
  }

  const displayAedRate = manualAedRate !== '' ? manualAedRate : activeAedRate.toFixed(4);
  const displayVatUsd = manualVatUsd !== '' ? manualVatUsd : activeVatUsd.toFixed(2);
  const displayVatAed = manualVatAed !== '' ? manualVatAed : activeVatAed.toFixed(2);

  const netAmount = preTaxAmount + activeVatUsd;
  const netAmountBc = netAmount * activeAedRate;

  const parsedCash = parseFloat(cashPay) || 0;
  const parsedBank = parseFloat(bankPay) || 0;
  const parsedCc = parseFloat(ccPay) || 0;
  let partyAmount = netAmount - parsedCash - parsedBank - parsedCc;
  if (Math.abs(partyAmount) < 0.005) {
    partyAmount = 0;
  }

  const [isDirty, setIsDirty] = useState(false);

  const handleAddStock = (itemData: any) => {
    setInvoiceItems([...invoiceItems, itemData]);
    setIsDirty(true);
  };

  const handleDeleteItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const handleClose = () => {
    if (isDirty) {
      if (window.confirm('You have unsaved changes. Are you sure you want to discard them?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveInvoice = async () => {
    // Strict Frontend Validations
    if (!docNo || docNo.trim() === '') {
      alert('Please enter a valid Document Number (Doc No).');
      return;
    }
    if (!docDate) {
      alert('Please select a valid Document Date.');
      return;
    }
    if (effectiveItems.length === 0) {
      alert('Cannot save an empty invoice. Please add at least one stock item.');
      return;
    }

    setIsSaving(true);
    const invoiceData = {
      doc_no: docNo.trim(), doc_date: docDate, currency, sales_man: salesMan, 
      department, vat_type: vatType, order_type: orderType, ref_no: refNo, ref_date: refDate,
      customer_details: customerDetails, fixing_type: fixingType,
      terms, due_date: dueDate, decl_no: declNo, remarks,
      postFixingHedge, hedgeRate, hedgePremium, fheDocNo,
      items: effectiveItems.map(item => ({
        ...item,
        pieces: parseInt(item.piecesStr) || 1,
        purity: parseFloat(item.purityStr) || 0,
        grossQty: parseFloat(item.grossQtyStr) || 0,
        mkgRate: parseFloat(item.mkgRateStr) || 0,
        taxAmt: (item.amount || 0) * 0.05,
        netAmt: (item.amount || 0) * 1.05
      })),
      gross_wt: totalGrossWt, pure_wt: totalPureWt,
      add_chrg: totalOtherCharges, mkg_chrg: totalMkgAmt, gold_value: totalMtlAmt,
      gross_amt: totalGrossAmount, discount_percent: 0,
      discount_amt: 0,
      net_amt_dc: netAmount, net_amt_bc: netAmountBc, tax_amt: activeVatUsd,
      cash_pay: parsedCash, bank_pay: parsedBank, cc_pay: parsedCc, party_pay: partyAmount
    };

    const res = await saveTaxInvoice(invoiceData, slug);
    setIsSaving(false);

    if (res.success) {
      if (onSave) onSave(invoiceData);
      onClose();
    } else {
      alert('Failed to save invoice: ' + res.error);
    }
  };

  return (
    <>
      <Modal 
        open={open} 
        onClose={handleClose} 
        title="New Tax Invoice"
        maxWidth="max-w-[1200px] w-[96vw]"
        footer={
          <>
            <button type="button" onClick={handleClose} className={btnSecondary}>Cancel</button>
            <button type="button" onClick={handleSaveInvoice} disabled={isSaving} className={`${btnPrimary} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {isSaving ? 'Saving...' : 'Save Invoice'}
            </button>
          </>
        }
      >
        <div className="space-y-8" onChange={() => setIsDirty(true)}>
          
          {/* Top Section: Customer & Document Details */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Customer Details */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Customer Info</h3>
              <div className="flex flex-col gap-3 flex-1">
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
                  value={customerDetails}
                  onChange={(e) => setCustomerDetails(e.target.value)}
                  placeholder="Customer address and details..."
                  className={`${formInput} w-full resize-none flex-1 min-h-[120px]`}
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
                <InputField label="Ref Date">
                  <input type="date" value={refDate} onChange={(e) => setRefDate(e.target.value)} className={`${formInput} w-full`} />
                </InputField>
                <InputField label="Fixing Type">
                  <select value={fixingType} onChange={(e) => setFixingType(e.target.value)} className={`${formInput} w-full`}>
                    <option value="Standard">Standard</option>
                    <option value="Premium">Premium</option>
                  </select>
                </InputField>
                <div className="col-span-2 md:col-span-2">
                  <InputField label="Department">
                    <select value={department} onChange={(e) => setDepartment(e.target.value)} className={`${formInput} w-full`}>
                      <option value="Consumable Department">Consumable Department</option>
                      <option value="Jewellery Department">Jewellery Department</option>
                      <option value="Bullion Trading">Bullion Trading</option>
                    </select>
                  </InputField>
                </div>
                <div className="col-span-2 md:col-span-2">
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
                      {effectiveItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 group">
                          <td className="border-t border-slate-100 px-4 py-3 text-sm font-medium text-slate-700">
                            {item.productCode}
                            <button onClick={() => handleDeleteItem(idx)} className="ml-3 text-red-500 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="inline"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </button>
                          </td>
                          <td className="border-t border-slate-100 px-4 py-3 text-sm text-center text-slate-600">{item.piecesStr}</td>
                          <td className="border-t border-slate-100 px-4 py-3 text-sm text-right text-slate-600">{parseFloat(item.grossQtyStr).toFixed(3)}</td>
                          <td className="border-t border-slate-100 px-4 py-3 text-sm text-right text-slate-600">{(item.pureQty || 0).toFixed(7)}</td>
                          <td className="border-t border-slate-100 px-4 py-3 text-sm text-right text-slate-600">{item.mkgAmt.toFixed(2)}</td>
                          <td className="border-t border-slate-100 px-4 py-3 text-sm text-right text-slate-600">{item.mtlAmt.toFixed(2)}</td>
                          <td className="border-t border-slate-100 px-4 py-3 text-sm text-right font-bold text-slate-900">{item.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                      {effectiveItems.length === 0 && (
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
            <div className="space-y-4 sm:border-l sm:border-slate-100 sm:pl-6">
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
            <div className="space-y-4 lg:border-l lg:border-slate-100 lg:pl-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Tax / VAT</h4>
              <div className="flex flex-col gap-3">
                <InputField label="AED Rate">
                  <input type="number" step="0.0001" value={displayAedRate} onChange={(e) => setManualAedRate(e.target.value)} className={`${formInput} w-full`} />
                </InputField>
                <InputField label="VAT (AED)">
                  <input type="number" step="0.01" value={displayVatAed} onChange={(e) => {
                    setManualVatAed(e.target.value);
                    setManualVatUsd('');
                  }} className={`${formInput} w-full`} />
                </InputField>
                <InputField label="VAT (USD)">
                  <input type="number" step="0.01" value={displayVatUsd} onChange={(e) => {
                    setManualVatUsd(e.target.value);
                    setManualVatAed('');
                  }} className={`${formInput} w-full`} />
                </InputField>
              </div>
            </div>

            {/* Remarks Section */}
            <div className="space-y-4 sm:border-l sm:border-slate-100 sm:pl-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Remarks</h4>
              <textarea 
                rows={4} 
                value={remarks} 
                onChange={(e) => setRemarks(e.target.value)} 
                placeholder="Notes or remarks..."
                className={`${formInput} w-full resize-none text-sm`} 
              />
            </div>
          </div>

          {/* New Bottom Summary Grid (Image Matched) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-4 gap-6 text-sm mb-2">
            {/* Weight & Base Values */}
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-slate-500">Gross Wt.</span><span className="font-bold">{totalGrossWt.toFixed(3)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Pure Wt.</span><span className="font-bold">{totalPureWt.toFixed(3)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Add. Chrg.</span><span className="font-bold">{totalOtherCharges.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Mak. Chrg.</span><span className="font-bold">{totalMkgAmt.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Gold Value</span><span className="font-bold">{totalMtlAmt.toFixed(2)}</span></div>
            </div>

            {/* Totals & Discounts */}
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-slate-500">Gross Amt.</span><span className="font-bold">{totalGrossAmount.toFixed(2)}</span></div>
              <div className="flex justify-between pt-2 mt-2 border-t border-slate-200"><span className="text-slate-500 font-bold">Net Amt (DC)</span><span className="font-black text-emerald-600">${netAmount.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 font-bold">Net Amt (BC)</span><span className="font-black text-emerald-600">AED {netAmountBc.toFixed(2)}</span></div>
            </div>

            {/* Tax Details */}
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-slate-500">Tax</span><span className="font-bold">{parseFloat(displayVatUsd).toFixed(2)}</span></div>
            </div>

            {/* Settlement */}
            <div className="space-y-2">
              <div className="flex justify-between items-center"><span className="text-slate-500">Cash</span><input type="number" value={cashPay} onChange={(e) => setCashPay(e.target.value)} className="w-24 text-right px-2 py-1 border border-slate-200 rounded outline-none focus:border-accent" /></div>
              <div className="flex justify-between items-center"><span className="text-slate-500">Bank</span><input type="number" value={bankPay} onChange={(e) => setBankPay(e.target.value)} className="w-24 text-right px-2 py-1 border border-slate-200 rounded outline-none focus:border-accent" /></div>
              <div className="flex justify-between items-center"><span className="text-slate-500">Cr.Card</span><input type="number" value={ccPay} onChange={(e) => setCcPay(e.target.value)} className="w-24 text-right px-2 py-1 border border-slate-200 rounded outline-none focus:border-accent" /></div>
              <div className="flex justify-between"><span className="text-slate-500">Party</span><span className="font-bold text-accent">{partyAmount.toFixed(2)}</span></div>
              <div className="flex justify-between pt-2 mt-2 border-t border-slate-200"><span className="text-slate-500 font-bold">Total</span><span className="font-black">{netAmount.toFixed(2)}</span></div>
            </div>
          </div>
          {/* Bill Preview Section */}
          <div className="pt-8 mt-4 border-t-2 border-slate-200 border-dashed">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Invoice Preview</h3>
            <div className={tableWrap}>
              <table className={`${dataTable} w-full text-[11px]`}>
                <thead>
                  <tr className="bg-slate-100 border-y border-slate-200">
                    <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200 w-8">#</th>
                    <th className="px-2 py-2 text-left font-bold text-slate-600 border-r border-slate-200">Item Code</th>
                    <th className="px-2 py-2 text-left font-bold text-slate-600 border-r border-slate-200">Description</th>
                    <th className="px-2 py-2 text-right font-bold text-slate-600 border-r border-slate-200">Act. Purity</th>
                    <th className="px-2 py-2 text-right font-bold text-slate-600 border-r border-slate-200">Gross Wt.</th>
                    <th className="px-2 py-2 text-right font-bold text-slate-600 border-r border-slate-200">Mak. Rate</th>
                    <th className="px-2 py-2 text-right font-bold text-slate-600 border-r border-slate-200">Mak. Amt.</th>
                    <th className="px-2 py-2 text-right font-bold text-slate-600 border-r border-slate-200">Total amount</th>
                    <th className="px-2 py-2 text-center font-bold text-slate-600 border-r border-slate-200">Pcs.</th>
                    <th className="px-2 py-2 text-right font-bold text-slate-600 border-r border-slate-200">Tax</th>
                    <th className="px-2 py-2 text-right font-bold text-slate-600">Net Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceItems.map((item, idx) => {
                    const tax = item.amount * 0.05; // 5% tax per item for preview
                    const net = item.amount + tax;
                    return (
                      <tr key={idx} className="border-b border-slate-200 hover:bg-amber-50/30">
                        <td className="px-2 py-2 border-r border-slate-200 text-center font-medium">{idx + 1}</td>
                        <td className="px-2 py-2 border-r border-slate-200 font-bold bg-amber-50/50">{item.productCode}</td>
                        <td className="px-2 py-2 border-r border-slate-200 bg-amber-50/30">{item.mtlType === 'GOLD' ? 'PURE GOLD' : (item.mtlType || 'PURE')}</td>
                        <td className="px-2 py-2 border-r border-slate-200 text-right font-mono text-slate-600">{parseFloat(item.purityStr || '0').toFixed(7)}</td>
                        <td className="px-2 py-2 border-r border-slate-200 text-right text-slate-600">{parseFloat(item.grossQtyStr).toFixed(3)}</td>
                        <td className="px-2 py-2 border-r border-slate-200 text-right font-mono text-slate-600">{parseFloat(item.mkgRateStr || '0').toFixed(5)}</td>
                        <td className="px-2 py-2 border-r border-slate-200 text-right text-slate-600">{item.mkgAmt.toFixed(2)}</td>
                        <td className="px-2 py-2 border-r border-slate-200 text-right font-medium text-slate-700">{item.amount.toFixed(2)}</td>
                        <td className="px-2 py-2 border-r border-slate-200 text-center text-slate-600">{item.piecesStr}</td>
                        <td className="px-2 py-2 border-r border-slate-200 text-right font-medium bg-amber-50/50">{tax.toFixed(2)}</td>
                        <td className="px-2 py-2 text-right font-bold bg-amber-100/50 text-slate-800">{net.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  {invoiceItems.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-2 py-8 text-center text-slate-400 italic">Preview will appear here once items are added to the invoice.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </Modal>

      {/* Internal "Add Stock" modal for inserting rows */}
      {isAddStockOpen && (
        <AddStockModal
          open={isAddStockOpen}
          slug={slug}
          onClose={() => setIsAddStockOpen(false)}
          onSave={handleAddStock}
        />
      )}
    </>
  );
}
