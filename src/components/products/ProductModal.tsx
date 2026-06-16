import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { btnPrimary, btnSecondary, formInput } from '@/lib/ui';
import { saveProduct } from '@/app/actions/productActions';

interface ProductModalProps {
  slug: string;
  open: boolean;
  product?: any;
  categories: any[];
  subcategories: any[];
  onClose: () => void;
  onSave: () => void;
}

export default function ProductModal({ slug, open, product, categories, subcategories, onClose, onSave }: ProductModalProps) {
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category_id: '',
    subcategory_id: '',
    metal_type: 'Gold',
    purity: '',
    weight: '',
    unit: 'Gram',
    brand: '',
    origin: '',
    buy_premium: '0',
    sell_premium: '0',
    making_charge: '0',
    vat_percent: '0',
    inventory_type: 'Physical',
    redeemable: false,
    hedging_enabled: false,
    status: 'Active'
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        sku: product.sku || '',
        name: product.name || '',
        category_id: product.category_id || '',
        subcategory_id: product.subcategory_id || '',
        metal_type: product.metal_type || 'Gold',
        purity: product.purity || '',
        weight: product.weight || '',
        unit: product.unit || 'Gram',
        brand: product.brand || '',
        origin: product.origin || '',
        buy_premium: product.buy_premium || '0',
        sell_premium: product.sell_premium || '0',
        making_charge: product.making_charge || '0',
        vat_percent: product.vat_percent || '0',
        inventory_type: product.inventory_type || 'Physical',
        redeemable: product.redeemable || false,
        hedging_enabled: product.hedging_enabled || false,
        status: product.status || 'Active'
      });
    } else {
      setFormData({
        sku: '', name: '', category_id: '', subcategory_id: '',
        metal_type: 'Gold', purity: '', weight: '', unit: 'Gram',
        brand: '', origin: '', buy_premium: '0', sell_premium: '0',
        making_charge: '0', vat_percent: '0', inventory_type: 'Physical',
        redeemable: false, hedging_enabled: false, status: 'Active'
      });
    }
  }, [product, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    if (!formData.sku || !formData.name || !formData.weight || !formData.purity) {
      alert('Please fill out all required fields: SKU, Name, Weight, and Purity');
      return;
    }

    setIsSaving(true);
    const payload = { ...formData, id: product?.id };
    const res = await saveProduct(slug, payload);
    setIsSaving(false);

    if (res.success) {
      onSave();
    } else {
      alert('Failed to save product: ' + res.error);
    }
  };

  const filteredSubcategories = subcategories.filter(s => s.category_id === formData.category_id);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? 'Edit Product' : 'New Product'}
      maxWidth="max-w-[800px] w-[95vw]"
      footer={
        <>
          <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
          <button type="button" onClick={handleSave} disabled={isSaving} className={`${btnPrimary} ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {isSaving ? 'Saving...' : 'Save Product'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Core Info */}
        <div className="md:col-span-2"><h4 className="font-bold text-slate-700 border-b pb-2 mb-2">Basic Details</h4></div>
        
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Product Code (SKU)*</label>
          <input type="text" name="sku" value={formData.sku} onChange={handleChange} className={formInput} placeholder="e.g. GLD-BAR-100G" required />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Product Name*</label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} className={formInput} placeholder="100g Gold Bar" required />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Category</label>
          <select name="category_id" value={formData.category_id} onChange={handleChange} className={formInput}>
            <option value="">Select Category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Sub Category</label>
          <select name="subcategory_id" value={formData.subcategory_id} onChange={handleChange} className={formInput} disabled={!formData.category_id}>
            <option value="">Select Subcategory</option>
            {filteredSubcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Brand / Refinery</label>
          <input type="text" name="brand" value={formData.brand} onChange={handleChange} className={formInput} placeholder="e.g. PAMP, Valcambi" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Country of Origin</label>
          <input type="text" name="origin" value={formData.origin} onChange={handleChange} className={formInput} placeholder="e.g. Switzerland" />
        </div>

        {/* Specifications */}
        <div className="md:col-span-2 mt-2"><h4 className="font-bold text-slate-700 border-b pb-2 mb-2">Specifications</h4></div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Metal Type*</label>
          <select name="metal_type" value={formData.metal_type} onChange={handleChange} className={formInput}>
            <option value="Gold">Gold</option>
            <option value="Silver">Silver</option>
            <option value="Platinum">Platinum</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Purity*</label>
          <input type="number" step="0.0000001" name="purity" value={formData.purity} onChange={handleChange} className={formInput} placeholder="e.g. 995, 999.9" required />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Weight*</label>
          <input type="number" step="0.001" name="weight" value={formData.weight} onChange={handleChange} className={formInput} placeholder="Weight" required />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Unit*</label>
          <select name="unit" value={formData.unit} onChange={handleChange} className={formInput}>
            <option value="Gram">Gram</option>
            <option value="Kg">Kg</option>
            <option value="Oz">Oz</option>
            <option value="Tola">Tola</option>
          </select>
        </div>

        {/* Pricing & Commercials */}
        <div className="md:col-span-2 mt-2"><h4 className="font-bold text-slate-700 border-b pb-2 mb-2">Pricing & Control</h4></div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Buy Premium</label>
          <input type="number" step="0.01" name="buy_premium" value={formData.buy_premium} onChange={handleChange} className={formInput} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Sell Premium</label>
          <input type="number" step="0.01" name="sell_premium" value={formData.sell_premium} onChange={handleChange} className={formInput} />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Making Charge</label>
          <input type="number" step="0.01" name="making_charge" value={formData.making_charge} onChange={handleChange} className={formInput} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">VAT %</label>
          <input type="number" step="0.01" name="vat_percent" value={formData.vat_percent} onChange={handleChange} className={formInput} />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Inventory Type</label>
          <select name="inventory_type" value={formData.inventory_type} onChange={handleChange} className={formInput}>
            <option value="Physical">Physical</option>
            <option value="Digital">Digital</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Status</label>
          <select name="status" value={formData.status} onChange={handleChange} className={formInput}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="md:col-span-2 flex gap-6 pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="redeemable" checked={formData.redeemable} onChange={handleChange} className="size-4 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]" />
            <span className="text-sm font-semibold text-slate-700">Redeemable</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="hedging_enabled" checked={formData.hedging_enabled} onChange={handleChange} className="size-4 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]" />
            <span className="text-sm font-semibold text-slate-700">Hedging Enabled</span>
          </label>
        </div>
      </div>
    </Modal>
  );
}
