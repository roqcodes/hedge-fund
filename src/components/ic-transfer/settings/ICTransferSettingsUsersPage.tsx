'use client';

import React, { useState } from 'react';
import { dataTable, tableWrap } from '@/lib/ui';
import { IC_MOCK_USERS } from '@/lib/icTransfer/mockData';
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
};

export default function ICTransferSettingsUsersPage({
  title,
  subtitle,
  addButtonLabel = 'Add Account',
  modalTitle = 'Add User',
  showCommission = false,
  showRate = true,
  nameColumn = 'Name',
}: Props) {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const columns = ['#', 'Account ID', nameColumn, 'Phone Number', ...(showRate ? ['Rate'] : []), 'Status', 'Action'];

  const filtered = IC_MOCK_USERS.filter(
    u =>
      !search.trim() ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.id.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <PageShell>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={<AddButton label={addButtonLabel} onClick={() => setModalOpen(true)} />}
      />

      <SectionCard>
        <div className="flex flex-col gap-3 px-4 pb-3 sm:flex-row sm:items-center sm:justify-between md:border-b md:border-slate-100 md:px-6 md:py-4">
          <h3 className="text-base font-bold text-slate-900 sm:text-lg">All Accounts</h3>
          <SearchInput value={search} onChange={setSearch} placeholder="Search accounts..." className="sm:max-w-xs" />
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
                      <div className="text-sm font-bold text-sky-600">{user.id}</div>
                      <div className="text-[11px] text-slate-400">Registered At: {user.registeredAt}</div>
                    </td>
                    <td className="border-y border-black/5 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 sm:px-4">{user.name}</td>
                    <td className="border-y border-black/5 bg-white px-3 py-2.5 text-sm text-slate-600 sm:px-4">{user.phone}</td>
                    {showRate && (
                      <td className="border-y border-black/5 bg-white px-3 py-2.5 font-mono text-sm sm:px-4">{user.rate}</td>
                    )}
                    <td className="border-y border-black/5 bg-white px-3 py-2.5 sm:px-4">
                      <span className={badgeClass(user.status.toLowerCase())}>{user.status}</span>
                      <div className="mt-0.5 text-[10px] text-slate-400">Last Login: Never</div>
                    </td>
                    <td className="border-y border-r border-black/5 bg-white px-3 py-2.5 last:rounded-r-2xl sm:px-4">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-600">Edit</button>
                        <button type="button" className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="px-4 py-12 text-center text-sm text-slate-400">No accounts found.</div>
            )}
          </div>
        </div>
      </SectionCard>

      <AddUserModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        showCommission={showCommission}
        showRate={showRate}
      />
    </PageShell>
  );
}
