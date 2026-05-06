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
      className={`group flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-surface transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] [transform:translateZ(0)] motion-safe:animate-fade-in-up motion-safe:hover:-translate-y-1 motion-safe:hover:border-slate-200/90 motion-safe:hover:shadow-surface-hover motion-safe:active:translate-y-0 ${className}`}
    >
      {(title || extra) && (
        <div className="flex flex-col gap-1 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
          <div className="min-w-0">
            {title &&
              (typeof title === 'string' ? (
                <h3 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">{title}</h3>
              ) : (
                title
              ))}
            {subtitle && <p className="mt-1 text-sm font-medium text-slate-500">{subtitle}</p>}
          </div>
          {extra && <div className="flex shrink-0 flex-wrap items-center gap-2">{extra}</div>}
        </div>
      )}
      <div className={`min-h-0 flex-1 ${noPadding ? '' : 'px-5 py-5 sm:px-6 sm:py-6'}`}>{children}</div>
    </div>
  );
}
