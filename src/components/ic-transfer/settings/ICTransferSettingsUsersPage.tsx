'use client';

import React, { useState } from 'react';
import { dataTable, tableWrap } from '@/lib/ui';
import { badgeClass } from '@/lib/badgeClass';
import {
  AddButton,
  icRowLabelClass,
  icThClass,
  PageHeader,
  PageShell,
  SearchInput,
  SectionCard,
} from '../ui';
import AddUserModal from './AddUserModal';

type Props = {
  title: string;
  subtitle?: string;
  addButtonLabel?: string;
  modalTitle?: string;
  showCommission?: boolean;
  showRate?: boolean;
  nameColumn?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  data?: any[];
  onEditItem?: (item: any) => void;
  onDeleteItem?: (id: string) => void;
};

export default function ICTransferSettingsUsersPage({
  title,
  subtitle,
  addButtonLabel = 'Add Setting',
  modalTitle = 'Add Setting',
  showCommission = false,
  showRate = true,
  nameColumn = 'Name',
  actions,
  children,
  data = [],
  onEditItem,
  onDeleteItem,
}: Props) {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const columns = ['#', 'ID', nameColumn, 'Phone Number', ...(showRate || showCommission ? [showRate ? 'Rate' : 'Commission'] : []), 'Status', 'Action'];

  const filtered = data.filter((item) => 
    item.name?.toLowerCase().includes(search.toLowerCase()) || 
    item.id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageShell>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={actions || <AddButton label={addButtonLabel} onClick={() => setModalOpen(true)} />}
      />

      <SectionCard>
        <div className="flex flex-col gap-3 px-4 pb-3 sm:flex-row sm:items-center sm:justify-between md:border-b md:border-slate-100 md:px-6 md:py-4">
          <h3 className="text-base font-bold text-slate-900 sm:text-lg">All Settings</h3>
          <SearchInput value={search} onChange={setSearch} placeholder="Search settings..." className="sm:max-w-xs" />
        </div>
        <div className="p-0 pb-3 md:pb-5">
          <div className={tableWrap}>
            <table className={`${dataTable} min-w-[640px]`}>
              <thead>
                <tr>
                  {columns.map(col => (
                    <th key={col} className={icThClass('left')}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((user, i) => (
                  <tr key={user.id} data-interactive-row>
                    <td className={`${icRowLabelClass} first:rounded-l-2xl`}>{i + 1}</td>
                    <td className="border-y border-black/5 bg-white px-3 py-2.5 sm:px-4">
                      <div className="text-sm font-bold text-sky-600 truncate max-w-[100px]" title={user.id}>
                        {user.id.substring(0, 8).toUpperCase()}
                      </div>
                      <div className="text-[11px] text-slate-400">Registered: {new Date(user.createdAt || Date.now()).toLocaleDateString()}</div>
                    </td>
                    <td className="border-y border-black/5 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 sm:px-4">{user.name}</td>
                    <td className="border-y border-black/5 bg-white px-3 py-2.5 text-sm text-slate-600 sm:px-4">{user.phone || '—'}</td>
                    {(showRate || showCommission) && (
                      <td className="border-y border-black/5 bg-white px-3 py-2.5 font-mono text-sm sm:px-4">{user.rate || user.commission || '—'}</td>
                    )}
                    <td className="border-y border-black/5 bg-white px-3 py-2.5 sm:px-4">
                      <span className={badgeClass('active')}>Active</span>
                    </td>
                    <td className="border-y border-r border-black/5 bg-white px-3 py-2.5 last:rounded-r-2xl sm:px-4">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-600 hover:bg-sky-100" onClick={() => onEditItem?.(user)}>Edit</button>
                        <button type="button" className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-100" onClick={() => { if(confirm('Are you sure you want to delete this?')) onDeleteItem?.(user.id); }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="px-4 py-12 text-center text-sm text-slate-400">No settings found.</div>
            )}
          </div>
        </div>
      </SectionCard>

      {!actions && (
        <AddUserModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={modalTitle}
          showCommission={showCommission}
          showRate={showRate}
        />
      )}
      {children}
    </PageShell>
  );
}
