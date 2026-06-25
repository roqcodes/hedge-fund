'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { btnPrimary, btnSecondary, formGroup, formInput, formLabel } from '@/lib/ui';
import { useApp } from '@/context/AppContext';

type Props = {
  open: boolean;
  onClose: () => void;
  onAdd?: (name: string, country: string) => Promise<void>;
};

export default function AddRegionModal({ open, onClose, onAdd }: Props) {
  const { icRegions, updateICRegion, deleteICRegion } = useApp();
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCountry, setEditCountry] = useState('');

  const handleCreate = async () => {
    if (onAdd && name && country) {
      setIsSubmitting(true);
      await onAdd(name, country);
      setName('');
      setCountry('');
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (region: any) => {
    setEditingId(region.id);
    setEditName(region.name);
    setEditCountry(region.country);
  };

  const handleSaveEdit = async () => {
    if (editingId && editName && editCountry) {
      await updateICRegion(editingId, editName, editCountry);
      setEditingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this region? It might fail if linked to suppliers/warehouses.')) {
      await deleteICRegion(id);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manage Regions"
      maxWidth="max-w-xl"
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose}>Close</button>
        </>
      }
    >
      <div className="mb-6">
        <h4 className="mb-3 text-sm font-semibold text-slate-700">Existing Regions</h4>
        <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200">
          {icRegions.length === 0 ? (
            <div className="p-3 text-center text-sm text-slate-500">No regions configured yet.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {icRegions.map(region => (
                <li key={region.id} className="flex items-center justify-between p-3 text-sm">
                  {editingId === region.id ? (
                    <div className="flex w-full items-center gap-2">
                      <input className={formInput} value={editName} onChange={e => setEditName(e.target.value)} />
                      <input className={formInput} value={editCountry} onChange={e => setEditCountry(e.target.value)} />
                      <button className="text-accent hover:text-accent/80 font-semibold" onClick={handleSaveEdit}>Save</button>
                      <button className="text-slate-400 hover:text-slate-600 font-semibold" onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <span className="font-medium text-slate-900 block">{region.name}</span>
                        <span className="text-xs text-slate-500">{region.country}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button className="text-slate-400 hover:text-accent" onClick={() => handleStartEdit(region)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button className="text-slate-400 hover:text-red-500" onClick={() => handleDelete(region.id)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-lg bg-slate-50 p-4 border border-slate-100">
        <h4 className="mb-3 text-sm font-semibold text-slate-700">Add New Region</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className={formGroup}>
            <label className={formLabel}>Region Name</label>
            <input className={formInput} placeholder="e.g. Middle East" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className={formGroup}>
            <label className={formLabel}>Country</label>
            <input className={formInput} placeholder="e.g. UAE" value={country} onChange={e => setCountry(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <button 
            type="button" 
            className={btnPrimary} 
            onClick={handleCreate}
            disabled={isSubmitting || !name || !country}
          >
            {isSubmitting ? 'Adding...' : 'Add Region'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
