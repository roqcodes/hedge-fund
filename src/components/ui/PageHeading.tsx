'use client';

import React from 'react';
import { pageHeader, pageSubtitle, pageTitle } from '@/lib/ui';
import ReadOnlyPill from '@/components/rbac/ReadOnlyPill';

type PageHeadingProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  as?: 'h1' | 'h2';
  className?: string;
  eyebrow?: React.ReactNode;
};

/** Standard page header with optional read-only pill inline on the title row. */
export default function PageHeading({
  title,
  subtitle,
  actions,
  as: Tag = 'h2',
  className,
  eyebrow,
}: PageHeadingProps) {
  return (
    <header className={`${pageHeader} ${className ?? ''}`}>
      <div className="min-w-0 flex-1">
        {eyebrow}
        <div className="flex items-center justify-between gap-3">
          <Tag className={pageTitle}>{title}</Tag>
          <ReadOnlyPill />
        </div>
        {subtitle != null && (
          typeof subtitle === 'string'
            ? <p className={pageSubtitle}>{subtitle}</p>
            : subtitle
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-col gap-2 self-start sm:flex-row sm:items-center sm:self-auto">
          {actions}
        </div>
      )}
    </header>
  );
}
