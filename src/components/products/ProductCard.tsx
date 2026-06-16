import React from 'react';

interface ProductCardProps {
  product: any;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'inactive':
        return 'bg-slate-100 text-slate-500 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getMetalColor = (metal: string) => {
    switch (metal.toLowerCase()) {
      case 'gold':
        return 'bg-amber-100 text-amber-700';
      case 'silver':
        return 'bg-slate-100 text-slate-700';
      case 'platinum':
        return 'bg-indigo-100 text-indigo-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
      {/* Top action buttons (appear on hover) */}
      <div className="absolute right-3 top-3 flex gap-1.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <button
          onClick={onEdit}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-slate-500 shadow-sm backdrop-blur-sm transition-colors hover:bg-slate-50 hover:text-[var(--primary)] border border-slate-200/50"
          title="Edit Product"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-slate-500 shadow-sm backdrop-blur-sm transition-colors hover:bg-red-50 hover:text-red-600 border border-slate-200/50"
          title="Delete Product"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${getStatusColor(product.status)}`}>
            {product.status}
          </span>
          <span className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${getMetalColor(product.metal_type)}`}>
            {product.metal_type} • {parseFloat(product.purity).toFixed(2)}
          </span>
        </div>

        <h3 className="mb-1 text-lg font-bold leading-tight text-slate-900 line-clamp-1" title={product.name}>
          {product.name}
        </h3>
        <p className="mb-4 text-xs font-semibold text-slate-400">SKU: {product.sku}</p>

        <div className="grid grid-cols-2 gap-3 mb-4 rounded-xl bg-slate-50 p-3 border border-slate-100">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Weight</p>
            <p className="font-semibold text-slate-700">{parseFloat(product.weight).toFixed(3)} {product.unit}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Inventory</p>
            <p className="font-semibold text-slate-700 capitalize">{product.inventory_type}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Category</span>
            <span className="font-medium text-slate-700 line-clamp-1 text-right max-w-[120px]" title={product.category_name || 'None'}>
              {product.category_name || '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Buy / Sell Prem.</span>
            <span className="font-medium text-slate-700">
              ${parseFloat(product.buy_premium).toFixed(2)} / ${parseFloat(product.sell_premium).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
      
      {/* Footer highlights */}
      <div className="mt-auto flex items-center justify-between bg-slate-50 px-5 py-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          {product.hedging_enabled && (
             <span className="flex items-center justify-center rounded bg-[var(--primary-light)] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--primary-dark)]" title="Hedging Enabled">
               Hedge
             </span>
          )}
          {product.redeemable && (
            <span className="flex items-center justify-center rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-700" title="Redeemable">
              Redeem
            </span>
          )}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Making Chrg</p>
          <p className="font-bold text-slate-800">${parseFloat(product.making_charge).toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}
