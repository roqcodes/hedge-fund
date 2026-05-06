'use client';
import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { DateRange } from '@/types';

const dateOptions: { value: DateRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function Topbar() {
  const { dateRange, setDateRange, notifications, toggleSidebar, logout } = useApp();
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;


  return (
    <header className="sticky top-0 z-50 flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-2.5 shadow-surface-xs backdrop-blur-xl sm:min-h-[3.5rem] sm:gap-4 sm:px-5 md:px-6 lg:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
        <button
          type="button"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-surface-xs transition-[transform,colors,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:-translate-y-px motion-safe:hover:border-slate-300 motion-safe:hover:bg-slate-50 motion-safe:hover:text-accent motion-safe:hover:shadow-surface motion-safe:active:translate-y-0 motion-safe:active:scale-[0.97] motion-safe:active:duration-150 lg:hidden"
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        </button>
        <div className="hidden min-w-0 flex-1 items-center gap-3 rounded-full border border-slate-200/90 bg-slate-50/90 px-4 py-2.5 text-sm shadow-surface-xs transition-[border-color,background-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:border-slate-300 motion-safe:hover:bg-white motion-safe:hover:shadow-surface focus-within:border-accent/40 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(209,20,57,0.06),0_8px_24px_-8px_rgba(15,23,42,0.08)] md:flex md:max-w-lg lg:max-w-xl">
          <svg className="size-4 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="search"
            placeholder="Search branches, transactions..."
            id="global-search"
            className="min-w-0 flex-1 border-0 bg-transparent text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3 md:gap-4">

        <div className="flex max-w-[100vw-10rem] gap-0.5 overflow-x-auto rounded-full border border-slate-200/90 bg-slate-50 p-1 shadow-surface-xs [-ms-overflow-style:none] [scrollbar-width:none] sm:max-w-none [&::-webkit-scrollbar]:hidden">
          {dateOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              id={`date-${opt.value}`}
              onClick={() => setDateRange(opt.value)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-[transform,colors,box-shadow,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-4 sm:text-[11px] ${
                dateRange === opt.value
                  ? 'bg-white text-accent shadow-surface ring-1 ring-slate-200/80'
                  : 'text-slate-500 motion-safe:hover:bg-white/80 motion-safe:hover:text-slate-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <button
            type="button"
            className="relative flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-surface-xs transition-[transform,colors,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:-translate-y-px motion-safe:hover:border-slate-300 motion-safe:hover:bg-slate-50 motion-safe:hover:text-accent motion-safe:hover:shadow-surface motion-safe:active:translate-y-0 motion-safe:active:scale-[0.97] motion-safe:active:duration-150"
            onClick={() => setNotifOpen(!notifOpen)}
            id="notifications-btn"
            aria-label="Notifications"
            aria-expanded={notifOpen}
          >
            <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full border-2 border-white bg-accent text-[9px] font-extrabold text-white shadow-surface-xs">
                {unreadCount}
              </span>
            )}
          </button>
          <div
            className={`absolute -right-12 top-[calc(100%+12px)] z-[300] w-[calc(100vw-32px)] origin-top-right rounded-2xl border border-slate-200/90 bg-white text-sm shadow-dropdown transition-[opacity,transform,visibility] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:right-0 sm:w-[380px] ${
              notifOpen
                ? 'visible scale-100 opacity-100'
                : 'invisible scale-95 opacity-0 pointer-events-none'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 text-sm font-bold text-slate-900">
              Notifications
            </div>
            <ul className="max-h-[min(80dvh,400px)] overflow-y-auto overscroll-contain text-xs sm:text-sm">
              {notifications.map(n => (
                <li
                  key={n.id}
                  className={`flex gap-2 border-b border-slate-100 px-4 py-3 transition-[background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:bg-slate-50 ${
                    !n.read ? 'bg-accent/[0.06]' : ''
                  }`}
                >
                  {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" aria-hidden />}
                  <div className={!n.read ? '' : 'pl-5'}>
                    <div className="mb-1 font-semibold text-slate-900">{n.message}</div>
                    <div className="text-xs font-medium text-slate-500">{n.time}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-surface-xs transition-[transform,colors,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:-translate-y-px motion-safe:hover:border-slate-300 motion-safe:hover:bg-slate-50 motion-safe:hover:text-accent motion-safe:hover:shadow-surface motion-safe:active:translate-y-0 motion-safe:active:scale-[0.97] motion-safe:active:duration-150"
          onClick={logout}
          title="Logout"
          id="logout-btn"
          aria-label="Logout"
        >
          <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </button>
      </div>
    </header>
  );
}
