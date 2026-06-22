'use client';

import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { pageSubtitle, pageTitle } from '@/lib/ui';

export default function SuperadminPhysicalHubPage() {
  const { branches } = useApp();
  const router = useRouter();

  return (
    <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
      <div className="mb-5 border-b border-slate-200/80 pb-5">
        <h2 className={pageTitle}>Physical</h2>
        <p className={pageSubtitle}>Select a branch to manage tax invoices and physical trade</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {branches.map(b => (
          <button
            key={b.id}
            type="button"
            onClick={() => router.push(`/${b.slug}/physical`)}
            className="rounded-2xl border border-slate-100 bg-white px-5 py-4 text-left shadow-sm transition-all hover:border-accent/30 hover:shadow-md"
          >
            <div className="text-sm font-bold text-slate-900">{b.name}</div>
            <div className="mt-1 text-xs text-slate-500">{b.location}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
