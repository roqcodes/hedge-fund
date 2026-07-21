'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ComboSearchInput from '@/components/ui/ComboSearchInput';
import { btnPrimary, btnSecondary, formInput, dataTable, tableWrap } from '@/lib/ui';
import { getCustomersBySlug } from '@/app/actions/customerActions';
import { dbAddPhysicalBulkSellAction } from '@/app/actions/physicalActions';
import {
  generatePhysicalTxnId,
  PAYMENT_MODE_OPTIONS,
  type PhysicalPaymentMode,
  formatNumberWithCommas,
  cleanCommaNumber,
  roundTo14,
} from '@/lib/physicalCalculations';
import { useApp } from '@/context/AppContext';
import { convertAedToUsdt } from '@/lib/physicalCurrencyDisplay';
import { convertFromAed } from '@/lib/currency';
import Modal from '@/components/ui/Modal';

interface PhysicalBulkSellModalProps {
  open: boolean;
  slug: string;
  branchId: string;
  availableBuys: any[];
  onClose: () => void;
  onSuccess: () => void;
}

const InputField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</label>
    {children}
  </div>
);

const cleanSelect = "w-full border-b border-slate-200 bg-transparent px-0 py-1.5 text-sm font-medium text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-0 transition-colors cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_0px_center] bg-no-repeat pr-6";

