'use client';

import React from 'react';
import { useWriteAccess } from '@/context/RbacWriteContext';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** When true, still respects read-only RBAC but keeps enabled styling for layout tests — prefer leaving false. */
};

export default function RbacWriteButton({
  disabled,
  title,
  className = '',
  onClick,
  children,
  ...rest
}: Props) {
  const { canWrite, writeBlockedReason, buttonProps } = useWriteAccess();
  const rbac = buttonProps({ disabled, title });
  const blocked = !canWrite;

  return (
    <button
      type="button"
      {...rest}
      {...rbac}
      onClick={blocked ? undefined : onClick}
      className={`${className}${blocked ? ' cursor-not-allowed opacity-50' : ''}`}
      title={blocked ? writeBlockedReason : title}
    >
      {children}
    </button>
  );
}
