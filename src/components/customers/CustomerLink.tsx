'use client';

import Link from 'next/link';

interface CustomerLinkProps {
  slug: string;
  customerId?: string | null;
  customerName?: string | null;
  className?: string;
}

export default function CustomerLink({ slug, customerId, customerName, className = '' }: CustomerLinkProps) {
  const label = customerName?.trim() || '—';
  if (!customerId) {
    return <span className={className}>{label}</span>;
  }
  return (
    <Link
      href={`/${slug}/customers/${customerId}`}
      className={`font-bold text-slate-900 transition-colors hover:text-accent hover:underline ${className}`}
      onClick={e => e.stopPropagation()}
    >
      {label}
    </Link>
  );
}
