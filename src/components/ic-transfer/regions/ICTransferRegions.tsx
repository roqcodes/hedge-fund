'use client';

import React, { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { btnPrimary, formGroup, formInput, formLabel } from '@/lib/ui';
import { PageHeader, PageShell, SectionCard, SearchInput } from '../ui';

export default function ICTransferRegions() {
  const { icRegions, icWarehouses, addICRegion, updateICRegion, deleteICRegion } = useApp();

  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCountry, setEditCountry] = useState('');

  const warehouseCountByRegion = useMemo(() => {
    const map = new Map<string, number>();
    icWarehouses.forEach(w => {
      if (w.regionId) map.set(w.regionId, (map.get(w.regionId) ?? 0) + 1);
    });
    return map;
  }, [icWarehouses]);

  const filteredRegions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? icRegions.filter(
          r => r.name.toLowerCase().includes(q) || r.country.toLowerCase().includes(q),
        )
      : icRegions;
    return [...base].sort((a, b) => a.name.localeCompare(b.name));
  }, [icRegions, search]);

  const handleCreate = async () => {
    if (!name.trim() || !country.trim()) return;
    setIsSubmitting(true);
    await addICRegion(name.trim(), country.trim());
    setName('');
    setCountry('');
    setIsSubmitting(false);
  };

  const startEdit = (id: string, currentName: string, currentCountry: string) => {
    setEditingId(id);
    setEditName(currentName);
    setEditCountry(currentCountry);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim() || !editCountry.trim()) return;
    await updateICRegion(editingId, editName.trim(), editCountry.trim());
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this region? It might fail if linked to suppliers or warehouses.')) return;
    await deleteICRegion(id);
  };

  return (
    <PageShell>
      <PageHeader title="Regions" subtitle="Manage regions for suppliers and warehouses" />

      <SectionCard className="mb-5">
        <div className="border-b border-slate-100 px-4 py-4 md:px-6">
          <h3 className="mb-3 text-base font-bold text-slate-900 sm:text-lg">Add New Region</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div className={formGroup}>
              <label className={formLabel}>Region Name</label>
              <input
                className={formInput}
                placeholder="e.g. Middle East"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className={formGroup}>
              <label className={formLabel}>Country</label>
              <input
                className={formInput}
                placeholder="e.g. UAE"
                value={country}
                onChange={e => setCountry(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <button
              type="button"
              className={btnPrimary}
              onClick={handleCreate}
              disabled={isSubmitting || !name.trim() || !country.trim()}
            >
              {isSubmitting ? 'Adding…' : 'Add Region'}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 px-4 py-4 md:px-6 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="shrink-0 text-base font-bold text-slate-900 sm:text-lg">All Regions</h3>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search regions…"
            className="min-w-0 max-sm:w-full sm:max-w-xs"
          />
        </div>

        <div className="px-2 pb-4 md:px-4">
          <div className="overflow-hidden rounded-xl border border-slate-200">
            {filteredRegions.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">
                {search ? 'No regions match your search.' : 'No regions configured yet.'}
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filteredRegions.map(region => {
                  const linkedCount = warehouseCountByRegion.get(region.id) ?? 0;
                  const isEditing = editingId === region.id;
                  return (
                    <li key={region.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                      {isEditing ? (
                        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                          <input
                            className={formInput}
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            placeholder="Region name"
                          />
                          <input
                            className={formInput}
                            value={editCountry}
                            onChange={e => setEditCountry(e.target.value)}
                            placeholder="Country"
                          />
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600 hover:bg-emerald-100"
                              onClick={saveEdit}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-900">{region.name}</p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {region.country}
                              {linkedCount > 0
                                ? ` · ${linkedCount} warehouse${linkedCount === 1 ? '' : 's'}`
                                : ''}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              className="rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-600 hover:bg-sky-100"
                              onClick={() => startEdit(region.id, region.name, region.country)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-100"
                              onClick={() => handleDelete(region.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </SectionCard>
    </PageShell>
  );
}
