'use client';

import React from 'react';
import { icSectionCardClass } from './tableStyles';

type Props = {
  children: React.ReactNode;
  className?: string;
};

export default function SectionCard({ children, className = '' }: Props) {
  return <div className={`${icSectionCardClass} ${className}`}>{children}</div>;
}
