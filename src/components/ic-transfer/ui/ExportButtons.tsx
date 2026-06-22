'use client';

import React from 'react';
import { btnGhost, btnSm } from '@/lib/ui';

export default function ExportButtons() {
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={`${btnGhost} ${btnSm} !rounded-xl border border-slate-200 bg-white px-3 shadow-surface-xs`} title="Export PDF">
        PDF
      </button>
      <button type="button" className={`${btnGhost} ${btnSm} !rounded-xl border border-slate-200 bg-white px-3 shadow-surface-xs`} title="Export Excel">
        XLS
      </button>
    </div>
  );
}
