'use client';

import React from 'react';

export default function PhysicalDetailField({
  label,
  value,
  className = '',
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <div className="text-sm font-semibold text-slate-800">{value}</div>
    </div>
  );
}
