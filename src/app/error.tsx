'use client';

import React from 'react';
import { btnPrimary, btnSecondary } from '@/lib/ui';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-6 flex size-20 items-center justify-center rounded-3xl bg-red-50 text-4xl shadow-surface ring-1 ring-red-100">
        ⚠️
      </div>
      <h2 className="mb-3 text-2xl font-bold tracking-tight text-slate-900">
        Something went wrong
      </h2>
      <p className="mb-8 max-w-md text-sm font-medium leading-relaxed text-slate-500">
        An unexpected error occurred. This has been logged for investigation.
        You can try again or return to the dashboard.
      </p>
      {error.digest && (
        <p className="mb-6 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 font-mono text-xs text-slate-400">
          Error ID: {error.digest}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={reset} className={btnPrimary}>
          Try Again
        </button>
        <a href="/" className={btnSecondary}>
          Back to Dashboard
        </a>
      </div>
    </div>
  );
}