export default function PhysicalBulkSellModal({
  open,
  slug,
  branchId,
  availableBuys,
  onClose,
  onSuccess,
}: PhysicalBulkSellModalProps) {
  const { currencyRates } = useApp();

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [txnId, setTxnId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMode, setPaymentMode] = useState<PhysicalPaymentMode>('CASH');
  const [narration, setNarration] = useState('');

  const [customers, setCustomers] = useState<{ id: string; name: string; balance: string | number }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Top Section: Stock Selection State
  const [stockSearchTerm, setStockSearchTerm] = useState('');
  const [selectedStockId, setSelectedStockId] = useState('');
  const [sellVolume, setSellVolume] = useState('');

  // Added Items state
  const [addedItems, setAddedItems] = useState<Array<{
    buyId: string;
    buyParticulars: string;
    buyDate: string;
    originalGrossWeight: number; // total gross weight of the source buy (for cost basis)
    remainingWeight: number;     // remaining gross weight on the buy
    buyPurity: number;
    buyIdrGram: number;
    buyIdrToUsdt: number;
    buyValue: number;
    sellVolume: number; // GROSS weight to sell (physical quantity)
  }>>([]);

  // Manual Overrides State
  const [overridePurity, setOverridePurity] = useState<string>('');
  const [overrideIdrGram, setOverrideIdrGram] = useState<string>('');
  const [overrideIdrToUsdt, setOverrideIdrToUsdt] = useState<string>('');

  useEffect(() => {
    if (open) {
      setTxnId(generatePhysicalTxnId(slug, 'SELL'));
      getCustomersBySlug(slug).then(res => {
        if (res.success && res.customers) setCustomers(res.customers);
      });
      // Reset state
      setAddedItems([]);
      setCustomerId('');
      setCustomerName('');
      setPaymentMode('CASH');
      setNarration('');
      setSellVolume('');
      setSelectedStockId('');
      setStockSearchTerm('');
      setOverridePurity('');
      setOverrideIdrGram('');
      setOverrideIdrToUsdt('');
    }
  }, [open, slug]);

  const customerOptions = customers.map(c => ({
    value: c.id,
    label: `${c.name}${c.balance != null ? ` (AED ${Number(c.balance).toLocaleString()})` : ''}`,
  }));

  // Filter available buys based on search and whether they are already added
  const filteredStockList = useMemo(() => {
    const addedIds = new Set(addedItems.map(item => item.buyId));
    let list = availableBuys.filter(b => !addedIds.has(b.id) && b.remainingWeight > 0.001);
    if (stockSearchTerm.trim()) {
      const q = stockSearchTerm.toLowerCase();
      list = list.filter(b =>
        b.particulars.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        (b.item && b.item.toLowerCase().includes(q))
      );
    }
    return list;
  }, [availableBuys, stockSearchTerm, addedItems]);

  const currentlySelectedStock = useMemo(() => {
    return availableBuys.find(b => b.id === selectedStockId) || null;
  }, [selectedStockId, availableBuys]);

  // Autofill remaining weight when stock selected
  useEffect(() => {
    if (currentlySelectedStock) {
      setSellVolume(currentlySelectedStock.remainingWeight.toString());
    } else {
      setSellVolume('');
    }
  }, [currentlySelectedStock]);

  const handleAddItem = () => {
    if (!currentlySelectedStock) {
      alert('Please select a buy deal.');
      return;
    }
    const vol = parseFloat(sellVolume);
    if (isNaN(vol) || vol <= 0) {
      alert('Please enter a valid volume.');
      return;
    }
    if (vol > currentlySelectedStock.remainingWeight) {
      alert(`Cannot sell more than remaining weight (${currentlySelectedStock.remainingWeight.toFixed(3)}g).`);
      return;
    }

    setAddedItems(prev => [
      ...prev,
      {
        buyId: currentlySelectedStock.id,
        buyParticulars: currentlySelectedStock.item || currentlySelectedStock.particulars,
        buyDate: currentlySelectedStock.date,
        originalGrossWeight: currentlySelectedStock.grossWeight, // cost basis denominator
        remainingWeight: currentlySelectedStock.remainingWeight,
        buyPurity: currentlySelectedStock.pureConversion,
        buyIdrGram: currentlySelectedStock.idrGram,
        buyIdrToUsdt: currentlySelectedStock.idrToUsdt,
        buyValue: currentlySelectedStock.buyValue,
        sellVolume: vol, // gross grams
      }
    ]);

    // Reset selection
    setSelectedStockId('');
    setStockSearchTerm('');
    setSellVolume('');
  };

  const handleRemoveItem = (buyId: string) => {
    setAddedItems(prev => prev.filter(item => item.buyId !== buyId));
  };

  // Computations
  const totalVolume = useMemo(() => {
    return roundTo14(addedItems.reduce((sum, item) => sum + item.sellVolume, 0));
  }, [addedItems]);

  const calculatedWeightedAverages = useMemo(() => {
    if (addedItems.length === 0) {
      return { purity: 0.995, idrGram: 0, idrToUsdt: 17770 };
    }

    let sumGross = 0;
    let sumPure = 0;
    let totalIdrXPure = 0;
    let totalUsdtXPure = 0;

    for (const item of addedItems) {
      const itemPure = item.sellVolume * item.buyPurity; // pure = gross × purity
      sumGross += item.sellVolume;
      sumPure += itemPure;
      totalIdrXPure += itemPure * item.buyIdrGram;   // IDR rate weighted by pure grams
      totalUsdtXPure += itemPure * item.buyIdrToUsdt; // USDT rate weighted by pure grams
    }

    return {
      purity:    sumGross > 0 ? roundTo14(sumPure / sumGross) : 0.995,      // avg purity = Σpure / Σgross
      idrGram:   sumPure > 0 ? roundTo14(totalIdrXPure / sumPure) : 0,      // weighted by pure
      idrToUsdt: sumPure > 0 ? roundTo14(totalUsdtXPure / sumPure) : 17770, // weighted by pure
    };
  }, [addedItems]);

  // Overridden values (fallback to calculated weighted averages)
  const finalPurity = overridePurity !== '' ? parseFloat(overridePurity) || 0 : calculatedWeightedAverages.purity;
  const finalIdrGram = overrideIdrGram !== '' ? parseFloat(overrideIdrGram) || 0 : calculatedWeightedAverages.idrGram;
  const finalIdrToUsdt = overrideIdrToUsdt !== '' ? parseFloat(overrideIdrToUsdt) || 17770 : calculatedWeightedAverages.idrToUsdt;

  const finalIdrRate = finalIdrToUsdt > 0 ? roundTo14(finalIdrGram / finalIdrToUsdt) : 0;
  // Price is on PURE volume — derive it from gross × purity
  const totalPureVolume = roundTo14(totalVolume * finalPurity);
  const totalUsdt = roundTo14(totalPureVolume * finalIdrRate);

  const rates = currencyRates;
  const usdToAedRate = rates['USD'] ? roundTo14(1 / rates['USD']) : 3.6725;
  const finalTotalAed = roundTo14(totalUsdt * usdToAedRate);
  const totalIdrValue = roundTo14(totalPureVolume * finalIdrGram);

  const profitAndCost = useMemo(() => {
    let totalCostAed = 0;
    let totalCostUsdt = 0;

    const itemsCalculations = addedItems.map(item => {
      // Gross weight sold from this buy
      const itemGrossWeight = item.sellVolume;
      // Pure weight = gross × this buy's purity
      const itemPureGram = roundTo14(itemGrossWeight * item.buyPurity);

      // Cost basis: cost per gross gram of the original buy
      const costPerGramAed = item.originalGrossWeight > 0 ? item.buyValue / item.originalGrossWeight : 0;
      const costValueAed = roundTo14(costPerGramAed * itemGrossWeight);
      const costValueUsdt = convertAedToUsdt(costValueAed, currencyRates);

      totalCostAed += costValueAed;
      totalCostUsdt += costValueUsdt;

      // Sale value: price on pure weight using final averaged rates
      const itemSellValueUsdt = roundTo14(itemPureGram * finalIdrRate);
      const itemSellValueAed = roundTo14(itemSellValueUsdt * usdToAedRate);
      const itemProfitAed = roundTo14(itemSellValueAed - costValueAed);
      const itemMargin = itemSellValueAed > 0 ? roundTo14((itemProfitAed / itemSellValueAed) * 100) : 0;

      return {
        buyId: item.buyId,
        buyParticulars: item.buyParticulars,
        buyDate: item.buyDate,
        grossWeight: itemGrossWeight,   // physical quantity
        pureGram: itemPureGram,         // derived for pricing
        pureConversion: item.buyPurity, // per-buy purity (stored on sell row)
        buyPurity: item.buyPurity,
        idrGram: finalIdrGram,
        idrToUsdt: finalIdrToUsdt,
        idrRate: finalIdrRate,
        total: itemSellValueAed,
        sellValue: itemSellValueAed,
        profit: itemProfitAed,
        costValue: costValueAed,
        costValueUsdt,
        margin: itemMargin,
      };
    });

    const totalProfitUsdt = totalUsdt - totalCostUsdt;
    const totalProfitAed = finalTotalAed - totalCostAed;

    return {
      totalCostAed,
      totalCostUsdt,
      totalProfitUsdt,
      totalProfitAed,
      items: itemsCalculations,
    };
  }, [addedItems, finalPurity, finalIdrGram, finalIdrToUsdt, finalIdrRate, totalUsdt, finalTotalAed, usdToAedRate, currencyRates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert('Customer name is required.');
      return;
    }
    if (addedItems.length === 0) {
      alert('Please add at least one buy deal.');
      return;
    }

    setIsSaving(true);
    const dateTime = `${date}T${time}:00`;

    const payload = {
      branchId,
      date: dateTime,
      particulars: narration.trim() || 'BULK SELL ORDER',
      notes: narration.trim() || undefined, // Narration and notes are unified
      customerName: customerName.trim(),
      customerId: customerId || undefined,
      paymentMode,
      grossWeight: totalVolume,                         // gross weight total
      pureConversion: finalPurity,
      pureGram: totalPureVolume,                        // pure = gross × avg purity
      idrGram: finalIdrGram,
      idrToUsdt: finalIdrToUsdt,
      idrRate: finalIdrRate,
      total: finalTotalAed,
      sellValue: finalTotalAed,
      profit: profitAndCost.totalProfitAed,
      txnId,
      usdAmount: convertFromAed(finalTotalAed, 'USD'),
      aedAmount: finalTotalAed,
      totalWeight: totalVolume,                         // gross weight
      tltIdrValue: totalIdrValue,
      tltAedValue: finalTotalAed,
      totalUsdt: totalUsdt,
      items: profitAndCost.items.map(item => ({
        buyId: item.buyId,
        pureGram: item.pureGram,
        grossWeight: item.grossWeight,
        pureConversion: item.pureConversion,
        idrGram: item.idrGram,
        idrToUsdt: item.idrToUsdt,
        idrRate: item.idrRate,
        total: item.total,
        sellValue: item.sellValue,
        profit: item.profit,
        costValue: item.costValue,
        margin: item.margin,
      })),
    };

    const res = await dbAddPhysicalBulkSellAction(payload);
    setIsSaving(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      alert(res.error);
    }
  };

  const formattedCalculatedPurity = calculatedWeightedAverages.purity.toFixed(4);
  const formattedCalculatedIdr = calculatedWeightedAverages.idrGram.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const formattedCalculatedUsdt = calculatedWeightedAverages.idrToUsdt.toLocaleString(undefined, { maximumFractionDigits: 2 });

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="relative flex w-full items-center justify-center">
          <span className="font-extrabold text-slate-800 tracking-tight text-base sm:text-lg">Bulk Sell Deals</span>
          <span className="absolute right-4 font-mono text-[10px] sm:text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
            #{txnId || 'PENDING'}
          </span>
        </div>
      }
      maxWidth="max-w-[1400px] w-[98vw]"
      maxHeight="sm:max-h-[92vh] sm:h-[92vh] h-[92vh]"
    >
      <form onSubmit={handleSubmit} className="flex flex-col h-[calc(92vh-112px)] gap-4 pt-2 overflow-hidden">
        
        {/* Date, Time, Customer & Payment Settings (Fixed at top) */}
        <div className="shrink-0 grid grid-cols-2 gap-3 sm:grid-cols-4 border-b border-slate-100 pb-3">
          <InputField label="Date">
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-0"
              required
            />
          </InputField>
          <InputField label="Time">
            <input
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-0"
              required
            />
          </InputField>
          <InputField label="Customer">
            <ComboSearchInput
              value={customerName}
              onChange={v => {
                setCustomerName(v);
                setCustomerId('');
              }}
              onSelectOption={opt => {
                const c = customers.find(x => x.id === opt.value);
                if (c) {
                  setCustomerId(c.id);
                  setCustomerName(c.name);
                }
              }}
              options={customerOptions}
              placeholder="Select customer..."
              className="!border-0 !border-b !border-slate-200 !rounded-none !bg-transparent !px-0 !shadow-none focus-within:!border-slate-400 !text-xs"
            />
          </InputField>
          <InputField label="Payment Mode">
            <select
              className={cleanSelect + " !text-xs"}
              value={paymentMode}
              onChange={e => setPaymentMode(e.target.value as PhysicalPaymentMode)}
            >
              {PAYMENT_MODE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </InputField>
        </div>

        {/* Scrollable middle split layout */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0">
          
          {/* LEFT SIDE: SELECT STOCK (Fixed Outer, Scrollable stock list) */}
          <div className="lg:col-span-4 flex flex-col min-h-[250px] lg:h-full bg-slate-50/50 p-3 rounded-2xl border border-slate-100 min-h-0">
            <h3 className="shrink-0 text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">1. Select Stock Buys</h3>
            
            <div className="shrink-0 relative mb-3">
              <input
                type="text"
                placeholder="Search stock..."
                value={stockSearchTerm}
                onChange={e => setStockSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 pl-8 text-[11px] font-medium text-slate-900 placeholder-slate-400 focus:border-slate-300 focus:outline-none focus:ring-0 transition-all"
              />
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" />
              </svg>
            </div>

            {/* Scrollable stock list */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5">
              {filteredStockList.map(stock => {
                const isSelected = selectedStockId === stock.id;
                return (
                  <button
                    key={stock.id}
                    type="button"
                    onClick={() => setSelectedStockId(stock.id)}
                    className={`flex flex-col text-left gap-1 rounded-xl p-2.5 border transition-all text-xs shrink-0 ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/40 shadow-sm'
                        : 'border-slate-100 bg-white hover:border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between font-bold text-slate-900 text-[11px]">
                      <span className="truncate max-w-[70%]">{stock.item || stock.particulars || 'Buy Deal'}</span>
                      <span className="font-mono text-slate-400">#{stock.txnId || stock.id.slice(-6).toUpperCase()}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 text-[9px] text-slate-500 mt-1 border-t border-slate-50 pt-1.5">
                      <div><span className="block text-[8px] font-bold text-slate-400">REM VOL</span>{stock.remainingWeight.toFixed(3)}g</div>
                      <div><span className="block text-[8px] font-bold text-slate-400">PURITY</span>{stock.pureConversion}</div>
                      <div><span className="block text-[8px] font-bold text-slate-400">VALUE</span>{(stock.buyValue).toLocaleString(undefined, { maximumFractionDigits: 0 })} USDT</div>
                    </div>
                  </button>
                );
              })}
              {filteredStockList.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-[11px] font-medium">No available stock.</div>
              )}
            </div>

            {/* Add stock weight block */}
            {currentlySelectedStock && (
              <div className="shrink-0 flex gap-2 items-end border-t border-slate-100 pt-3 mt-2">
                <div className="flex-1">
                  <InputField label="Volume to Sell (g)">
                    <input
                      type="number"
                      step="0.001"
                      placeholder="0.000"
                      value={sellVolume}
                      max={currentlySelectedStock.remainingWeight}
                      onChange={e => setSellVolume(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddItem();
                        }
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-300"
                    />
                  </InputField>
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-3.5 py-1.5 text-xs font-black text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm h-[32px]"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          {/* RIGHT SIDE: SELECTED ITEMS LIST (Fixed Outer, Scrollable Table Wrapper) */}
          <div className="lg:col-span-8 flex flex-col min-h-[300px] lg:h-full border border-slate-100 rounded-2xl p-3 min-h-0">
            <h3 className="shrink-0 text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">2. Selected Deals for Bulk Sell</h3>
            
            {/* Scrollable Table wrapper */}
            <div className="flex-1 overflow-y-auto pr-1">
              <div className={tableWrap + " !border-0"}>
                <table className={`${dataTable} w-full text-[11px]`}>
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-2 pb-2 text-left font-bold text-slate-400">Date</th>
                      <th className="px-2 pb-2 text-left font-bold text-slate-400">Particulars</th>
                      <th className="px-2 pb-2 text-center font-bold text-slate-400">Purity</th>
                      <th className="px-2 pb-2 text-center font-bold text-slate-400">Gross Wt</th>
                      <th className="px-2 pb-2 text-center font-bold text-slate-800">Pure Wt</th>
                      <th className="px-2 pb-2 text-center font-bold text-slate-400">IDR Rate</th>
                      <th className="px-2 pb-2 text-center font-bold text-slate-400">USDT Rate</th>
                      <th className="px-2 pb-2 text-center font-bold text-slate-450">Total USDT</th>
                      <th className="px-2 pb-2 text-center font-bold text-slate-400">Profit</th>
                      <th className="px-2 pb-2 text-center font-bold text-slate-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profitAndCost.items.map(item => (
                      <tr key={item.buyId} className="hover:bg-slate-50/40 border-b border-slate-50/80">
                        <td className="px-2 py-2 text-slate-500">{new Date(item.buyDate).toLocaleDateString()}</td>
                        <td className="px-2 py-2 text-slate-800 font-bold max-w-[120px] truncate">{item.buyParticulars}</td>
                        <td className="px-2 py-2 text-center font-mono">{item.buyPurity.toFixed(4)}</td>
                        <td className="px-2 py-2 text-center font-mono">{item.grossWeight.toFixed(3)}g</td>
                        <td className="px-2 py-2 text-center font-mono font-black text-indigo-600 bg-indigo-50/10">{item.pureGram.toFixed(3)}g</td>
                        <td className="px-2 py-2 text-center font-mono text-slate-650">{item.idrGram.toLocaleString()}</td>
                        <td className="px-2 py-2 text-center font-mono text-slate-650">{item.idrToUsdt.toLocaleString()}</td>
                        <td className="px-2 py-2 text-center font-mono font-bold">${(item.pureGram * item.idrRate).toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                        <td className={`px-2 py-2 text-center font-mono font-bold ${item.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>${(item.profit / usdToAedRate).toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.buyId)}
                            className="text-red-500 hover:text-red-700 transition-colors p-1"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                    {addedItems.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-2 py-12 text-center text-slate-400 font-medium">
                          No deals added yet. Select a stock deal on the left and add.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Narration input field (Unified) */}
            <div className="shrink-0 border-t border-slate-100 pt-3 mt-2">
              <InputField label="Narration / Notes">
                <input
                  type="text"
                  placeholder="Unified bulk sell transaction narration & notes..."
                  value={narration}
                  onChange={e => setNarration(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:border-slate-300"
                />
              </InputField>
            </div>
          </div>
        </div>

        {/* BOTTOM BAR — summary, overrides, actions */}
        <div className="shrink-0 bg-sky-50 text-sky-950 border border-sky-200/80 px-4 py-3 flex flex-wrap items-center justify-between gap-4 rounded-2xl shadow-sm mt-auto">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            
            {/* Gross Weight — primary physical quantity */}
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase text-sky-600/80 tracking-wider">Gross Weight</span>
              <span className="text-lg sm:text-xl font-extrabold font-mono text-sky-900">{totalVolume.toFixed(3)} g</span>
            </div>

            {/* Pure Weight — calculated pricing quantity */}
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase text-indigo-500/80 tracking-wider">Pure Weight</span>
              <span className="text-lg sm:text-xl font-extrabold font-mono text-indigo-700">{totalPureVolume.toFixed(3)} g</span>
            </div>

            {/* Average Purity / Touch */}
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase text-sky-600/80 tracking-wider flex items-center gap-1">
                Avg Purity
                <span className="text-[8px] font-mono text-sky-500/80">({formattedCalculatedPurity})</span>
              </span>
              <input
                type="number"
                step="0.0001"
                placeholder={formattedCalculatedPurity}
                value={overridePurity !== '' ? overridePurity : (addedItems.length > 0 ? calculatedWeightedAverages.purity.toFixed(4) : '')}
                onChange={e => setOverridePurity(e.target.value)}
                className="w-20 bg-white border border-sky-200 rounded px-2 py-0.5 text-xs sm:text-sm text-sky-950 font-mono focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200 text-center"
              />
            </div>

            {/* Average IDR Rate */}
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase text-sky-600/80 tracking-wider flex items-center gap-1">
                Avg IDR Rate
                <span className="text-[8px] font-mono text-sky-500/80">({formattedCalculatedIdr})</span>
              </span>
              <input
                type="number"
                step="1"
                placeholder={formattedCalculatedIdr.replace(/,/g, '')}
                value={overrideIdrGram !== '' ? overrideIdrGram : (addedItems.length > 0 ? Math.round(calculatedWeightedAverages.idrGram).toString() : '')}
                onChange={e => setOverrideIdrGram(e.target.value)}
                className="w-24 bg-white border border-sky-200 rounded px-2 py-0.5 text-xs sm:text-sm text-sky-950 font-mono focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200 text-center"
              />
            </div>

            {/* Average USDT Rate */}
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase text-sky-600/80 tracking-wider flex items-center gap-1">
                Avg USDT Rate
                <span className="text-[8px] font-mono text-sky-500/80">({formattedCalculatedUsdt})</span>
              </span>
              <input
                type="number"
                step="1"
                placeholder={formattedCalculatedUsdt.replace(/,/g, '')}
                value={overrideIdrToUsdt !== '' ? overrideIdrToUsdt : (addedItems.length > 0 ? Math.round(calculatedWeightedAverages.idrToUsdt).toString() : '')}
                onChange={e => setOverrideIdrToUsdt(e.target.value)}
                className="w-20 bg-white border border-sky-200 rounded px-2 py-0.5 text-xs sm:text-sm text-sky-950 font-mono focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-200 text-center"
              />
            </div>

            {/* Total IDR Value */}
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase text-sky-600/80 tracking-wider">Total IDR</span>
              <span className="text-lg sm:text-xl font-extrabold font-mono text-sky-900">
                {totalIdrValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>

            {/* Total Sell Value */}
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase text-sky-600/80 tracking-wider">Total Value (USDT)</span>
              <span className="text-lg sm:text-xl font-extrabold font-mono text-indigo-700">
                {totalUsdt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* Profit USDT */}
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase text-sky-600/80 tracking-wider">Est. Profit (USDT)</span>
              <span className={`text-lg sm:text-xl font-extrabold font-mono ${profitAndCost.totalProfitUsdt >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                {profitAndCost.totalProfitUsdt >= 0 ? '+' : ''}
                {profitAndCost.totalProfitUsdt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-black text-sky-600 hover:text-sky-900 hover:bg-sky-100/50 transition-all rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || addedItems.length === 0 || !customerName}
              className="px-6 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-md rounded-xl"
            >
              {isSaving ? 'Processing...' : 'Register Bulk Sell'}
            </button>
          </div>

        </div>

      </form>
    </Modal>
  );
}
