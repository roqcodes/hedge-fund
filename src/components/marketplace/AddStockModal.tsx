'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import { btnPrimary, btnSecondary, formInput } from '@/lib/ui';
import { MOCK_PRODUCT_MASTER, calculateProductPrice } from '@/lib/marketplace';

interface AddStockModalProps {
  open: boolean;
  onClose: () => void;
  onSave?: (data: any) => void;
}

export default function AddStockModal({ open, onClose, onSave }: AddStockModalProps) {
  const [productCode, setProductCode] = useState(MOCK_PRODUCT_MASTER[0].productCode);
  
  const [mtlType, setMtlType] = useState('XAU');
  const [rateType, setRateType] = useState('GOZ');
  const [spotPriceStr, setSpotPriceStr] = useState('4500.00'); // Base spot
  const [premiumStr, setPremiumStr] = useState('10.00'); // Premium
  
  const [piecesStr, setPiecesStr] = useState('1');
  const [grossQtyStr, setGrossQtyStr] = useState('0.000');
  const [purityStr, setPurityStr] = useState('0.0000000');
  const [plgQtyStr, setPlgQtyStr] = useState('0.000');
  
  const [mkgType, setMkgType] = useState('PCS');
  const [mkgRateStr, setMkgRateStr] = useState('0.00');

  // When product changes, auto-fill weight, purity, making charge, and premium
  useEffect(() => {
    const product = MOCK_PRODUCT_MASTER.find(p => p.productCode === productCode);
    if (product) {
      setGrossQtyStr(product.weight.toString());
      setPurityStr(product.purity.toString());
      setPremiumStr(product.buyPremium.toString());
      setMkgRateStr(product.makingCharge.toString());
      setMkgType('PCS'); // Usually making charge on standard products is per piece
    }
  }, [productCode]);

  // Calculations powered by MetaFix pricing engine
  const calculations = useMemo(() => {
    const spotPriceOz = parseFloat(spotPriceStr) || 0;
    const premiumOz = parseFloat(premiumStr) || 0;
    const pieces = parseFloat(piecesStr) || 1;
    const grossQty = parseFloat(grossQtyStr) || 0;
    const purity = parseFloat(purityStr) || 0;
    const mkgRate = parseFloat(mkgRateStr) || 0;
    
    // MetaFix Logic 
    const result = calculateProductPrice(spotPriceOz, premiumOz, purity, grossQty, 0, 0); // Exclude making charge from here to show separately
    
    // Pure Qty = Gross Qty * Purity (assuming purity is like 999.9 -> 0.9999)
    const purityDecimal = purity > 1 ? purity / 1000 : purity;
    const pureQty = grossQty * purityDecimal;
    
    const mtlAmt = result.metalValue; 
    
    // Mkg Amt (Making Amount)
    let mkgAmt = 0;
    if (mkgType === 'OZ') {
      mkgAmt = grossQty * mkgRate;
    } else if (mkgType === 'PCS') {
      mkgAmt = pieces * mkgRate;
    } else {
      mkgAmt = grossQty * mkgRate;
    }
    
    const amount = mtlAmt + mkgAmt;

    return { pureQty, mtlAmt, mkgAmt, amount, pricePerGram: result.pricePerGram };
  }, [spotPriceStr, premiumStr, piecesStr, grossQtyStr, purityStr, mkgRateStr, mkgType]);

  const handleSaveStock = () => {
    if (onSave) {
      onSave({
        productCode,
        mtlType, rateType, spotPriceStr, premiumStr,
        piecesStr, grossQtyStr, purityStr, plgQtyStr,
        mkgType, mkgRateStr,
        ...calculations
      });
    } else {
      console.log("Stock saved:", { productCode, mtlType, rateType, spotPriceStr, premiumStr, piecesStr, grossQtyStr, purityStr, plgQtyStr, mkgType, mkgRateStr, ...calculations });
    }
    onClose();
  };

  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      title="Stock Details"
      maxWidth="max-w-2xl"
      footer={
        <>
          <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
          <button type="button" onClick={handleSaveStock} className={btnPrimary}>Save</button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Top Row: Mtl Type, Rate, Product Master */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <label className="w-24 text-sm font-semibold text-slate-600 shrink-0">Product :</label>
              <div className="relative flex-1">
                <select 
                  value={productCode} 
                  onChange={(e) => setProductCode(e.target.value)}
                  className={`${formInput} w-full`}
                >
                  {MOCK_PRODUCT_MASTER.map(p => (
                    <option key={p.productCode} value={p.productCode}>
                      {p.productName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="w-24 text-sm font-semibold text-slate-600 shrink-0">Mtl Type :</label>
              <select 
                value={mtlType} 
                onChange={(e) => setMtlType(e.target.value)}
                className={`${formInput} flex-1`}
              >
                <option value="XAU">XAU</option>
                <option value="XAG">XAG</option>
              </select>
            </div>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <label className="w-16 text-sm font-semibold text-slate-600 shrink-0">Rate :</label>
              <select 
                value={rateType} 
                onChange={(e) => setRateType(e.target.value)}
                className={`${formInput} w-20 shrink-0`}
              >
                <option value="GOZ">GOZ</option>
                <option value="GM">GM</option>
              </select>
              <input 
                type="number" 
                step="0.01"
                placeholder="Spot Price"
                value={spotPriceStr}
                onChange={(e) => setSpotPriceStr(e.target.value)}
                className={`${formInput} flex-1`}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-16 text-sm font-semibold text-slate-600 shrink-0">Premium:</label>
              <input 
                type="number" 
                step="0.01"
                value={premiumStr}
                onChange={(e) => setPremiumStr(e.target.value)}
                className={`${formInput} flex-1`}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* Stock Details Box */}
          <div className="border border-slate-200 rounded-xl overflow-hidden relative">
            <div className="bg-slate-100 border-b border-r border-slate-200 px-4 py-2 font-bold text-slate-600 text-sm inline-block rounded-br-xl absolute top-0 left-0 z-10">
              Stock Details
            </div>
            <div className="p-4 pt-14 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Pieces</label>
                <input 
                  type="number" 
                  value={piecesStr}
                  onChange={(e) => setPiecesStr(e.target.value)}
                  className={`${formInput} text-right`}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Gross Qty (g)</label>
                <input 
                  type="number" 
                  step="0.001"
                  value={grossQtyStr}
                  onChange={(e) => setGrossQtyStr(e.target.value)}
                  className={`${formInput} text-right`}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Purity</label>
                <input 
                  type="number" 
                  step="0.001"
                  value={purityStr}
                  onChange={(e) => setPurityStr(e.target.value)}
                  className={`${formInput} text-right`}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Pure Qty</label>
                <input 
                  type="text" 
                  value={calculations.pureQty.toFixed(3)}
                  readOnly
                  className={`${formInput} text-right bg-slate-50`}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Plg Qty</label>
                <input 
                  type="number" 
                  step="0.001"
                  value={plgQtyStr}
                  onChange={(e) => setPlgQtyStr(e.target.value)}
                  className={`${formInput} text-right`}
                />
              </div>
            </div>
          </div>

          {/* Amount Details Box */}
          <div className="border border-slate-200 rounded-xl overflow-hidden relative">
            <div className="bg-slate-100 border-b border-r border-slate-200 px-4 py-2 font-bold text-slate-600 text-sm inline-block rounded-br-xl absolute top-0 left-0 z-10">
              Amount Details
            </div>
            <div className="p-4 pt-14 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Mkg Type</label>
                <select 
                  value={mkgType}
                  onChange={(e) => setMkgType(e.target.value)}
                  className={`${formInput}`}
                >
                  <option value="PCS">PCS</option>
                  <option value="OZ">OZ</option>
                  <option value="GM">GM</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Mkg Rate</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={mkgRateStr}
                  onChange={(e) => setMkgRateStr(e.target.value)}
                  className={`${formInput} text-right`}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Mkg Amt</label>
                <input 
                  type="text" 
                  value={calculations.mkgAmt.toFixed(2)}
                  readOnly
                  className={`${formInput} text-right bg-slate-50`}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Mtl Amt (USD)</label>
                <input 
                  type="text" 
                  value={calculations.mtlAmt.toFixed(2)}
                  readOnly
                  className={`${formInput} text-right bg-slate-50`}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600">Amount (USD)</label>
                <input 
                  type="text" 
                  value={calculations.amount.toFixed(2)}
                  readOnly
                  className={`${formInput} text-right font-bold text-slate-900 bg-slate-50`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
