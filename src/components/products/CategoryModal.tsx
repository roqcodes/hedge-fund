import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { btnPrimary, formInput, dataTable, tableWrap } from '@/lib/ui';
import { saveCategory, deleteCategory, saveSubcategory, deleteSubcategory } from '@/app/actions/productActions';

interface CategoryModalProps {
  slug: string;
  open: boolean;
  categories: any[];
  subcategories: any[];
  onClose: () => void;
  onRefresh: () => void;
}

export default function CategoryModal({ slug, open, categories, subcategories, onClose, onRefresh }: CategoryModalProps) {
  const [activeTab, setActiveTab] = useState<'categories' | 'subcategories'>('categories');
  const [isSaving, setIsSaving] = useState(false);

  // Category State
  const [catName, setCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  // Subcategory State
  const [subName, setSubName] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [editingSubId, setEditingSubId] = useState<string | null>(null);

  const handleSaveCategory = async () => {
    if (!catName) return alert('Category name is required');
    setIsSaving(true);
    const res = await saveCategory(slug, editingCatId, catName);
    setIsSaving(false);
    if (res.success) {
      setCatName('');
      setEditingCatId(null);
      onRefresh();
    } else alert('Error: ' + res.error);
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm('Delete this category? Subcategories will also be deleted.')) {
      const res = await deleteCategory(id);
      if (res.success) onRefresh();
      else alert('Error: ' + res.error);
    }
  };

  const handleSaveSubcategory = async () => {
    if (!subName || !selectedCatId) return alert('Name and Category are required');
    setIsSaving(true);
    const res = await saveSubcategory(slug, editingSubId, selectedCatId, subName);
    setIsSaving(false);
    if (res.success) {
      setSubName('');
      setEditingSubId(null);
      setSelectedCatId('');
      onRefresh();
    } else alert('Error: ' + res.error);
  };

  const handleDeleteSubcategory = async (id: string) => {
    if (confirm('Delete this subcategory?')) {
      const res = await deleteSubcategory(id);
      if (res.success) onRefresh();
      else alert('Error: ' + res.error);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manage Categories"
      maxWidth="max-w-[700px] w-[95vw]"
      footer={
        <button type="button" onClick={onClose} className={btnPrimary}>Close</button>
      }
    >
      <div className="flex gap-4 border-b border-slate-200 mb-6">
        <button 
          onClick={() => setActiveTab('categories')}
          className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'categories' ? 'border-b-2 border-[var(--primary)] text-[var(--primary)]' : 'text-slate-400 hover:text-slate-700'}`}
        >
          Categories
        </button>
        <button 
          onClick={() => setActiveTab('subcategories')}
          className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'subcategories' ? 'border-b-2 border-[var(--primary)] text-[var(--primary)]' : 'text-slate-400 hover:text-slate-700'}`}
        >
          Subcategories
        </button>
      </div>

      {activeTab === 'categories' && (
        <div className="flex flex-col gap-6">
          <div className="flex items-end gap-3 rounded-xl bg-slate-50 p-4 border border-slate-100">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Category Name</label>
              <input type="text" value={catName} onChange={e => setCatName(e.target.value)} className={formInput} placeholder="e.g. Gold Bars" />
            </div>
            <button onClick={handleSaveCategory} disabled={isSaving} className={btnPrimary}>
              {editingCatId ? 'Update' : 'Add'}
            </button>
            {editingCatId && (
              <button onClick={() => { setEditingCatId(null); setCatName(''); }} className="px-3 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700">Cancel</button>
            )}
          </div>

          <div className={tableWrap}>
            <table className={dataTable}>
              <thead>
                <tr>
                  <th>Category Name</th>
                  <th className="text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(c => (
                  <tr key={c.id}>
                    <td className="font-semibold text-slate-700">{c.name}</td>
                    <td className="text-right space-x-2">
                      <button onClick={() => { setEditingCatId(c.id); setCatName(c.name); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[var(--primary)] transition-colors" title="Edit">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDeleteCategory(c.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Delete">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 && (
                  <tr><td colSpan={2} className="text-center py-4 text-slate-500 text-sm">No categories found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'subcategories' && (
        <div className="flex flex-col gap-6">
          <div className="flex items-end gap-3 rounded-xl bg-slate-50 p-4 border border-slate-100">
            <div className="w-1/3">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Category</label>
              <select value={selectedCatId} onChange={e => setSelectedCatId(e.target.value)} className={formInput}>
                <option value="">Select Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Subcategory Name</label>
              <input type="text" value={subName} onChange={e => setSubName(e.target.value)} className={formInput} placeholder="e.g. 100g Cast Bar" />
            </div>
            <button onClick={handleSaveSubcategory} disabled={isSaving} className={btnPrimary}>
              {editingSubId ? 'Update' : 'Add'}
            </button>
            {editingSubId && (
              <button onClick={() => { setEditingSubId(null); setSubName(''); setSelectedCatId(''); }} className="px-3 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700">Cancel</button>
            )}
          </div>

          <div className={tableWrap}>
            <table className={dataTable}>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Subcategory Name</th>
                  <th className="text-right w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subcategories.map(s => {
                  const cat = categories.find(c => c.id === s.category_id);
                  return (
                    <tr key={s.id}>
                      <td className="text-sm text-slate-500">{cat?.name || 'Unknown'}</td>
                      <td className="font-semibold text-slate-700">{s.name}</td>
                      <td className="text-right space-x-2">
                        <button onClick={() => { setEditingSubId(s.id); setSubName(s.name); setSelectedCatId(s.category_id); }} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[var(--primary)] transition-colors" title="Edit">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDeleteSubcategory(s.id)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Delete">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {subcategories.length === 0 && (
                  <tr><td colSpan={3} className="text-center py-4 text-slate-500 text-sm">No subcategories found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
