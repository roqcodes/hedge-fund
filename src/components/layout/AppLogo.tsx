'use client';

import React from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { isBranchPortalRole } from '@/lib/rbac';

type Props = {
  variant?: 'sidebar' | 'header';
  collapsed?: boolean;
  href?: string;
};

export default function AppLogo({ variant = 'sidebar', collapsed = false, href }: Props) {
  const { user, branches, currentSlug } = useApp();

  const isBranchUser = user ? isBranchPortalRole(user.role) : false;
  const branch = isBranchUser && user?.branchId
    ? branches.find(b => b.id === user.branchId)
    : currentSlug !== 'superadmin'
      ? branches.find(b => b.slug === currentSlug)
      : null;

  const logoSrc = isBranchUser && branch?.logo_url ? branch.logo_url : '/logo.png';
  const brandName = isBranchUser && branch ? branch.name : 'AIBAK';
  const tagline = isBranchUser
    ? user?.role === 'staff'
      ? 'Staff Portal'
      : 'Branch Portal'
    : 'Capital Management';

  const isHeader = variant === 'header';

  const content = (
    <>
      <div
        className={`flex shrink-0 items-center justify-center transition-transform duration-300 motion-safe:hover:scale-105 ${
          isHeader
            ? 'h-9 sm:h-10'
            : collapsed
              ? 'lg:h-8'
              : 'h-14 sm:h-16'
        }`}
      >
        <img
          src={logoSrc}
          alt={`${brandName} logo`}
          className={`h-full w-auto object-contain ${
            isHeader
              ? 'max-h-9 max-w-[120px] sm:max-h-10 sm:max-w-[140px]'
              : collapsed
                ? 'lg:max-h-8 lg:max-w-[28px]'
                : 'max-w-[160px]'
          }`}
        />
      </div>
      {!isHeader && (
        <div className={`min-w-0 text-center ${collapsed ? 'lg:hidden' : ''}`}>
          <h1 className="text-xl font-black uppercase tracking-[0.05em] text-slate-900 sm:text-2xl">
            {brandName}
          </h1>
          <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
            {tagline}
          </span>
        </div>
      )}
      {isHeader && (
        <span className="hidden min-w-0 truncate text-sm font-bold text-slate-900 sm:block lg:text-base">
          {brandName}
        </span>
      )}
    </>
  );

  const className = isHeader
    ? 'flex min-w-0 items-center gap-2.5 sm:gap-3'
    : `flex flex-col items-center gap-2.5 px-4 py-8 sm:px-5 ${collapsed ? 'lg:gap-1 lg:px-2 lg:py-4' : ''}`;

  if (href) {
    return (
      <Link href={href} className={`${className} no-underline`} aria-label={`${brandName} home`}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
