'use client';

import React from 'react';
import { pageSubtitle, pageTitle } from '@/lib/ui';

type Props = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
};

export default function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h2 className={pageTitle}>{title}</h2>
        {subtitle && <p className={pageSubtitle}>{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">{actions}</div>}
    </div>
  );
}
