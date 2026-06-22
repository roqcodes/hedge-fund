'use client';

import React from 'react';

type Props = {
  matrix: React.ReactNode;
  sidebar: React.ReactNode;
  className?: string;
};

/** @deprecated Use SummaryPanel instead */
export default function SummaryOverview({ matrix, sidebar, className = '' }: Props) {
  return (
    <div className={`mb-5 grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_12.5rem] ${className}`}>
      <div>{matrix}</div>
      <div>{sidebar}</div>
    </div>
  );
}
