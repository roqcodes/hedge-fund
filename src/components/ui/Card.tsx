'use client';
import React from 'react';

interface CardProps {
  title?: string | React.ReactNode;
  subtitle?: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export default function Card({
  title,
  subtitle,
  extra,
  children,
  className = '',
  noPadding = false,
}: CardProps) {
  return (
    <div
      className={`group flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-surface transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] [transform:translateZ(0)] motion-safe:animate-fade-in-up motion-safe:hover:-translate-y-px motion-safe:hover:border-black/10 motion-safe:hover:shadow-surface-hover motion-safe:active:translate-y-0 ${className}`}
    >
      {(title || extra) && (
        <div className="flex flex-col gap-2 border-b border-black/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3.5">
          <div className="min-w-0">
            {title &&
              (typeof title === 'string' ? (
                <h3 className="text-sm font-bold tracking-tight text-slate-900 sm:text-base">{title}</h3>
              ) : (
                title
              ))}
            {subtitle && <p className="mt-0.5 text-[11px] font-medium text-slate-400 sm:text-xs">{subtitle}</p>}
          </div>
          {extra && <div className="flex shrink-0 flex-wrap items-center gap-1.5">{extra}</div>}
        </div>
      )}
      <div className={`min-h-0 flex-1 ${noPadding ? '' : 'px-4 py-4 sm:px-4 sm:py-5'}`}>{children}</div>
    </div>
  );
}
