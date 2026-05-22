'use client';
import React from 'react';
import { pageHeader, pageSubtitle, pageTitle } from '@/lib/ui';

export default function SettingsPage() {
  return (
    <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
      <div className={pageHeader}>
        <div>
          <h2 className={pageTitle}>Settings</h2>
          <p className={pageSubtitle}>Platform configuration, user preferences, and system administration</p>
        </div>
      </div>

      <div className="flex min-h-[min(50vh,420px)] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-gradient-to-b from-slate-50/80 to-white px-4 py-12 text-center shadow-surface-xs sm:min-h-[min(60vh,520px)] sm:rounded-3xl sm:px-6 sm:py-16">
        <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl shadow-surface ring-1 ring-slate-200/80 sm:mb-6 sm:size-20 sm:rounded-3xl sm:text-4xl">
          ⚙️
        </div>
        <span className="mb-3 inline-flex rounded-full border border-amber-200/80 bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-800 sm:text-[11px] sm:tracking-[0.16em]">
          Coming soon
        </span>
        <h3 className="max-w-md text-lg font-bold text-slate-900 sm:text-xl md:text-2xl">
          Settings module is on the way
        </h3>
        <p className="mt-3 max-w-lg px-1 text-sm font-medium leading-relaxed text-slate-500">
          This module will provide user management, role configuration, notification preferences,
          audit log settings, and API key management for third-party integrations.
        </p>
        <ul className="mt-6 grid w-full max-w-md gap-2 text-left text-sm font-medium text-slate-600 sm:mt-8">
          {[
            'User & role management',
            'Notification preferences',
            'API key management',
            'Audit log configuration',
          ].map(item => (
            <li
              key={item}
              className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-white px-3.5 py-3 shadow-surface-xs sm:px-4"
            >
              <span
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-400"
                aria-hidden
              >
                ○
              </span>
              <span className="min-w-0 flex-1 leading-snug">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
