import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { Entity } from '@/types';
import { useApp } from '@/context/AppContext';
import { generateId } from '@/data/mockData';

export function EntityManagementModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { entities, addEntity, branches } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'name' | 'createdAt'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const branchId = branches.length === 1 ? branches[0].id : undefined;

  const filteredEntities = entities.filter(e => {
    if (branchId && e.branchId !== branchId) return false;
    if (searchTerm && !e.name.toLowerCase().includes(searchTerm.toLowerCase()) && !(e.phone && e.phone.includes(searchTerm))) return false;
    return true;
  }).sort((a, b) => {
    if (sortField === 'name') {
      return sortDir === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    } else {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sortDir === 'asc' ? dateA - dateB : dateB - dateA;
    }
  });

  const handleSort = (field: 'name' | 'createdAt') => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const handleCreate = async () => {
    if (!name) return;
    setIsSubmitting(true);
    const newEntity: Entity = {
      id: generateId('ENT'),
      name,
      phone: phone || undefined,
      branchId,
      createdAt: new Date().toISOString()
    };
    const success = await addEntity(newEntity);
    setIsSubmitting(false);
    if (success) {
      setName('');
      setPhone('');
      setIsCreating(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manage Entities"
      footer={null}
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
              placeholder="Search entities by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            className="px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent-dark transition-colors font-medium flex items-center gap-2 ml-4"
            onClick={() => setIsCreating(!isCreating)}
          >
            {isCreating ? 'Cancel' : 'Add Entity'}
          </button>
        </div>

        {isCreating && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
            <h4 className="font-semibold text-slate-800">Create New Entity</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Phone Number (Optional)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-accent outline-none"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. +971 50 123 4567"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors font-medium disabled:opacity-50"
                onClick={handleCreate}
                disabled={!name || isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Entity'}
              </button>
            </div>
          </div>
        )}

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm font-medium text-slate-600">
                <th className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-2">
                    Name
                    {sortField === 'name' && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={sortDir === 'desc' ? 'rotate-180' : ''}>
                        <path d="M12 5v14M5 12l7-7 7 7" />
                      </svg>
                    )}
                  </div>
                </th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('createdAt')}>
                  <div className="flex items-center gap-2">
                    Created At
                    {sortField === 'createdAt' && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={sortDir === 'desc' ? 'rotate-180' : ''}>
                        <path d="M12 5v14M5 12l7-7 7 7" />
                      </svg>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-800">
              {filteredEntities.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-500">
                    No entities found. Create one to get started.
                  </td>
                </tr>
              ) : (
                filteredEntities.map(ent => (
                  <tr key={ent.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-medium">{ent.name}</td>
                    <td className="py-3 px-4 text-slate-500">{ent.phone || '-'}</td>
                    <td className="py-3 px-4 text-slate-500">{ent.createdAt ? new Date(ent.createdAt).toLocaleDateString() : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
