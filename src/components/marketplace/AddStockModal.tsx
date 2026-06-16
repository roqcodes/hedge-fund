'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import { btnPrimary, btnSecondary, formInput } from '@/lib/ui';
import { calculateProductPrice } from '@/lib/marketplace';
import { getProductsBySlug } from '@/app/actions/productActions';

interface AddStockModalProps {
  open: boolean;
  slug: string;
  onClose: () => void;
  onSave?: (data: any) => void;
}

export default function AddStockModal({ open, slug, onClose, onSave }: AddStockModalProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  
  // Custom Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [productCode, setProductCode] = useState('');
  
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

  // Fetch real products from DB
  useEffect(() => {
    if (open && slug) {
      setLoadingProducts(true);
      getProductsBySlug(slug).then(res => {
        if (res.success && res.products) {
          // Filter to active products only
          const activeProducts = res.products.filter(p => p.status?.toLowerCase() === 'active');
          setProducts(activeProducts);
          if (activeProducts.length > 0 && !productCode) {
            handleSelectProduct(activeProducts[0]);
          }
        }
        setLoadingProducts(false);
      });
    }
  }, [open, slug]);

  // Click outside listener for dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectProduct = (product: any) => {
    setProductCode(product.sku);
    setSearchQuery(product.name);
    setIsDropdownOpen(false);
    
    // Auto-fill fields
    setGrossQtyStr(product.weight.toString());
    setPurityStr(parseFloat(product.purity).toFixed(7));
    setPremiumStr((product.buy_premium || 0).toString());
    setMkgRateStr((product.making_charge || 0).toString());
    setMkgType('PCS');
    setMtlType(product.metal_type?.toUpperCase() === 'SILVER' ? 'XAG' : 'XAU');
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const lowerQuery = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(lowerQuery) || 
      p.sku.toLowerCase().includes(lowerQuery)
    );
  }, [products, searchQuery]);

  // Calculations powered by pricing engine
  const calculations = useMemo(() => {
    const spotPriceOz = parseFloat(spotPriceStr) || 0;
    const premiumOz = parseFloat(premiumStr) || 0;
    const pieces = parseFloat(piecesStr) || 1;
    const grossQty = parseFloat(grossQtyStr) || 0;
    const purity = parseFloat(purityStr) || 0;
    const mkgRate = parseFloat(mkgRateStr) || 0;
    
    // Pricing Logic
    const result = calculateProductPrice(spotPriceOz, premiumOz, purity, grossQty, 0, 0); 
    
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
        piecesStr, grossQtyStr, plgQtyStr,
        purityStr: parseFloat(purityStr).toFixed(7),
        mkgType, mkgRateStr,
        ...calculations
      });
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
        {/* Product Search - Full Row */}
        <div className="flex items-center gap-3">
          <label className="w-24 text-sm font-semibold text-slate-600 shrink-0">Product :</label>
          <div className="relative flex-1" ref={dropdownRef}>
            <div className="relative">
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                }}
                onFocus={() => setIsDropdownOpen(true)}
                placeholder={loadingProducts ? "Loading products..." : "Search product..."}
                disabled={loadingProducts}
                className={`${formInput} w-full pr-8`}
              />
              <div className="absolute right-0 top-0 h-full w-8 flex items-center justify-center pointer-events-none text-slate-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            </div>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50">
                {filteredProducts.length === 0 ? (
                  <div className="p-3 text-sm text-slate-500 text-center">No products found</div>
                ) : (
                  filteredProducts.map(p => (
                    <div 
                      key={p.sku}
                      onClick={() => handleSelectProduct(p)}
                      className="flex flex-col px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                    >
                      <span className="text-sm font-bold text-slate-700">{p.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{p.sku} • {p.metal_type} • {parseFloat(p.weight)} {p.unit}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Properties Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 h-[42px]">
              <label className="w-24 text-sm font-semibold text-slate-600 shrink-0">Mtl Type :</label>
              <div className="flex-1 min-w-0">
                <select 
                  value={mtlType} 
                  onChange={(e) => setMtlType(e.target.value)}
                  className={`${formInput}`}
                >
                  <option value="XAU">XAU</option>
                  <option value="XAG">XAG</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <label className="w-16 text-sm font-semibold text-slate-600 shrink-0">Rate :</label>
              <select 
                value={rateType} 
                onChange={(e) => setRateType(e.target.value)}
                className={`${formInput} !w-24 shrink-0`}
              >
                <option value="GOZ">GOZ</option>
                <option value="GM">GM</option>
              </select>
              <div className="flex-1 min-w-0">
                <input 
                  type="number" 
                  step="0.01"
                  value={spotPriceStr}
                  onChange={(e) => setSpotPriceStr(e.target.value)}
                  className={`${formInput} w-full text-right`} 
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="w-16 text-sm font-semibold text-slate-600 shrink-0">Premium:</label>
              <div className="flex-1 min-w-0">
                <input 
                  type="number"
                  step="0.01" 
                  value={premiumStr}
                  onChange={(e) => setPremiumStr(e.target.value)}
                  className={`${formInput} w-full`} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Middle Section: Stock Details Frame */}
        <div className="relative border border-slate-200 rounded-xl p-5 pt-6 mt-4 bg-slate-50/50">
          <div className="absolute -top-3 left-4 bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold px-3 py-1 rounded-md shadow-sm">
            Stock Details
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500">Pieces</label>
              <input type="number" value={piecesStr} onChange={(e) => setPiecesStr(e.target.value)} className={`${formInput} text-right font-bold`} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500">Gross Qty (g)</label>
              <input type="number" step="0.001" value={grossQtyStr} onChange={(e) => setGrossQtyStr(e.target.value)} className={`${formInput} text-right font-bold`} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500">Purity</label>
              <input type="number" step="0.0000001" value={purityStr} onChange={(e) => setPurityStr(e.target.value)} className={`${formInput} text-right font-mono font-bold text-accent`} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500">Pure Qty</label>
              <input type="number" value={calculations.pureQty.toFixed(7)} readOnly className={`${formInput} text-right bg-slate-50 text-slate-500`} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500">Plg Qty</label>
              <input type="number" step="0.001" value={plgQtyStr} onChange={(e) => setPlgQtyStr(e.target.value)} className={`${formInput} text-right`} />
            </div>
          </div>
        </div>

        {/* Bottom Section: Amount Details Frame */}
        <div className="relative border border-slate-200 rounded-xl p-5 pt-6 mt-4">
          <div className="absolute -top-3 left-4 bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold px-3 py-1 rounded-md shadow-sm">
            Amount Details
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Mkg Type</label>
              <select value={mkgType} onChange={(e) => setMkgType(e.target.value)} className={`${formInput}`}>
                <option value="PCS">PCS</option>
                <option value="OZ">OZ</option>
                <option value="GM">GM</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Mkg Rate</label>
              <input type="number" step="0.01" value={mkgRateStr} onChange={(e) => setMkgRateStr(e.target.value)} className={`${formInput} text-right`} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Mkg Amt</label>
              <input type="number" value={calculations.mkgAmt.toFixed(2)} readOnly className={`${formInput} text-right bg-slate-50`} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Mtl Amt (USD)</label>
              <input type="number" value={calculations.mtlAmt.toFixed(2)} readOnly className={`${formInput} text-right bg-slate-50 font-bold`} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Amount (USD)</label>
              <input type="number" value={calculations.amount.toFixed(2)} readOnly className={`${formInput} text-right bg-slate-50 font-black text-slate-900`} />
            </div>
          </div>
        </div>

      </div>
    </Modal>
  );
}
