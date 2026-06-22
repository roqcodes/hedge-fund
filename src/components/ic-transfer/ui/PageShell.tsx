'use client';

import React from 'react';

type Props = {
  children: React.ReactNode;
  className?: string;
};

export default function PageShell({ children, className = '' }: Props) {
  return (
    <div className={`animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both] ${className}`}>
      {children}
    </div>
  );
}
