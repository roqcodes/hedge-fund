'use client';

import React, { useEffect, useState } from 'react';
import { fetchBranchDealsStaffAction, type DealsStaffOption } from '@/app/actions/dealPermissionActions';
import type { DealAccessLevel, DealStaffAssignment } from '@/types';
import { formHint, formLabel, formSelect } from '@/lib/ui';

const ACCESS_OPTIONS: { value: DealAccessLevel; label: string }[] = [
  { value: 'read', label: 'Read only' },
  { value: 'write', label: 'Read & write' },
];

type Props = {
  branchSlug?: string;
  assignments: DealStaffAssignment[];
  onChange: (assignments: DealStaffAssignment[]) => void;
  disabled?: boolean;
  /** When true, renders without outer card chrome (for use inside a modal). */
  embedded?: boolean;
};

export default function DealStaffAssignmentSection({
  branchSlug,
  assignments,
  onChange,
  disabled = false,
  embedded = false,
}: Props) {
  const [staffOptions, setStaffOptions] = useState<DealsStaffOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState('');

  useEffect(() => {
    if (!branchSlug) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetchBranchDealsStaffAction(branchSlug).then(res => {
      if (cancelled) return;
      if (res.success) {
        setStaffOptions(res.staff);
      } else {
        setLoadError(res.error);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [branchSlug]);

  const assignedIds = new Set(assignments.map(a => a.userId));
  const availableStaff = staffOptions.filter(s => !assignedIds.has(s.userId));

  const resolveName = (userId: string) =>
    staffOptions.find(s => s.userId === userId)?.name
    ?? assignments.find(a => a.userId === userId)?.userName
    ?? userId;

  const handleAdd = () => {
    if (!selectedStaffId) return;
    const staff = staffOptions.find(s => s.userId === selectedStaffId);
    if (!staff) return;
    onChange([
      ...assignments,
      {
        userId: staff.userId,
        userName: staff.name,
        accessLevel: 'read',
      },
    ]);
    setSelectedStaffId('');
  };

  const handleRemove = (userId: string) => {
    onChange(assignments.filter(a => a.userId !== userId));
  };

  const handleAccessChange = (userId: string, accessLevel: DealAccessLevel) => {
    onChange(assignments.map(a => (a.userId === userId ? { ...a, accessLevel } : a)));
  };

  if (!branchSlug) return null;

  const content = (
    <>
      {!embedded && (
        <div className="mb-1 flex items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-slate-800">Assigned Staff</h4>
        </div>
      )}
      <p className={`${formHint} ${embedded ? 'mb-4' : 'mb-3'}`}>
        Staff need Groups &amp; Deals page access in Settings first. Assigned staff only see and manage these groups.
      </p>

      {loadError && (
        <p className="mb-3 text-xs text-amber-700">{loadError}</p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading staff…</p>
      ) : staffOptions.length === 0 ? (
        <p className="text-sm text-slate-500">
          No staff with Groups &amp; Deals access. Add staff in Settings and grant page access first.
        </p>
      ) : (
        <>
          {!disabled && availableStaff.length > 0 && (
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 min-w-0">
                <label className={formLabel}>Add staff</label>
                <select
                  className={formSelect}
                  value={selectedStaffId}
                  onChange={e => setSelectedStaffId(e.target.value)}
                  disabled={disabled}
                >
                  <option value="">Select staff member</option>
                  {availableStaff.map(s => (
                    <option key={s.userId} value={s.userId}>
                      {s.name} ({s.email})
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!selectedStaffId || disabled}
                className="shrink-0 rounded-lg border border-accent bg-accent/10 px-3 py-2 text-xs font-bold text-accent hover:bg-accent/20 disabled:opacity-50"
              >
                + Add
              </button>
            </div>
          )}

          {assignments.length === 0 ? (
            <p className="text-sm text-slate-500">No staff assigned yet.</p>
          ) : (
            <div className="space-y-2">
              {assignments.map(assignment => (
                <div
                  key={assignment.userId}
                  className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {resolveName(assignment.userId)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
                      {ACCESS_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={disabled}
                          onClick={() => handleAccessChange(assignment.userId, opt.value)}
                          className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
                            assignment.accessLevel === opt.value
                              ? 'bg-white text-accent shadow-sm'
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => handleRemove(assignment.userId)}
                        className="text-xs font-semibold text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );

  if (embedded) return content;

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
      {content}
    </div>
  );
}
