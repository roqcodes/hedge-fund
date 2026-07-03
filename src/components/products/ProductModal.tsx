'use client';

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

const EMPTY_FORM = {
  name: '',
  category_id: '',
  subcategory_id: '',
  metal_type: 'Gold',
  purity: '',
  weight: '',
  unit: 'Gram',
  brand: '',
  origin: '',
};

const labelClass = 'mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-400';
const compactInput = `${formInput} !py-2 !text-sm`;

function Field({
  label,
  required,
  children,
  className = '',
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className={labelClass}>
        {label}
        {required ? <span className="text-accent"> *</span> : null}
      </label>
      {children}
    </div>
  );
}

export default function ProductModal({
  slug,
  open,
  product,
  categories,
  subcategories,
  onClose,
  onSave,
}: ProductModalProps) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const isEdit = !!product;

  useEffect(() => {
    if (!open) return;
    if (product) {
      setFormData({
        name: product.name || '',
        category_id: product.category_id || '',
        subcategory_id: product.subcategory_id || '',
        metal_type: product.metal_type || 'Gold',
        purity: product.purity ?? '',
        weight: product.weight ?? '',
        unit: product.unit || 'Gram',
        brand: product.brand || '',
        origin: product.origin || '',
      });
    } else {
      setFormData(EMPTY_FORM);
    }
  }, [product, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'category_id' && value !== prev.category_id) {
        next.subcategory_id = '';
      }
      return next;
    });
  };

  const filteredSubcategories = subcategories.filter(s => s.category_id === formData.category_id);

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.weight || !formData.purity) {
      alert('Name, weight, and purity are required.');
      return;
    }

    setIsSaving(true);
    const res = await saveProduct(slug, {
      ...formData,
      id: product?.id,
      sku: isEdit ? product.sku : undefined,
      status: product?.status || 'Active',
    });
    setIsSaving(false);

    if (res.success) {
      onSave();
    } else {
      alert('Failed to save product: ' + res.error);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          <span>{isEdit ? 'Edit Product' : 'New Product'}</span>
          {isEdit && product?.sku ? (
            <span className="font-mono text-[11px] font-medium text-slate-400">{product.sku}</span>
          ) : null}
        </div>
      }
      maxWidth="max-w-[880px] w-[95vw]"
      footer={
        <>
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={`${btnPrimary} ${isSaving ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            {isSaving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Product'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-x-8 gap-y-5 lg:grid-cols-12">
        {/* Name — full width hero row */}
        <Field label="Product name" required className="lg:col-span-12">
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`${compactInput} font-medium`}
            placeholder="100g Gold Bar — PAMP Suisse"
            autoFocus
          />
        </Field>

        {/* Metal specs — primary row */}
        <Field label="Metal" required className="lg:col-span-3">
          <select name="metal_type" value={formData.metal_type} onChange={handleChange} className={compactInput}>
            <option value="Gold">Gold</option>
            <option value="Silver">Silver</option>
            <option value="Platinum">Platinum</option>
          </select>
        </Field>
        <Field label="Weight" required className="lg:col-span-3">
          <input
            type="number"
            step="0.001"
            name="weight"
            value={formData.weight}
            onChange={handleChange}
            className={compactInput}
            placeholder="100"
          />
        </Field>
        <Field label="Unit" required className="lg:col-span-3">
          <select name="unit" value={formData.unit} onChange={handleChange} className={compactInput}>
            <option value="Gram">Gram</option>
            <option value="Kg">Kg</option>
            <option value="Oz">Oz</option>
            <option value="Tola">Tola</option>
          </select>
        </Field>
        <Field label="Purity" required className="lg:col-span-3">
          <input
            type="number"
            step="0.0000001"
            name="purity"
            value={formData.purity}
            onChange={handleChange}
            className={compactInput}
            placeholder="999.9"
          />
        </Field>

        <div className="hidden lg:col-span-12 lg:block">
          <div className="border-t border-slate-100" />
        </div>

        {/* Classification + optional */}
        <Field label="Category" className="lg:col-span-3">
          <select name="category_id" value={formData.category_id} onChange={handleChange} className={compactInput}>
            <option value="">None</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Subcategory" className="lg:col-span-3">
          <select
            name="subcategory_id"
            value={formData.subcategory_id}
            onChange={handleChange}
            className={compactInput}
            disabled={!formData.category_id}
          >
            <option value="">None</option>
            {filteredSubcategories.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Brand / refinery" className="lg:col-span-3">
          <input
            type="text"
            name="brand"
            value={formData.brand}
            onChange={handleChange}
            className={compactInput}
            placeholder="PAMP, Valcambi…"
          />
        </Field>
        <Field label="Origin" className="lg:col-span-3">
          <input
            type="text"
            name="origin"
            value={formData.origin}
            onChange={handleChange}
            className={compactInput}
            placeholder="Switzerland, UAE…"
          />
        </Field>
        {!isEdit ? (
          <p className="text-[11px] text-slate-400 lg:col-span-12">
            SKU is assigned automatically when you create the product.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
