'use client';

import React from 'react';

export type WorkflowActionVariant = 'primary' | 'success' | 'danger' | 'secondary';

const VARIANT_STYLES: Record<WorkflowActionVariant, string> = {
  primary:
    'border-transparent bg-accent text-white shadow-primary hover:bg-[#b91232] hover:shadow-primary-hover',
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100',
  danger:
    'border-red-200 bg-red-50 text-red-600 hover:border-red-300 hover:bg-red-100',
  secondary:
    'border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-300 hover:bg-indigo-100',
};

type Props = {
  variant?: WorkflowActionVariant;
  children: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  form?: string;
  title?: string;
  fullWidth?: boolean;
  size?: 'sm' | 'md';
};

export function WorkflowActionButton({
  variant = 'primary',
  children,
  icon,
  onClick,
  disabled,
  type = 'button',
  form,
  title,
  fullWidth = true,
  size = 'sm',
}: Props) {
  return (
    <button
      type={type}
      form={form}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={[
        'inline-flex items-center justify-center gap-1.5 rounded-lg border font-bold leading-none shadow-sm transition-all duration-150 active:scale-[0.98]',
        size === 'md' ? 'min-h-[36px] px-3 py-2 text-xs' : 'min-h-[26px] px-2 py-1 text-[10px]',
        fullWidth ? 'w-full' : 'w-[7.5rem]',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANT_STYLES[variant],
      ].join(' ')}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
