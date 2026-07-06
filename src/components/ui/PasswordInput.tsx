'use client';

import React, { useState } from 'react';
import { formInput } from '@/lib/ui';

type PasswordInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  wrapperClassName?: string;
  inputClassName?: string;
};

function VisibilityIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
    );
  }

  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function PasswordInput({
  wrapperClassName,
  inputClassName,
  className,
  disabled,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const inputClasses = inputClassName ?? className ?? formInput;

  return (
    <div className={`relative ${wrapperClassName ?? ''}`}>
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        disabled={disabled}
        className={`${inputClasses} pr-11`}
      />
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={() => setVisible(prev => !prev)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        <VisibilityIcon visible={visible} />
      </button>
    </div>
  );
}
